const { ipcRenderer } = require('electron');

let selectedLocation = '';
const STORAGE_KEY = 'prayer_app_notes';

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Save to localStorage
function saveAll(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  ipcRenderer.send('sync-notes', notes);
}

// READ: Load and display saved records from localStorage
function loadNotes() {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = '';

  let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  if (notes.length === 0) {
    notesList.innerHTML = '<li class="empty">No saved records yet. Add your first note.</li>';
    return;
  }

  notes.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'record';
    li.innerHTML = `
      <div class="record-head">
        <span>${escapeHTML(item.date)}</span>
        <span class="record-loc">${escapeHTML(item.location || '')}</span>
      </div>
      <p class="record-text">${escapeHTML(item.note)}</p>
      <div class="record-actions">
        <button class="btn-small btn-edit" onclick="editNote(${index})">Edit</button>
        <button class="btn-small btn-delete" onclick="deleteNote(${index})">Delete</button>
      </div>
    `;
    notesList.appendChild(li);
  });
}

// CREATE & UPDATE
document.getElementById('saveBtn').addEventListener('click', () => {
  const date = document.getElementById('dateInput').value;
  const note = document.getElementById('noteInput').value.trim();
  const editIndex = document.getElementById('editIndex').value;

  // Input Validation
  if (!date || !note) {
    alert('Please fill out both the date and reflection text fields.');
    return;
  }

  let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  if (editIndex === '-1') {
    // CREATE operation
    notes.push({ location: selectedLocation, date, note });
    alert('Record created and saved successfully!');
  } else {
    // UPDATE operation
    const oldLocation = (notes[editIndex] && notes[editIndex].location) || selectedLocation;
    notes[editIndex] = { location: oldLocation, date, note };
    document.getElementById('editIndex').value = '-1';
    document.getElementById('saveBtn').textContent = 'Save record';
    alert('Record updated successfully!');
  }

  saveAll(notes);

  document.getElementById('dateInput').value = '';
  document.getElementById('noteInput').value = '';
  loadNotes();
});

// Helper function for UPDATE selection exposed globally
window.editNote = function(index) {
  let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const item = notes[index];

  document.getElementById('dateInput').value = item.date;
  document.getElementById('noteInput').value = item.note;
  document.getElementById('editIndex').value = index;
  document.getElementById('saveBtn').textContent = 'Update record';
};

// DELETE operation
window.deleteNote = function(index) {
  if (confirm('Are you sure you want to delete this record?')) {
    let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    notes.splice(index, 1);
    saveAll(notes);
    loadNotes();
    alert('Record deleted successfully!');
  }
};

loadNotes();