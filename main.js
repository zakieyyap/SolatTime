const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let notesWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile('renderer/index.html');
}

function createNotesWindow(locationData) {
  notesWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  notesWindow.loadFile('renderer/notes.html');
  notesWindow.webContents.on('did-finish-load', () => {
    notesWindow.webContents.send('location-selected', locationData);
  });
}

ipcMain.on('open-notes-window', (event, locationData) => {
  createNotesWindow(locationData);
});

ipcMain.on('save-note', (event, data) => {
  const filePath = path.join(__dirname, 'data', 'notes.json');
  let notes = [];
  if (fs.existsSync(filePath)) {
    notes = JSON.parse(fs.readFileSync(filePath));
  }
  notes.push(data);
  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
});

app.whenReady().then(createMainWindow);