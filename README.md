# SolatTime

A desktop application built with Electron that shows daily prayer (solat) times for a chosen city and country, plus a separate window for reflections and notes.

## Features

- Look up prayer times by city and country
- Displays today's date and sun info alongside the prayer schedule
- Separate notes window for saving reflections tied to a location and date
- Notes are stored locally in `data/notes.json`

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

## Project Structure

```
prayer-time-app/
├── main.js            # Electron main process (windows + IPC + note storage)
├── package.json
├── data/
│   └── notes.json     # Locally saved notes (ignored by git)
└── renderer/
    ├── index.html     # Prayer times page
    ├── index.js
    ├── notes.html     # Reflections & notes page
    ├── notes.js
    ├── style.css
    └── logo.svg
```

## Notes

`data/notes.json` is excluded from version control because it contains personal notes. The app creates the file automatically the first time you save a note.
