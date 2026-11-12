# UberNotes
UberNotes is a note taking webapp, designed for ease of use.

## What you can add
- **Notes** and **to-dos**
- **Quick Capture** with Ctrl/Cmd+Shift+Space; paste text on the canvas to create notes, or paste a URL to create a link
- **To-do due dates** with cross-board Today and Overdue views
- **Recurring to-dos** — daily, weekly, or monthly; completing one creates its next occurrence
- **Trash** to restore deleted to-do items, cards, and boards, or remove them permanently
- **Move or copy cards** between boards from a card's options menu
- **Images** and **links**
- **Boards** that nest other boards
- **Tables** with editable rows and columns; numeric columns show a live sum and average
- **Files** — PDF and MP4, with an inline preview

Images, PDFs, and MP4s copied to the clipboard can also be pasted onto the canvas.

Everything is saved in your browser with `localStorage`. Because of that, PDF and MP4 files are capped at 2.5 MB each. Use **Export** to keep a JSON backup.

## Touch screens
Drag with one finger to pan, pinch with two fingers to zoom, and double-tap the canvas to jump between 100% and 200%. The zoom buttons grow larger on touch devices so they are easier to tap.

## Run on Windows
Double-click `UberNotes.bat` to open UberNotes in your default web browser. It runs `OpenUberNotes.ps1`, which serves this folder at `http://localhost:8765/` and opens that address. Closing the console window stops the server. If the server can't start, it opens `index.html` directly instead.

Keep `UberNotes.bat`, `OpenUberNotes.ps1`, and the app files together in the same folder. No installation is required.
