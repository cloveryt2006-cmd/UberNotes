'use strict';

/* ============================================================
   UberNotes
   A local, note-taking webapp!
   ============================================================ */

const STORAGE_KEY = 'ubernotes.v1';
const SIDEBAR_KEY = 'ubernotes.sidebar';
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const COLORS = ['white', 'yellow', 'peach', 'mint', 'sky', 'lilac', 'pink'];
const DEFAULT_EMOJI = '🗒️';
const SIZES = {
  note: { w: 270, h: 190 },
  todo: { w: 280, h: 240 },
  image: { w: 310, h: 260 },
  link: { w: 300, h: 160 },
  board: { w: 240, h: 170 }
};

/**
 * Shorthand for document.querySelector, with an optional root element.
 */
const $ = (sel, root = document) => root.querySelector(sel);
/**
 * Shorthand for querySelectorAll, returned as a real array.
 */
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
/**
 * Clamps a number between a minimum and maximum.
 */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
/**
 * Generates a short, collision-resistant ID with an optional prefix.
 */
const uid = (prefix = 'id') => prefix + '_' + Math.random().toString(36).slice(2, 10);

const ICONS = {
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8l6-6V5a2 2 0 0 0-2-2Z"/><path d="M14 21v-6h6"/>',
  todo: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7.5 11.5 2.2 2.2 4.3-4.4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.8" cy="9.6" r="1.6"/><path d="m21 15.5-4.6-4.6L7 20.4"/>',
  link: '<path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.2-2.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6"/><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.2 2.2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/>',
  board: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  connect: '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M8.2 6H13a4 4 0 0 1 4 4v5.8"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V6a2 2 0 0 1 2-2h3"/><path d="M15 4h3a2 2 0 0 1 2 2v3"/><path d="M20 15v3a2 2 0 0 1-2 2h-3"/><path d="M9 20H6a2 2 0 0 1-2-2v-3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2a3 3 0 0 1 5.8 1c0 2-2.8 2.2-2.8 4"/><path d="M12 17.5h.01"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>',
  front: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.5-3.5 3.5H16a2 2 0 0 0-1.4 3.4c.4.5.2 1.6-.8 1.9-.6.2-1.2.2-1.8.2Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>'
};

/**
 * Builds an inline SVG icon string from the ICONS map.
 */
function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- state ---------------- */

let state;
let ui = {
  selected: new Set(),
  selectedConnection: null,
  connectFrom: null,
  boardFilter: '',
  spaceDown: false,
  drag: null,
  resize: null,
  pan: null,
  marquee: null,
  storageWarned: false
};
let navStack = [];
let history = { stack: [], index: -1 };
let saveTimer = null;

/**
 * Repairs saved or imported data so every board and card has the fields the app expects.
 */
function normalizeState(data) {
  if (!data || !Array.isArray(data.boards) || !data.boards.length) return null;
  data.views = data.views && typeof data.views === 'object' ? data.views : {};
  data.theme = data.theme === 'dark' ? 'dark' : 'light';
  data.boards.forEach(board => {
    board.items = Array.isArray(board.items) ? board.items.filter(item => item && typeof item === 'object') : [];
    board.connections = Array.isArray(board.connections)
      ? board.connections.filter(c => c && typeof c === 'object')
      : [];
    board.emoji = board.emoji || DEFAULT_EMOJI;
    board.name = board.name || 'Untitled board';
    board.items.forEach(item => {
      item.color = COLORS.includes(item.color) ? item.color : 'white';
      item.z = Number.isFinite(item.z) ? item.z : 1;
      item.w = Number.isFinite(item.w) ? item.w : (SIZES[item.type] || SIZES.note).w;
      item.h = Number.isFinite(item.h) ? item.h : (SIZES[item.type] || SIZES.note).h;
      if (item.type === 'todo' && !Array.isArray(item.todos)) item.todos = [];
    });
    board.connections = board.connections.filter(c =>
      typeof c.from === 'string' && typeof c.to === 'string' &&
      board.items.some(i => i.id === c.from) && board.items.some(i => i.id === c.to)
    );
  });
  if (!data.boards.some(b => b.id === data.activeBoardId)) data.activeBoardId = data.boards[0].id;
  return data;
}

/**
 * Reads and normalizes the saved workspace from localStorage.
 */
function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch (err) {
    console.warn('Could not read saved data', err);
    return null;
  }
}

/**
 * Returns an inline SVG data URL used as the welcome board's demo image.
 */
function demoArt() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="440" viewBox="0 0 620 440">
    <rect width="620" height="440" fill="#f3eee3"/>
    <circle cx="470" cy="110" r="150" fill="#6f67e8" opacity="0.92"/>
    <circle cx="150" cy="300" r="112" fill="#f6b756"/>
    <path d="M0 320 Q155 250 310 320 T620 320 V440 H0Z" fill="#2f9e8f" opacity="0.9"/>
    <circle cx="500" cy="330" r="34" fill="#f3eee3" opacity="0.85"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Builds the first run Welcome and Ideas boards with demo content.
 */
function seedState() {
  const now = Date.now();
  const welcomeId = uid('b');
  const ideasId = uid('b');

  const intro = {
    id: uid('i'), type: 'note', x: 80, y: 110, w: 350, h: 240, color: 'white', z: 1,
    text: 'Welcome to UberNotes 👋\n\nA calm, local space for your thoughts, plans and inspiration. Everything you make stays in your browser — no account needed.'
  };
  const tips = {
    id: uid('i'), type: 'note', x: 470, y: 80, w: 320, h: 255, color: 'yellow', z: 2,
    text: 'Keyboard shortcuts\n\nClick any card to edit it.\nDrag the canvas to move around.\nCtrl/⌘ + scroll to zoom.\nHover a card and use the link icon to connect ideas.\n\nPress ? for all shortcuts.'
  };
  const todo = {
    id: uid('i'), type: 'todo', x: 80, y: 390, w: 310, h: 250, color: 'mint', z: 3,
    title: 'Try the basics',
    todos: [
      { id: uid('t'), text: 'Open UberNotes', done: true },
      { id: uid('t'), text: 'Write a note', done: false },
      { id: uid('t'), text: 'Connect two cards with a line', done: false },
      { id: uid('t'), text: 'Make a board of your own', done: false },
      { id: uid('t'), text: 'Press ? to see shortcuts', done: false }
    ]
  };
  const link = {
    id: uid('i'), type: 'link', x: 470, y: 370, w: 320, h: 160, color: 'white', z: 4,
    url: 'https://github.com/',
    title: 'GitHub',
    description: 'A place to share your projects!'
  };
  const boardCard = {
    id: uid('i'), type: 'board', x: 850, y: 110, w: 250, h: 170, color: 'lilac', z: 5,
    boardId: ideasId
  };
  const image = {
    id: uid('i'), type: 'image', x: 850, y: 320, w: 310, h: 250, color: 'white', z: 6,
    src: demoArt(), caption: 'A little visual inspiration'
  };

  const idea1 = {
    id: uid('i'), type: 'note', x: 90, y: 100, w: 300, h: 190, color: 'yellow', z: 1,
    text: 'What if…\n\n• You could share notes\n• Or organize ideas\n\n'
  };
  const idea2 = {
    id: uid('i'), type: 'note', x: 440, y: 130, w: 290, h: 190, color: 'sky', z: 2,
    text: 'What if…\n\n• You could add images\n• Or link to websites\n\n'
  };
  const idea3 = {
    id: uid('i'), type: 'note', x: 260, y: 360, w: 320, h: 180, color: 'mint', z: 3,
    text: 'Next steps!\n\n1. Make this space yours\n2. Add a board\n3. Share the idea'
  };

  return {
    version: 1,
    theme: 'light',
    activeBoardId: welcomeId,
    views: {},
    boards: [
      {
        id: welcomeId, name: 'Welcome', emoji: '👋', createdAt: now, updatedAt: now,
        items: [intro, tips, todo, link, boardCard, image],
        connections: [
          { id: uid('c'), from: intro.id, to: tips.id },
          { id: uid('c'), from: intro.id, to: todo.id },
          { id: uid('c'), from: tips.id, to: boardCard.id }
        ]
      },
      {
        id: ideasId, name: 'Ideas', emoji: '💡', createdAt: now, updatedAt: now,
        items: [idea1, idea2, idea3],
        connections: [
          { id: uid('c'), from: idea1.id, to: idea2.id },
          { id: uid('c'), from: idea2.id, to: idea3.id }
        ]
      }
    ]
  };
}

state = loadState() || seedState();

/* ---------------- helpers ---------------- */

/**
 * Returns the board currently open in the canvas.
 */
function currentBoard() {
  return state.boards.find(b => b.id === state.activeBoardId) || state.boards[0];
}
/**
 * Finds a board by ID.
 */
function boardById(id) {
  return state.boards.find(b => b.id === id);
}
/**
 * Finds a card on the active board by ID.
 */
function itemById(id) {
  return currentBoard().items.find(i => i.id === id);
}
/**
 * Returns, and lazily creates, the pan/zoom view for the active board.
 */
function getView() {
  if (!state.views[state.activeBoardId]) {
    state.views[state.activeBoardId] = { x: 0, y: 0, z: 1 };
  }
  return state.views[state.activeBoardId];
}
/**
 * Returns the highest z-index currently used on the active board.
 */
function maxZ() {
  return currentBoard().items.reduce((m, i) => Math.max(m, i.z || 0), 0);
}
/**
 * Returns the next z-index for bringing a card to the front.
 */
function nextZ() {
  return maxZ() + 1;
}
/**
 * True when the event target is an input, textarea, select, or contenteditable element.
 */
function isTypingTarget(el) {
  return !!el && (el.isContentEditable || el.matches('input, textarea, select'));
}
/**
 * Validates and normalizes an http(s) URL, returning null for anything else.
 */
function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch (err) {
    return null;
  }
}
/**
 * Extracts a clean hostname from a URL for display.
 */
function hostOf(url) {
  const safe = safeUrl(url);
  if (!safe) return '';
  try {
    return new URL(safe).hostname.replace(/^www\./, '');
  } catch (err) {
    return '';
  }
}
/**
 * Deep-clones plain data through JSON.
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
/**
 * Keeps the first grapheme of an emoji input, with a fallback.
 */
function normalizeEmoji(value, fallback = DEFAULT_EMOJI) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
      const first = segments[Symbol.iterator]().next().value;
      if (first && first.segment) return first.segment;
    }
  } catch (err) {}
  return Array.from(text)[0] || fallback;
}
/**
 * Returns the DOM element for a card ID.
 */
function cardEl(id) {
  return $(`.card[data-id="${id}"]`);
}

/* ---------------- saving & history ---------------- */

/**
 * Updates the sidebar save-status text and color.
 */
function setSaved(text, kind) {
  const el = $('#savedStatus');
  const label = $('#savedText');
  if (!el || !label) return;
  label.textContent = text;
  el.classList.remove('saving', 'error');
  if (kind) el.classList.add(kind);
}

/**
 * Debounces writes to localStorage and shows a saving state.
 */
function saveSoon() {
  setSaved('Saving…', 'saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 220);
}

/**
 * Writes the workspace to localStorage and reports storage failures.
 */
function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved('Saved locally', '');
    ui.storageWarned = false;
  } catch (err) {
    console.error('Save failed', err);
    setSaved('Storage full', 'error');
    if (!ui.storageWarned) {
      ui.storageWarned = true;
      toast('Local storage is full. Export a backup and remove a large image or two.', 'error');
    }
  }
}

/**
 * Serializes the undoable parts of the workspace.
 */
function snapshot() {
  return JSON.stringify({ boards: state.boards, activeBoardId: state.activeBoardId });
}

/**
 * Records a new undo snapshot and trims old history.
 */
function pushHistory() {
  const snap = snapshot();
  if (history.stack[history.index] === snap) return;
  history.stack = history.stack.slice(0, history.index + 1);
  history.stack.push(snap);
  if (history.stack.length > 40) history.stack.shift();
  history.index = history.stack.length - 1;
  updateHistoryButtons();
}

/**
 * Restores the workspace from the current history entry.
 */
function restoreHistory() {
  const snap = JSON.parse(history.stack[history.index]);
  state.boards = snap.boards;
  state.activeBoardId = snap.activeBoardId;
  if (!boardById(state.activeBoardId)) state.activeBoardId = state.boards[0].id;
  ui.selected.clear();
  ui.selectedConnection = null;
  cancelConnect(true);
  closeMenu();
  saveSoon();
  renderAll();
}

/**
 * Moves one step back in history.
 */
function undo() {
  if (history.index <= 0) return;
  history.index--;
  restoreHistory();
}
/**
 * Moves one step forward in history.
 */
function redo() {
  if (history.index >= history.stack.length - 1) return;
  history.index++;
  restoreHistory();
}
/**
 * Enables or disables the undo and redo buttons.
 */
function updateHistoryButtons() {
  const undoBtn = $('#undoBtn');
  const redoBtn = $('#redoBtn');
  if (undoBtn) undoBtn.disabled = history.index <= 0;
  if (redoBtn) redoBtn.disabled = history.index >= history.stack.length - 1;
}

/**
 * Enables or disables the back button based on the navigation stack.
 */
function updateBack() {
  const btn = $('#backBtn');
  if (btn) btn.disabled = navStack.length === 0;
}

/* ---------------- theme & sidebar shell ---------------- */

/**
 * Applies the light or dark theme and updates the theme button icon.
 */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const btn = $('#themeBtn');
  if (btn) {
    const ic = btn.querySelector('[data-icon]') || btn.querySelector('.ic');
    if (ic) ic.innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon');
    btn.title = state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }
}

/**
 * Switches between light and dark themes and saves the choice.
 */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveSoon();
}

/**
 * True when the viewport is inside the mobile sidebar breakpoint.
 */
function isMobile() {
  return window.matchMedia('(max-width: 860px)').matches;
}
/**
 * Closes the off-canvas sidebar on small screens.
 */
function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
}
/**
 * Toggles the mobile drawer or the desktop collapsed sidebar.
 */
function toggleSidebar() {
  if (isMobile()) {
    document.body.classList.toggle('sidebar-open');
  } else {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0'); } catch (err) {}
  }
}

/* ---------------- views ---------------- */

/**
 * Keeps at least a quarter of the board's area inside the viewport by
 * requiring half of its width and height to stay on screen. When the board
 * is larger than the viewport, the viewport is kept inside it.
 */
function clampView() {
  const wrap = $('#canvasWrap');
  if (!wrap) return;
  const board = currentBoard();
  if (!board || !board.items.length) return;
  const rect = wrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const v = getView();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  board.items.forEach(i => {
    minX = Math.min(minX, i.x);
    minY = Math.min(minY, i.y);
    maxX = Math.max(maxX, i.x + i.w);
    maxY = Math.max(maxY, i.y + i.h);
  });
  const boardW = (maxX - minX) * v.z;
  const boardH = (maxY - minY) * v.z;
  const needX = Math.min(boardW * 0.5, rect.width);
  const needY = Math.min(boardH * 0.5, rect.height);
  const loX = needX - maxX * v.z;
  const hiX = rect.width - needX - minX * v.z;
  const loY = needY - maxY * v.z;
  const hiY = rect.height - needY - minY * v.z;
  v.x = loX <= hiX ? clamp(v.x, loX, hiX) : (loX + hiX) / 2;
  v.y = loY <= hiY ? clamp(v.y, loY, hiY) : (loY + hiY) / 2;
}

/**
 * Applies the current pan/zoom transform and dot-grid offset.
 */
function applyView() {
  const v = getView();
  const canvas = $('#canvas');
  const wrap = $('#canvasWrap');
  if (!canvas || !wrap) return;
  clampView();
  canvas.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
  wrap.style.setProperty('--grid', (24 * v.z) + 'px');
  wrap.style.setProperty('--gx', v.x + 'px');
  wrap.style.setProperty('--gy', v.y + 'px');
  const label = $('#zoomLabel');
  if (label) label.textContent = Math.round(v.z * 100) + '%';
}

/**
 * Converts screen coordinates to canvas world coordinates.
 */
function screenToWorld(clientX, clientY) {
  const rect = $('#canvasWrap').getBoundingClientRect();
  const v = getView();
  return {
    x: (clientX - rect.left - v.x) / v.z,
    y: (clientY - rect.top - v.y) / v.z
  };
}

/**
 * Zooms around a screen point while keeping that point fixed.
 */
function zoomAt(clientX, clientY, factor) {
  const wrap = $('#canvasWrap');
  const rect = wrap.getBoundingClientRect();
  const v = getView();
  const wx = (clientX - rect.left - v.x) / v.z;
  const wy = (clientY - rect.top - v.y) / v.z;
  const nz = clamp(v.z * factor, MIN_ZOOM, MAX_ZOOM);
  v.x = clientX - rect.left - wx * nz;
  v.y = clientY - rect.top - wy * nz;
  v.z = nz;
  applyView();
  saveSoon();
}

/**
 * Zooms around the center of the canvas viewport.
 */
function zoomCenter(factor) {
  const rect = $('#canvasWrap').getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
}

/**
 * Pans and zooms so all cards on the active board fit on screen.
 */
function fitView() {
  const wrap = $('#canvasWrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const v = getView();
  const items = currentBoard().items;
  if (!items.length) {
    v.x = rect.width / 2;
    v.y = rect.height / 2;
    v.z = 1;
    applyView();
    saveSoon();
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(i => {
    minX = Math.min(minX, i.x);
    minY = Math.min(minY, i.y);
    maxX = Math.max(maxX, i.x + i.w);
    maxY = Math.max(maxY, i.y + i.h);
  });
  const pad = 90;
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const z = clamp(Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh, 1.05), MIN_ZOOM, MAX_ZOOM);
  v.z = z;
  v.x = (rect.width - bw * z) / 2 - minX * z;
  v.y = (rect.height - bh * z) / 2 - minY * z;
  applyView();
  saveSoon();
}

/* ---------------- rendering: shell ---------------- */

/**
 * Rebuilds the board list, including search filtering and the active state.
 */
function renderSidebar() {
  const list = $('#boardList');
  if (!list) return;
  const q = ui.boardFilter.trim().toLowerCase();
  const boards = state.boards.filter(b => !q || b.name.toLowerCase().includes(q));
  list.innerHTML = '';
  if (!boards.length) {
    const empty = document.createElement('div');
    empty.className = 'palette-empty';
    empty.textContent = 'No boards found';
    list.append(empty);
    return;
  }
  boards.forEach(board => {
    const row = document.createElement('div');
    row.className = 'board-row' + (board.id === state.activeBoardId ? ' active' : '');

    const link = document.createElement('button');
    link.className = 'board-link';
    link.type = 'button';
    const emoji = document.createElement('span');
    emoji.className = 'board-emoji';
    emoji.textContent = board.emoji;
    const name = document.createElement('span');
    name.className = 'board-name';
    name.textContent = board.name;
    const count = document.createElement('span');
    count.className = 'board-count';
    count.textContent = String(board.items.length);
    link.append(emoji, name, count);
    link.addEventListener('click', () => openBoard(board.id));

    const more = document.createElement('button');
    more.className = 'board-more';
    more.type = 'button';
    more.title = 'Board options';
    more.setAttribute('aria-label', 'Board options');
    more.innerHTML = icon('more', 15);
    more.addEventListener('click', e => {
      e.stopPropagation();
      const r = more.getBoundingClientRect();
      openBoardRowMenu(board, r.right - 6, r.bottom + 4);
    });

    row.append(link, more);
    list.append(row);
  });
}

/**
 * Updates the board icon, title, card count, and history buttons.
 */
function renderTopbar() {
  const board = currentBoard();
  const emoji = $('#boardEmoji');
  const title = $('#boardTitle');
  const meta = $('#boardMeta');
  if (!board) return;
  if (emoji) emoji.textContent = board.emoji;
  if (title && document.activeElement !== title) title.value = board.name;
  if (meta) {
    const n = board.items.length;
    meta.textContent = n + (n === 1 ? ' card' : ' cards');
  }
  updateBack();
  updateHistoryButtons();
}

/**
 * Renders the sidebar, topbar, and canvas together.
 */
function renderAll() {
  renderSidebar();
  renderTopbar();
  renderBoard();
}

/**
 * Rebuilds all cards and connections for the active board.
 */
function renderBoard() {
  const board = currentBoard();
  if (!board) return;
  const items = $('#items');
  items.innerHTML = '';
  const sorted = [...board.items].sort((a, b) => (a.z || 0) - (b.z || 0));
  sorted.forEach(item => items.append(buildCard(item)));
  renderConnections();
  applyView();
  const empty = $('#emptyState');
  if (empty) empty.hidden = board.items.length > 0;
  updateSelectionUI();
  renderTopbar();
}

/* ---------------- navigation ---------------- */

/**
 * Navigates to a board, updating history, selection, and view.
 */
function openBoard(id, options = {}) {
  const target = boardById(id);
  if (!target) return;
  if (state.activeBoardId === id) {
    closeMobileSidebar();
    return;
  }
  const push = options.push !== false;
  const hadView = !!state.views[id];
  if (push) navStack.push(state.activeBoardId);
  state.activeBoardId = id;
  ui.selected.clear();
  ui.selectedConnection = null;
  cancelConnect(true);
  closeMenu();
  saveSoon();
  renderAll();
  if (!hadView) fitView();
  closeMobileSidebar();
  updateBack();
}

/**
 * Returns to the previous board in the navigation stack.
 */
function goBack() {
  while (navStack.length) {
    const prev = navStack.pop();
    if (prev !== state.activeBoardId && boardById(prev)) {
      openBoard(prev, { push: false });
      return;
    }
  }
  updateBack();
}

/* ---------------- card rendering ---------------- */

/**
 * Returns the shared drag handle and hover-tool markup for a card.
 */
function cardChrome() {
  return `
    <div class="card-handle" title="Drag card"></div>
    <div class="card-tools">
      <button class="card-tool" type="button" data-act="connect" title="Connect to another card" aria-label="Connect to another card">${icon('connect', 15)}</button>
      <button class="card-tool" type="button" data-act="more" title="More options" aria-label="More options">${icon('more', 15)}</button>
    </div>`;
}

/**
 * Creates the DOM element for one card and wires its interactions.
 */
function buildCard(item) {
  const el = document.createElement('div');
  el.className = 'card card-' + item.type;
  el.dataset.id = item.id;
  el.dataset.color = item.color || 'white';
  el.style.left = item.x + 'px';
  el.style.top = item.y + 'px';
  el.style.width = item.w + 'px';
  el.style.height = item.h + 'px';
  el.style.zIndex = String(item.z || 1);
  el.innerHTML = cardChrome() + '<div class="resize-handle" title="Resize"></div>';

  if (item.type === 'note') buildNote(el, item);
  else if (item.type === 'todo') buildTodo(el, item);
  else if (item.type === 'link') buildLink(el, item);
  else if (item.type === 'board') buildBoardCard(el, item);
  else if (item.type === 'image') buildImage(el, item);

  el.addEventListener('pointerdown', e => onCardPointerDown(e, item));
  el.addEventListener('click', e => onCardClick(e, item));
  el.addEventListener('contextmenu', e => {
    if (e.target.closest('[contenteditable]') || e.target.closest('input')) return;
    e.preventDefault();
    e.stopPropagation();
    openItemMenu(item, e.clientX, e.clientY);
  });
  el.addEventListener('dblclick', e => {
    if (item.type !== 'board') return;
    if (e.target.closest('button, a, [contenteditable]')) return;
    const target = boardById(item.boardId);
    if (target) openBoard(target.id);
  });

  $$('[data-act]', el).forEach(btn => {
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.act === 'connect') startConnect(item.id);
      if (btn.dataset.act === 'more') {
        const r = btn.getBoundingClientRect();
        openItemMenu(item, r.right - 4, r.bottom + 4);
      }
    });
  });

  const resize = $('.resize-handle', el);
  if (resize) {
    resize.addEventListener('pointerdown', e => {
      e.stopPropagation();
      e.preventDefault();
      startResize(e, item);
    });
  }

  return el;
}

/**
 * Builds the editable note body.
 */
function buildNote(el, item) {
  const body = document.createElement('div');
  body.className = 'note-body';
  body.contentEditable = 'true';
  body.spellcheck = true;
  body.dataset.placeholder = 'Write something…';
  body.textContent = item.text || '';
  body.addEventListener('focus', () => pushHistory());
  body.addEventListener('blur', () => pushHistory());
  body.addEventListener('input', () => {
    item.text = body.innerText;
    saveSoon();
  });
  el.append(body);
}

/**
 * Builds the to-do title, item list, and add button.
 */
function buildTodo(el, item) {
  const body = document.createElement('div');
  body.className = 'todo-body';

  const title = document.createElement('div');
  title.className = 'todo-title';
  title.contentEditable = 'true';
  title.dataset.placeholder = 'To-do';
  title.textContent = item.title || '';
  title.addEventListener('focus', () => pushHistory());
  title.addEventListener('blur', () => pushHistory());
  title.addEventListener('input', () => { item.title = title.innerText; saveSoon(); });

  const list = document.createElement('div');
  list.className = 'todo-list';

  const addBtn = document.createElement('button');
  addBtn.className = 'todo-add';
  addBtn.type = 'button';
  addBtn.textContent = '+ Add item';

  /**
   * Appends a new empty to-do item and re-renders the list.
   */
  const addTodo = (focusLast) => {
    pushHistory();
    item.todos.push({ id: uid('t'), text: '', done: false });
    renderTodoRows(list, item);
    saveSoon();
    pushHistory();
    if (focusLast) {
      const rows = $$('.todo-text', list);
      const last = rows[rows.length - 1];
      if (last) focusEditable(last);
    }
  };

  addBtn.addEventListener('click', e => {
    e.stopPropagation();
    addTodo(true);
  });

  renderTodoRows(list, item);
  body.append(title, list, addBtn);
  el.append(body);
}

/**
 * Rebuilds the to-do item rows and their check, edit, and remove handlers.
 */
function renderTodoRows(list, item) {
  list.innerHTML = '';
  item.todos.forEach((todo, index) => {
    const row = document.createElement('div');
    row.className = 'todo-row' + (todo.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'todo-check';
    check.type = 'button';
    check.title = todo.done ? 'Mark as not done' : 'Mark as done';
    check.innerHTML = icon('check', 12);
    check.addEventListener('pointerdown', e => e.stopPropagation());
    check.addEventListener('click', e => {
      e.stopPropagation();
      pushHistory();
      todo.done = !todo.done;
      row.classList.toggle('done', todo.done);
      check.title = todo.done ? 'Mark as not done' : 'Mark as done';
      saveSoon();
      pushHistory();
    });

    const text = document.createElement('div');
    text.className = 'todo-text';
    text.contentEditable = 'true';
    text.spellcheck = true;
    text.dataset.placeholder = 'New item';
    text.textContent = todo.text || '';
    text.addEventListener('focus', () => pushHistory());
    text.addEventListener('blur', () => pushHistory());
    text.addEventListener('input', () => { todo.text = text.innerText; saveSoon(); });
    text.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        pushHistory();
        item.todos.splice(index + 1, 0, { id: uid('t'), text: '', done: false });
        renderTodoRows(list, item);
        saveSoon();
        pushHistory();
        const rows = $$('.todo-text', list);
        if (rows[index + 1]) focusEditable(rows[index + 1]);
      }
    });

    const remove = document.createElement('button');
    remove.className = 'todo-remove';
    remove.type = 'button';
    remove.title = 'Remove item';
    remove.innerHTML = icon('x', 13);
    remove.addEventListener('pointerdown', e => e.stopPropagation());
    remove.addEventListener('click', e => {
      e.stopPropagation();
      pushHistory();
      item.todos.splice(index, 1);
      renderTodoRows(list, item);
      saveSoon();
      pushHistory();
    });

    row.append(check, text, remove);
    list.append(row);
  });
}

/**
 * Builds the link card, including favicon fallback and open action.
 */
function buildLink(el, item) {
  const safe = safeUrl(item.url);
  const host = hostOf(item.url);
  const body = document.createElement('div');
  body.className = 'link-body';

  const site = document.createElement('div');
  site.className = 'link-site';
  if (host) {
    const fav = document.createElement('img');
    fav.className = 'link-favicon';
    fav.alt = '';
    fav.referrerPolicy = 'no-referrer';
    fav.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host) + '&sz=64';
    fav.addEventListener('error', () => {
      const letter = document.createElement('span');
      letter.className = 'link-favicon-letter';
      letter.textContent = host.charAt(0).toUpperCase();
      fav.replaceWith(letter);
    });
    site.append(fav);
  }
  const domain = document.createElement('span');
  domain.className = 'link-domain';
  domain.textContent = host || 'link';
  site.append(domain);

  const title = document.createElement('div');
  title.className = 'link-title';
  title.contentEditable = 'true';
  title.dataset.placeholder = 'Untitled link';
  title.textContent = item.title || '';
  title.addEventListener('focus', () => pushHistory());
  title.addEventListener('blur', () => pushHistory());
  title.addEventListener('input', () => { item.title = title.innerText; saveSoon(); });

  const desc = document.createElement('div');
  desc.className = 'link-desc';
  desc.contentEditable = 'true';
  desc.dataset.placeholder = 'Add a note…';
  desc.textContent = item.description || '';
  desc.addEventListener('focus', () => pushHistory());
  desc.addEventListener('blur', () => pushHistory());
  desc.addEventListener('input', () => { item.description = desc.innerText; saveSoon(); });

  body.append(site, title, desc);
  if (safe) {
    const open = document.createElement('a');
    open.className = 'link-open';
    open.href = safe;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.innerHTML = 'Open link ' + icon('external', 11);
    open.addEventListener('pointerdown', e => e.stopPropagation());
    body.append(open);
  }
  el.append(body);
}

/**
 * Builds the nested board card and its open-board action.
 */
function buildBoardCard(el, item) {
  const target = boardById(item.boardId);
  const body = document.createElement('div');
  body.className = 'board-card-body';

  const emoji = document.createElement('div');
  emoji.className = 'board-card-emoji';
  emoji.textContent = target ? target.emoji : '❓';

  const name = document.createElement('div');
  name.className = 'board-card-name';
  name.textContent = target ? target.name : 'Missing board';

  const meta = document.createElement('div');
  meta.className = 'board-card-meta';
  meta.textContent = target ? target.items.length + (target.items.length === 1 ? ' card' : ' cards') : 'This board was deleted';

  body.append(emoji, name, meta);

  if (target) {
    const open = document.createElement('button');
    open.className = 'board-open';
    open.type = 'button';
    open.innerHTML = 'Open board ' + icon('arrowRight', 11);
    open.addEventListener('pointerdown', e => e.stopPropagation());
    open.addEventListener('click', e => {
      e.stopPropagation();
      openBoard(target.id);
    });
    body.append(open);
  }
  el.append(body);
}

/**
 * Builds the image card and editable caption.
 */
function buildImage(el, item) {
  const img = document.createElement('img');
  img.className = 'card-image-img';
  img.src = item.src || '';
  img.alt = item.caption || 'Image';
  img.draggable = false;
  el.append(img);

  const caption = document.createElement('div');
  caption.className = 'image-caption';
  caption.contentEditable = 'true';
  caption.dataset.placeholder = 'Add a caption…';
  caption.textContent = item.caption || '';
  caption.addEventListener('focus', () => pushHistory());
  caption.addEventListener('blur', () => pushHistory());
  caption.addEventListener('input', () => {
    item.caption = caption.innerText;
    img.alt = item.caption || 'Image';
    saveSoon();
  });
  el.append(caption);
}

/* ---------------- connections ---------------- */

const SVG_OFFSET = 50000;

/**
 * Redraws all connection curves and their click targets.
 */
function renderConnections() {
  const svg = $('#connections');
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const board = currentBoard();
  if (!board) return;
  board.connections.forEach(conn => {
    const from = board.items.find(i => i.id === conn.from);
    const to = board.items.find(i => i.id === conn.to);
    if (!from || !to) return;
    const geo = connectionGeometry(from, to);

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'conn');
    group.dataset.id = conn.id;

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('class', 'conn-hit');
    hit.setAttribute('d', geo.d);
    hit.addEventListener('pointerdown', e => {
      e.stopPropagation();
      selectConnection(conn.id);
    });
    hit.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      selectConnection(conn.id);
      openConnectionMenu(conn, e.clientX, e.clientY);
    });

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'conn-line');
    line.setAttribute('d', geo.d);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'conn-dot');
    dot.setAttribute('cx', geo.ex);
    dot.setAttribute('cy', geo.ey);
    dot.setAttribute('r', '3');

    group.append(hit, line, dot);
    svg.append(group);
  });
  updateSelectionUI();
}

/**
 * Calculates the bezier path and endpoint for two cards.
 */
function connectionGeometry(a, b) {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;
  let x1, y1, x2, y2, c1x, c1y, c2x, c2y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    x1 = dx >= 0 ? a.x + a.w : a.x;
    y1 = acy;
    x2 = dx >= 0 ? b.x : b.x + b.w;
    y2 = bcy;
    const c = Math.max(40, Math.abs(x2 - x1) * 0.45);
    c1x = x1 + (dx >= 0 ? c : -c);
    c1y = y1;
    c2x = x2 - (dx >= 0 ? c : -c);
    c2y = y2;
  } else {
    x1 = acx;
    y1 = dy >= 0 ? a.y + a.h : a.y;
    x2 = bcx;
    y2 = dy >= 0 ? b.y : b.y + b.h;
    const c = Math.max(40, Math.abs(y2 - y1) * 0.45);
    c1x = x1;
    c1y = y1 + (dy >= 0 ? c : -c);
    c2x = x2;
    c2y = y2 - (dy >= 0 ? c : -c);
  }

  return {
    d: `M${x1 + SVG_OFFSET},${y1 + SVG_OFFSET} C${c1x + SVG_OFFSET},${c1y + SVG_OFFSET} ${c2x + SVG_OFFSET},${c2y + SVG_OFFSET} ${x2 + SVG_OFFSET},${y2 + SVG_OFFSET}`,
    ex: x2 + SVG_OFFSET,
    ey: y2 + SVG_OFFSET
  };
}

/* ---------------- selection ---------------- */

/**
 * Syncs selected and highlight classes on cards and connections.
 */
function updateSelectionUI() {
  $$('.card').forEach(el => {
    el.classList.toggle('selected', ui.selected.has(el.dataset.id));
  });
  const board = currentBoard();
  $$('.conn').forEach(group => {
    const conn = board.connections.find(c => c.id === group.dataset.id);
    const selected = ui.selectedConnection === group.dataset.id;
    const highlighted = conn && (ui.selected.has(conn.from) || ui.selected.has(conn.to));
    group.classList.toggle('selected', selected);
    group.classList.toggle('highlight', !!highlighted && !selected);
  });
}

/**
 * Selects a single card and clears connection selection.
 */
function selectOnly(id) {
  ui.selected = new Set([id]);
  ui.selectedConnection = null;
  updateSelectionUI();
}

/**
 * Selects a connection and clears card selection.
 */
function selectConnection(id) {
  ui.selectedConnection = id;
  ui.selected.clear();
  updateSelectionUI();
}

/**
 * Clears all card and connection selection.
 */
function clearSelection() {
  ui.selected.clear();
  ui.selectedConnection = null;
  updateSelectionUI();
}

/* ---------------- pointer interactions ---------------- */

/**
 * Focuses an editable element and places the caret at the end.
 */
function focusEditable(el) {
  if (!el) return;
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Handles card selection and starts dragging.
 */
function onCardPointerDown(e, item) {
  if (ui.connectFrom) return;
  if (ui.spaceDown) return;
  if (e.button !== 0) return;
  if (e.target.closest('button, a, input, textarea, select, [contenteditable], .resize-handle')) return;
  e.preventDefault();

  if (!ui.selected.has(item.id)) {
    if (e.shiftKey) ui.selected.add(item.id);
    else ui.selected = new Set([item.id]);
  } else if (e.shiftKey) {
    ui.selected.delete(item.id);
    updateSelectionUI();
    return;
  }
  ui.selectedConnection = null;
  updateSelectionUI();
  startDrag(e);
}

/**
 * Starts a drag for all selected cards and records the starting state.
 */
function startDrag(e) {
  const entries = Array.from(ui.selected)
    .map(id => itemById(id))
    .filter(Boolean)
    .map(item => ({ item, el: cardEl(item.id), x: item.x, y: item.y, z: item.z }));
  if (!entries.length) return;
  pushHistory();
  ui.drag = {
    sx: e.clientX,
    sy: e.clientY,
    zoom: getView().z,
    entries,
    moved: false
  };
  entries.forEach(entry => {
    if (!entry.el) return;
    entry.el.classList.add('dragging');
    entry.el.style.zIndex = '99999';
  });
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragUp, { once: true });
}

/**
 * Moves dragged cards in world space and redraws connections.
 */
function onDragMove(e) {
  const d = ui.drag;
  if (!d) return;
  const dx = (e.clientX - d.sx) / d.zoom;
  const dy = (e.clientY - d.sy) / d.zoom;
  if (!d.moved && Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
  d.entries.forEach(entry => {
    entry.item.x = Math.round(entry.x + dx);
    entry.item.y = Math.round(entry.y + dy);
    if (entry.el) {
      entry.el.style.left = entry.item.x + 'px';
      entry.el.style.top = entry.item.y + 'px';
    }
  });
  renderConnections();
}

/**
 * Ends a drag, raises the moved cards, and saves history.
 */
function onDragUp() {
  window.removeEventListener('pointermove', onDragMove);
  const d = ui.drag;
  ui.drag = null;
  if (!d) return;
  d.entries.forEach(entry => {
    if (entry.el) {
      entry.el.classList.remove('dragging');
      entry.el.style.zIndex = String(entry.z || 1);
    }
  });
  if (d.moved) {
    let z = maxZ();
    d.entries.forEach(entry => {
      entry.item.z = ++z;
      if (entry.el) entry.el.style.zIndex = String(entry.item.z);
    });
    saveSoon();
    renderConnections();
    pushHistory();
  }
}

/**
 * Starts resizing a card from its bottom-right grip.
 */
function startResize(e, item) {
  const el = cardEl(item.id);
  if (!el) return;
  pushHistory();
  ui.resize = {
    sx: e.clientX,
    sy: e.clientY,
    zoom: getView().z,
    item,
    el,
    w: item.w,
    h: item.h
  };
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', onResizeUp, { once: true });
}

/**
 * Updates a card's size while respecting type-specific minimums.
 */
function onResizeMove(e) {
  const r = ui.resize;
  if (!r) return;
  const minW = r.item.type === 'note' ? 170 : r.item.type === 'board' ? 180 : 200;
  const minH = r.item.type === 'todo' ? 140 : r.item.type === 'image' ? 150 : 110;
  r.item.w = Math.max(minW, Math.round(r.w + (e.clientX - r.sx) / r.zoom));
  r.item.h = Math.max(minH, Math.round(r.h + (e.clientY - r.sy) / r.zoom));
  r.el.style.width = r.item.w + 'px';
  r.el.style.height = r.item.h + 'px';
  renderConnections();
}

/**
 * Ends resizing and saves the result.
 */
function onResizeUp() {
  window.removeEventListener('pointermove', onResizeMove);
  if (ui.resize) {
    ui.resize = null;
    saveSoon();
    pushHistory();
  }
}

/**
 * Completes a connection when a target card is clicked in connect mode.
 */
function onCardClick(e, item) {
  if (!ui.connectFrom) return;
  e.stopPropagation();
  if (ui.connectFrom === item.id) {
    cancelConnect();
    return;
  }
  completeConnect(item.id);
}

/**
 * Enters connection mode from a source card.
 */
function startConnect(id) {
  if (ui.connectFrom === id) {
    cancelConnect();
    return;
  }
  ui.connectFrom = id;
  document.body.classList.add('connecting');
  $$('.card').forEach(el => el.classList.toggle('connect-source', el.dataset.id === id));
  toast('Click another card to connect · Esc to cancel');
}

/**
 * Leaves connection mode and optionally shows a toast.
 */
function cancelConnect(silent) {
  const was = !!ui.connectFrom;
  ui.connectFrom = null;
  document.body.classList.remove('connecting');
  $$('.card').forEach(el => el.classList.remove('connect-source'));
  if (was && !silent) toast('Connection cancelled');
}

/**
 * Creates a connection between the source and target cards.
 */
function completeConnect(toId) {
  const from = ui.connectFrom;
  if (!from) return;
  const board = currentBoard();
  const exists = board.connections.some(c =>
    (c.from === from && c.to === toId) || (c.from === toId && c.to === from)
  );
  if (!exists) {
    pushHistory();
    board.connections.push({ id: uid('c'), from, to: toId });
    saveSoon();
    renderConnections();
    pushHistory();
    toast('Cards connected');
  }
  cancelConnect(true);
}

/* ---------------- pan, marquee, zoom ---------------- */

/**
 * Starts panning the canvas.
 */
function startPan(e) {
  const v = getView();
  ui.pan = { sx: e.clientX, sy: e.clientY, x: v.x, y: v.y };
  $('#canvasWrap').classList.add('panning');
  window.addEventListener('pointermove', onPanMove);
  window.addEventListener('pointerup', onPanUp, { once: true });
}

/**
 * Updates the canvas offset while panning.
 */
function onPanMove(e) {
  const p = ui.pan;
  if (!p) return;
  const v = getView();
  v.x = p.x + (e.clientX - p.sx);
  v.y = p.y + (e.clientY - p.sy);
  applyView();
}

/**
 * Ends panning and saves the view.
 */
function onPanUp() {
  window.removeEventListener('pointermove', onPanMove);
  $('#canvasWrap').classList.remove('panning');
  if (ui.pan) {
    ui.pan = null;
    saveSoon();
  }
}

/**
 * Starts a shift-drag selection rectangle.
 */
function startMarquee(e) {
  const wrap = $('#canvasWrap');
  const rect = wrap.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const el = $('#marquee');
  el.hidden = false;
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  el.style.width = '0px';
  el.style.height = '0px';
  ui.marquee = { rect, sx, sy, cx: sx, cy: sy };
  window.addEventListener('pointermove', onMarqueeMove);
  window.addEventListener('pointerup', onMarqueeUp, { once: true });
}

/**
 * Resizes the marquee rectangle while dragging.
 */
function onMarqueeMove(e) {
  const m = ui.marquee;
  if (!m) return;
  m.cx = clamp(e.clientX - m.rect.left, 0, m.rect.width);
  m.cy = clamp(e.clientY - m.rect.top, 0, m.rect.height);
  const left = Math.min(m.sx, m.cx);
  const top = Math.min(m.sy, m.cy);
  const width = Math.abs(m.cx - m.sx);
  const height = Math.abs(m.cy - m.sy);
  const el = $('#marquee');
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.width = width + 'px';
  el.style.height = height + 'px';
}

/**
 * Selects every card touched by the marquee.
 */
function onMarqueeUp(e) {
  window.removeEventListener('pointermove', onMarqueeMove);
  const m = ui.marquee;
  ui.marquee = null;
  $('#marquee').hidden = true;
  if (!m) return;
  const start = screenToWorld(m.rect.left + m.sx, m.rect.top + m.sy);
  const end = screenToWorld(m.rect.left + m.cx, m.rect.top + m.cy);
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  if (Math.abs(right - left) < 4 && Math.abs(bottom - top) < 4) return;
  currentBoard().items.forEach(item => {
    const overlaps = item.x < right && item.x + item.w > left && item.y < bottom && item.y + item.h > top;
    if (overlaps) ui.selected.add(item.id);
  });
  ui.selectedConnection = null;
  updateSelectionUI();
}

/**
 * Pans with the wheel and zooms with Ctrl or Cmd plus the wheel.
 */
function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const factor = Math.exp(-e.deltaY * 0.0016);
    zoomAt(e.clientX, e.clientY, factor);
  } else {
    const v = getView();
    v.x -= e.deltaX;
    v.y -= e.deltaY;
    applyView();
    saveSoon();
  }
}

/* ---------------- item actions ---------------- */

/**
 * Returns a world position near the viewport center for a new card.
 */
function centerWorld(w, h) {
  const rect = $('#canvasWrap').getBoundingClientRect();
  const v = getView();
  const cx = (rect.width / 2 - v.x) / v.z;
  const cy = (rect.height / 2 - v.y) / v.z;
  const n = currentBoard().items.length;
  const jitter = (n % 4) * 16;
  return { x: Math.round(cx - w / 2 + jitter), y: Math.round(cy - h / 2 + jitter) };
}

/**
 * Creates a card data object with default size, color, and z-index.
 */
function createItem(type, x, y, extra) {
  const size = SIZES[type] || SIZES.note;
  return Object.assign({
    id: uid('i'),
    type,
    x: Math.round(x),
    y: Math.round(y),
    w: size.w,
    h: size.h,
    color: 'white',
    z: nextZ(),
    created: Date.now()
  }, extra || {});
}

/**
 * Adds a note or to-do directly, or opens the right dialog for links, images, and boards.
 */
function addItem(type) {
  if (type === 'link') {
    openLinkModal();
    return;
  }
  if (type === 'image') {
    ui.imagePoint = null;
    $('#imageInput').click();
    return;
  }
  if (type === 'board') {
    openNewBoardModal({ placeCard: true });
    return;
  }
  const size = SIZES[type] || SIZES.note;
  const pos = centerWorld(size.w, size.h);
  const extra = type === 'note'
    ? { text: '' }
    : type === 'todo'
      ? { title: '', todos: [{ id: uid('t'), text: '', done: false }] }
      : {};
  pushHistory();
  const item = createItem(type, pos.x, pos.y, extra);
  currentBoard().items.push(item);
  ui.selected = new Set([item.id]);
  ui.selectedConnection = null;
  saveSoon();
  renderBoard();
  renderSidebar();
  pushHistory();
  const el = cardEl(item.id);
  if (type === 'note' && el) focusEditable($('.note-body', el));
  if (type === 'todo' && el) focusEditable($('.todo-title', el));
}

/**
 * Deletes the selected connection or cards.
 */
function deleteSelection() {
  const board = currentBoard();
  if (ui.selectedConnection) {
    pushHistory();
    board.connections = board.connections.filter(c => c.id !== ui.selectedConnection);
    ui.selectedConnection = null;
    saveSoon();
    renderConnections();
    toast('Line removed');
    return;
  }
  if (!ui.selected.size) return;
  const count = ui.selected.size;
  pushHistory();
  board.items = board.items.filter(item => !ui.selected.has(item.id));
  board.connections = board.connections.filter(c => !ui.selected.has(c.from) && !ui.selected.has(c.to));
  ui.selected.clear();
  saveSoon();
  renderBoard();
  renderSidebar();
  pushHistory();
  toast(count === 1 ? 'Card deleted' : 'Cards deleted');
}

/**
 * Duplicates selected cards and the connections between them.
 */
function duplicateSelection() {
  const board = currentBoard();
  if (!ui.selected.size) return;
  pushHistory();
  const idMap = new Map();
  const clones = [];
  let z = maxZ();
  Array.from(ui.selected).forEach(id => {
    const source = board.items.find(item => item.id === id);
    if (!source) return;
    const copy = deepClone(source);
    copy.id = uid('i');
    copy.x += 26;
    copy.y += 26;
    copy.z = ++z;
    if (copy.type === 'todo') {
      copy.todos.forEach(todo => { todo.id = uid('t'); });
    }
    idMap.set(source.id, copy.id);
    board.items.push(copy);
    clones.push(copy.id);
  });
  if (!clones.length) return;
  board.connections.forEach(conn => {
    if (idMap.has(conn.from) && idMap.has(conn.to)) {
      board.connections.push({ id: uid('c'), from: idMap.get(conn.from), to: idMap.get(conn.to) });
    }
  });
  ui.selected = new Set(clones);
  ui.selectedConnection = null;
  saveSoon();
  renderBoard();
  renderSidebar();
  pushHistory();
  toast(clones.length === 1 ? 'Card duplicated' : 'Cards duplicated');
}

/**
 * Raises a card above the others.
 */
function bringToFront(item) {
  pushHistory();
  item.z = maxZ() + 1;
  const el = cardEl(item.id);
  if (el) el.style.zIndex = String(item.z);
  saveSoon();
  pushHistory();
}

/**
 * Changes a card's color and updates its DOM state.
 */
function setItemColor(item, color) {
  if (item.color === color) return;
  pushHistory();
  item.color = color;
  const el = cardEl(item.id);
  if (el) el.dataset.color = color;
  saveSoon();
  pushHistory();
}

/* ---------------- links & images ---------------- */

/**
 * Opens the add-link dialog and creates a link card.
 */
function openLinkModal() {
  openModal({
    title: 'Add a link',
    subtitle: 'Paste any URL. You can edit the title and note afterwards.',
    width: 480,
    body: `
      <label class="field"><span>URL</span>
        <input class="input" id="linkUrl" placeholder="https://example.com" autocomplete="off" spellcheck="false">
      </label>
      <label class="field"><span>Title <em>(optional)</em></span>
        <input class="input" id="linkTitle" placeholder="Leave blank to use the site name" autocomplete="off">
      </label>`,
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: 'Add link', kind: 'primary', onClick: create }
    ],
    onMount: dlg => {
      const url = $('#linkUrl', dlg);
      const title = $('#linkTitle', dlg);
      url.focus();
      const onEnter = e => {
        if (e.key === 'Enter') { e.preventDefault(); create(dlg); }
      };
      url.addEventListener('keydown', onEnter);
      title.addEventListener('keydown', onEnter);
    }
  });

  /**
   * Creates a link card from the dialog's URL and optional title.
   */
  function create(dlg) {
    const urlInput = $('#linkUrl', dlg || $('#modal'));
    const titleInput = $('#linkTitle', dlg || $('#modal'));
    let url = (urlInput.value || '').trim();
    if (!url) {
      urlInput.classList.add('invalid');
      urlInput.focus();
      toast('Paste a URL first');
      return;
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = 'https://' + url;
    const safe = safeUrl(url);
    if (!safe) {
      urlInput.classList.add('invalid');
      urlInput.focus();
      toast('That doesn’t look like a valid URL', 'error');
      return;
    }
    const host = hostOf(safe);
    const title = (titleInput.value || '').trim() || host || 'Untitled link';
    pushHistory();
    const size = SIZES.link;
    const pos = centerWorld(size.w, size.h);
    const item = createItem('link', pos.x, pos.y, {
      url: safe,
      title,
      description: ''
    });
    currentBoard().items.push(item);
    ui.selected = new Set([item.id]);
    ui.selectedConnection = null;
    closeModal();
    saveSoon();
    renderBoard();
    renderSidebar();
    pushHistory();
    toast('Link added');
  }
}

/**
 * Reads a File into a data URL.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image element from a source URL.
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Reads and compresses an uploaded image so it fits in local storage.
 */
async function processImage(file) {
  const raw = await readFileAsDataURL(file);
  const img = await loadImageElement(raw);
  const w0 = img.naturalWidth || 800;
  const h0 = img.naturalHeight || 600;
  if (file.type === 'image/svg+xml') {
    return { src: raw, w: w0, h: h0 };
  }
  if ((file.type === 'image/gif' || file.size < 260 * 1024) && file.size < 900 * 1024) {
    return { src: raw, w: w0, h: h0 };
  }
  const max = 1400;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  let src = canvas.toDataURL('image/webp', 0.82);
  if (src.length > 1400000) src = canvas.toDataURL('image/jpeg', 0.72);
  return { src, w, h };
}

/**
 * Adds one or more image files as cards at an optional world point.
 */
async function handleImageFiles(files, point) {
  const valid = Array.from(files).filter(file => file.type.startsWith('image/'));
  if (!valid.length) {
    toast('That doesn’t look like an image');
    return;
  }
  toast(valid.length > 1 ? `Adding ${valid.length} images…` : 'Adding image…');
  let offset = 0;
  for (const file of valid) {
    try {
      const processed = await processImage(file);
      let w = 320;
      let h = Math.round(w * processed.h / processed.w);
      if (h < 130) { h = 130; w = Math.round(h * processed.w / processed.h); }
      if (h > 380) { h = 380; w = Math.round(h * processed.w / processed.h); }
      w = clamp(w, 160, 360);
      const cardH = h + 34;
      const base = point
        ? { x: point.x - w / 2, y: point.y - cardH / 2 }
        : centerWorld(w, cardH);
      pushHistory();
      const item = createItem('image', base.x + offset, base.y + offset, {
        src: processed.src,
        caption: '',
        w,
        h: cardH
      });
      currentBoard().items.push(item);
      ui.selected = new Set([item.id]);
      ui.selectedConnection = null;
      saveSoon();
      renderBoard();
      renderSidebar();
      pushHistory();
      offset += 26;
    } catch (err) {
      console.error('Image failed', err);
      toast('Could not add that image', 'error');
    }
  }
}

/* ---------------- search palette ---------------- */

/**
 * Returns the human-readable label for a card type.
 */
function typeLabel(type) {
  return { note: 'Note', todo: 'To-do', link: 'Link', image: 'Image', board: 'Board' }[type] || 'Card';
}

/**
 * Collects the searchable text from a card.
 */
function itemSearchText(item) {
  if (item.type === 'note') return item.text || '';
  if (item.type === 'todo') return [item.title || ''].concat((item.todos || []).map(t => t.text)).join(' ');
  if (item.type === 'link') return [item.title, item.description, item.url].join(' ');
  if (item.type === 'image') return item.caption || '';
  if (item.type === 'board') {
    const target = boardById(item.boardId);
    return target ? target.name : '';
  }
  return '';
}

/**
 * Returns a short single-line preview of text.
 */
function firstLine(text) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Searches boards and cards, returning boards first.
 */
function searchAll(query) {
  const q = query.trim().toLowerCase();
  const results = [];
  if (!q) {
    state.boards.forEach(board => {
      results.push({ kind: 'board', board, label: board.name, sub: board.items.length + ' cards' });
    });
    const recent = [];
    state.boards.forEach(board => {
      board.items.forEach(item => recent.push({ board, item, created: item.created || 0 }));
    });
    recent.sort((a, b) => b.created - a.created);
    recent.slice(0, 8).forEach(entry => {
      results.push({
        kind: 'item',
        board: entry.board,
        item: entry.item,
        label: firstLine(itemSearchText(entry.item)) || typeLabel(entry.item.type),
        sub: entry.board.name + ' · ' + typeLabel(entry.item.type)
      });
    });
    return results;
  }
  state.boards.forEach(board => {
    if (board.name.toLowerCase().includes(q)) {
      results.push({ kind: 'board', board, label: board.name, sub: 'Board · ' + board.items.length + ' cards' });
    }
  });
  state.boards.forEach(board => {
    board.items.forEach(item => {
      const text = itemSearchText(item);
      if (text && text.toLowerCase().includes(q)) {
        results.push({
          kind: 'item',
          board,
          item,
          label: firstLine(text) || typeLabel(item.type),
          sub: board.name + ' · ' + typeLabel(item.type)
        });
      }
    });
  });
  return results.slice(0, 40);
}

/**
 * Pans and zooms so a specific card is centered.
 */
function centerOnItem(item) {
  const rect = $('#canvasWrap').getBoundingClientRect();
  const v = getView();
  if (v.z < 0.7) v.z = 0.8;
  v.x = rect.width / 2 - (item.x + item.w / 2) * v.z;
  v.y = rect.height / 2 - (item.y + item.h / 2) * v.z;
  applyView();
  saveSoon();
}

/**
 * Opens the global search palette.
 */
function openPalette() {
  let results = [];
  let activeIndex = 0;

  const dlg = openModal({
    title: 'Search',
    width: 620,
    body: `
      <div class="palette">
        <div class="palette-input-wrap">
          ${icon('search', 17)}
          <input class="palette-input" id="paletteInput" placeholder="Search boards and cards…" autocomplete="off" spellcheck="false">
        </div>
        <div class="palette-results" id="paletteResults"></div>
        <div class="palette-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate <span style="width:6px"></span> <kbd>↵</kbd> open <span style="width:6px"></span> <kbd>esc</kbd> close</div>
      </div>`,
    onMount: mount
  });

  /**
   * Wires the palette input, result rendering, and keyboard navigation.
   */
  function mount(root) {
    const input = $('#paletteInput', root);
    const container = $('#paletteResults', root);
    input.focus();

    /**
     * Rebuilds the palette result list for the current query.
     */
    function render() {
      results = searchAll(input.value);
      activeIndex = 0;
      container.innerHTML = '';
      if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'palette-empty';
        empty.textContent = 'No matches. Try another word.';
        container.append(empty);
        return;
      }
      let lastKind = '';
      results.forEach((result, index) => {
        if (result.kind !== lastKind) {
          lastKind = result.kind;
          const group = document.createElement('div');
          group.className = 'palette-group';
          group.textContent = result.kind === 'board' ? 'Boards' : 'Cards';
          container.append(group);
        }
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'palette-row' + (index === activeIndex ? ' active' : '');
        row.dataset.index = String(index);

        const iconEl = document.createElement('span');
        iconEl.className = 'pr-icon';
        const linkedBoard = result.kind === 'item' && result.item.type === 'board' ? boardById(result.item.boardId) : null;

        if (result.kind === 'board') {
          iconEl.textContent = result.board.emoji || DEFAULT_EMOJI;
        } else if (result.item.type === 'board') {
          iconEl.textContent = linkedBoard ? linkedBoard.emoji : '▦';
        } else {
          iconEl.innerHTML = icon(
            result.item.type === 'todo' ? 'todo' :
            result.item.type === 'link' ? 'link' :
            result.item.type === 'image' ? 'image' : 'note',
            15
          );
        }

        const text = document.createElement('span');
        text.className = 'pr-text';
        const label = document.createElement('span');
        label.className = 'pr-label';
        label.textContent = result.label;
        const sub = document.createElement('span');
        sub.className = 'pr-sub';
        sub.textContent = result.sub;
        text.append(label, sub);

        const kind = document.createElement('span');
        kind.className = 'pr-kind';
        kind.textContent = result.kind === 'board' ? 'Board' : 'Card';

        row.append(iconEl, text, kind);
        row.addEventListener('click', () => choose(result));
        container.append(row);
      });
    }

    /**
     * Moves the keyboard-active palette result.
     */
    function setActive(next) {
      if (!results.length) return;
      activeIndex = (next + results.length) % results.length;
      $$('.palette-row', container).forEach(row => {
        row.classList.toggle('active', Number(row.dataset.index) === activeIndex);
      });
      const active = $('.palette-row.active', container);
      if (active) active.scrollIntoView({ block: 'nearest' });
    }

    /**
     * Opens the chosen board or jumps to the chosen card.
     */
    function choose(result) {
      closeModal();
      if (result.kind === 'board') {
        openBoard(result.board.id);
        return;
      }
      openBoard(result.board.id);
      centerOnItem(result.item);
      ui.selected = new Set([result.item.id]);
      ui.selectedConnection = null;
      updateSelectionUI();
      const el = cardEl(result.item.id);
      if (el) {
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 1200);
      }
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) choose(results[activeIndex]);
      }
    });
    render();
  }
}

/* ---------------- help ---------------- */

/**
 * Opens the keyboard-shortcuts dialog.
 */
function openHelp() {
  const rows = [
    ['Add a note', 'N'],
    ['Add a to-do', 'T'],
    ['Add an image', 'I'],
    ['Add a link', 'L'],
    ['Add a board', 'B'],
    ['Search everything', '⌘K'],
    ['Undo / redo', '⌘Z / ⇧⌘Z'],
    ['Duplicate card', '⌘D'],
    ['Delete selection', 'Del'],
    ['Fit to content', '⌘0'],
    ['Zoom in / out', '⌘+ / ⌘−'],
    ['Pan the canvas', 'Space + drag'],
    ['Multi-select', 'Shift + drag'],
    ['Edit a card', 'Click it'],
    ['Cancel / deselect', 'Esc']
  ];
  openModal({
    title: 'Keyboard shortcuts',
    subtitle: 'A little keyboard goes a long way.',
    width: 560,
    body: `<div class="shortcut-grid">${rows.map(([label, keys]) => `
      <div class="shortcut-row">
        <span>${label}</span>
        <span class="shortcut-keys">${keys.split(' / ').map(k => k.split(' + ').map(part => `<kbd class="kbd">${part}</kbd>`).join('')).join(' <span style="opacity:.4">/</span> ')}</span>
      </div>`).join('')}</div>`,
    footer: [{ label: 'Got it', kind: 'primary', onClick: closeModal }]
  });
}

/* ---------------- import / export ---------------- */

/**
 * Downloads the workspace as a JSON backup.
 */
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ubernotes-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  toast('Backup exported');
}

/**
 * Reads a JSON backup and replaces the workspace after confirmation.
 */
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data = null;
    try {
      data = normalizeState(JSON.parse(String(reader.result)));
    } catch (err) {
      data = null;
    }
    if (!data) {
      toast('That file is not a valid UberNotes backup', 'error');
      return;
    }
    confirmModal(
      'Import this backup?',
      'This replaces all current boards and cards. Export a backup first if you might want them back.',
      () => {
        state = data;
        navStack = [];
        ui.selected.clear();
        ui.selectedConnection = null;
        ui.boardFilter = '';
        const search = $('#boardSearch');
        if (search) search.value = '';
        applyTheme();
        saveNow();
        renderAll();
        fitView();
        history = { stack: [snapshot()], index: 0 };
        updateHistoryButtons();
        updateBack();
        toast('Backup imported');
      },
      'Import'
    );
  };
  reader.readAsText(file);
}

/* ---------------- toast ---------------- */

/**
 * Shows a transient notification.
 */
function toast(message, kind) {
  const wrap = $('#toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = message;
  wrap.append(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 180);
  }, 2200);
}

/* ---------------- events ---------------- */

/**
 * Handles background clicks: pan, marquee, connect-cancel, and deselect.
 */
function onCanvasPointerDown(e) {
  if (e.button !== 0 && e.button !== 1) return;
  const target = e.target;
  if (target.closest('.toolbar, .zoombar, .canvas-hint, .empty-state')) return;
  if (ui.spaceDown) {
    e.preventDefault();
    startPan(e);
    return;
  }
  if (target.closest('.card')) return;
  if (e.button === 1) {
    e.preventDefault();
    startPan(e);
    return;
  }
  if (e.shiftKey) {
    e.preventDefault();
    startMarquee(e);
    return;
  }
  if (ui.connectFrom) cancelConnect(true);
  if (ui.selected.size || ui.selectedConnection) clearSelection();
  startPan(e);
}

/**
 * Handles global keyboard shortcuts.
 */
function onKeyDown(e) {
  // A dialog manages its own keys (including Escape). Don't let app shortcuts
  // fire behind it.
  if ($('#modal') && $('#modal').open) return;

  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
    return;
  }

  const typing = isTypingTarget(e.target);

  if (e.key === 'Escape') {
    if (typing) return;
    if (ui.connectFrom) { cancelConnect(); return; }
    if (!$('#contextMenu').hidden) { closeMenu(); return; }
    if (ui.selected.size || ui.selectedConnection) clearSelection();
    return;
  }

  if (typing) return;

  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    duplicateSelection();
    return;
  }
  if (mod && e.key === '0') {
    e.preventDefault();
    fitView();
    return;
  }
  if (mod && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomCenter(1.15);
    return;
  }
  if (mod && e.key === '-') {
    e.preventDefault();
    zoomCenter(1 / 1.15);
    return;
  }
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    ui.spaceDown = true;
    document.body.classList.add('space-pan');
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (ui.selected.size || ui.selectedConnection) {
      e.preventDefault();
      deleteSelection();
    }
    return;
  }
  if (e.key === '?') {
    e.preventDefault();
    openHelp();
    return;
  }
  if (!mod && !e.altKey) {
    const key = e.key.toLowerCase();
    if (key === 'n') { e.preventDefault(); addItem('note'); }
    else if (key === 't') { e.preventDefault(); addItem('todo'); }
    else if (key === 'i') { e.preventDefault(); addItem('image'); }
    else if (key === 'l') { e.preventDefault(); addItem('link'); }
    else if (key === 'b') { e.preventDefault(); addItem('board'); }
  }
}

/**
 * Clears space-pan mode when the space key is released.
 */
function onKeyUp(e) {
  if (e.code === 'Space') {
    ui.spaceDown = false;
    document.body.classList.remove('space-pan');
  }
}

/**
 * Pastes image files from the clipboard as cards.
 */
function onPaste(e) {
  if (isTypingTarget(document.activeElement)) return;
  const files = Array.from((e.clipboardData && e.clipboardData.files) || [])
    .filter(file => file.type.startsWith('image/'));
  if (files.length) {
    e.preventDefault();
    handleImageFiles(files);
  }
}

/**
 * Wires every static control and global event listener.
 */
function bindEvents() {
  $('#sidebarToggle').addEventListener('click', toggleSidebar);
  $('#closeSidebar').addEventListener('click', closeMobileSidebar);
  $('#sidebarBackdrop').addEventListener('click', closeMobileSidebar);
  $('#newBoardSide').addEventListener('click', () => openNewBoardModal());
  $('#boardSearch').addEventListener('input', e => {
    ui.boardFilter = e.target.value;
    renderSidebar();
  });
  $('#themeBtn').addEventListener('click', toggleTheme);
  $('#helpBtn').addEventListener('click', openHelp);
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importBtn').addEventListener('click', () => $('#importInput').click());
  $('#importInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) importBackup(file);
    e.target.value = '';
  });
  $('#imageInput').addEventListener('change', e => {
    const files = e.target.files;
    if (files && files.length) {
      ui.imagePoint = null;
      handleImageFiles(files);
    }
    e.target.value = '';
  });

  $('#backBtn').addEventListener('click', goBack);
  // Right-clicking the board name opens the board options menu; left-click
  // still focuses the field for inline renaming.
  $('#boardTitle').addEventListener('contextmenu', e => {
    e.preventDefault();
    openBoardMenu(e.clientX, e.clientY);
  });
  $('#searchBtn').addEventListener('click', openPalette);
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  $('#zoomIn').addEventListener('click', () => zoomCenter(1.15));
  $('#zoomOut').addEventListener('click', () => zoomCenter(1 / 1.15));
  $('#zoomLabel').addEventListener('click', () => {
    const v = getView();
    if (Math.abs(v.z - 1) < 0.01) {
      fitView();
    } else {
      zoomCenter(1 / v.z);
    }
  });
  $('#fitBtn').addEventListener('click', fitView);

  const title = $('#boardTitle');
  title.addEventListener('focus', () => {
    title.dataset.original = currentBoard().name;
    pushHistory();
  });
  title.addEventListener('input', () => {
    currentBoard().name = title.value;
    saveSoon();
    renderSidebar();
  });
  title.addEventListener('blur', () => {
    const board = currentBoard();
    const name = title.value.trim() || 'Untitled board';
    if (title.value !== name) title.value = name;
    if (board.name !== name) {
      board.name = name;
      saveSoon();
      renderSidebar();
    }
    pushHistory();
  });
  title.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); title.blur(); }
    if (e.key === 'Escape') {
      const board = currentBoard();
      const original = title.dataset.original || board.name;
      board.name = original;
      title.value = original;
      saveSoon();
      renderSidebar();
      title.blur();
    }
  });

  const wrap = $('#canvasWrap');
  wrap.addEventListener('pointerdown', onCanvasPointerDown);
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('dragover', e => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });
  wrap.addEventListener('drop', e => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    e.preventDefault();
    ui.imagePoint = screenToWorld(e.clientX, e.clientY);
    handleImageFiles(images, ui.imagePoint);
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-add]');
    if (btn) {
      e.preventDefault();
      addItem(btn.dataset.add);
    }
  });
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#contextMenu')) closeMenu();
  }, true);
  document.addEventListener('paste', onPaste);

  const modal = $('#modal');
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}

/* ---------------- boot ---------------- */

/**
 * Boots the app: icons, theme, first render, history, and events.
 */
function init() {
  $$('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon, 18);
  });
  applyTheme();
  try {
    if (localStorage.getItem(SIDEBAR_KEY) === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch (err) {}

  const hadView = !!state.views[state.activeBoardId];
  renderAll();
  if (!hadView) fitView();

  history = { stack: [snapshot()], index: 0 };
  updateHistoryButtons();
  bindEvents();
  saveSoon();
}

init();

if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}



/**
 * Hides and clears the context menu.
 */
function closeMenu() {
  const menu = $('#contextMenu');
  if (!menu) return;
  menu.hidden = true;
  menu.innerHTML = '';
}

/**
 * Positions a menu near a point while keeping it on screen.
 */
function positionMenu(menu, x, y) {
  menu.hidden = false;
  menu.style.left = '0px';
  menu.style.top = '0px';
  const rect = menu.getBoundingClientRect();
  menu.style.left = clamp(x, 8, window.innerWidth - rect.width - 8) + 'px';
  menu.style.top = clamp(y, 8, window.innerHeight - rect.height - 8) + 'px';
}

/**
 * Adds a section label to a context menu.
 */
function addMenuLabel(menu, text) {
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = text;
  menu.append(label);
}

/**
 * Adds a divider to a context menu.
 */
function addMenuSeparator(menu) {
  const sep = document.createElement('div');
  sep.className = 'menu-sep';
  menu.append(sep);
}

/**
 * Adds an icon action button to a context menu.
 */
function addMenuAction(menu, iconName, label, onClick, options = {}) {
  const btn = document.createElement('button');
  btn.className = 'menu-item' + (options.danger ? ' danger' : '');
  btn.type = 'button';
  btn.innerHTML = `<span class="ic">${icon(iconName, 15)}</span><span></span>`;
  btn.querySelector('span:last-child').textContent = label;
  if (options.shortcut) {
    const kbd = document.createElement('span');
    kbd.className = 'menu-shortcut';
    kbd.textContent = options.shortcut;
    btn.append(kbd);
  }
  btn.addEventListener('click', () => onClick());
  menu.append(btn);
  return btn;
}

/**
 * Builds the card context menu with colors, connect, duplicate, front, and delete actions.
 */
function openItemMenu(item, x, y) {
  closeMenu();
  const menu = $('#contextMenu');
  menu.innerHTML = '';

  if (item.type !== 'image') {
    addMenuLabel(menu, 'Color');
    const row = document.createElement('div');
    row.className = 'menu-colors';
    COLORS.forEach(color => {
      const swatch = document.createElement('button');
      swatch.className = 'swatch' + (item.color === color ? ' selected' : '');
      swatch.type = 'button';
      swatch.dataset.color = color;
      swatch.title = color.charAt(0).toUpperCase() + color.slice(1);
      swatch.addEventListener('click', () => {
        setItemColor(item, color);
        closeMenu();
      });
      row.append(swatch);
    });
    menu.append(row);
    addMenuSeparator(menu);
  }

  addMenuAction(menu, 'connect', 'Connect to…', () => {
    closeMenu();
    startConnect(item.id);
  });
  if (item.type === 'board' && boardById(item.boardId)) {
    addMenuAction(menu, 'external', 'Open board', () => {
      closeMenu();
      openBoard(item.boardId);
    });
  }
  addMenuAction(menu, 'copy', 'Duplicate', () => {
    closeMenu();
    ui.selected = new Set([item.id]);
    ui.selectedConnection = null;
    duplicateSelection();
  }, { shortcut: '⌘D' });
  addMenuAction(menu, 'front', 'Bring to front', () => {
    closeMenu();
    bringToFront(item);
  });
  addMenuSeparator(menu);
  addMenuAction(menu, 'trash', 'Delete', () => {
    closeMenu();
    ui.selected = new Set([item.id]);
    ui.selectedConnection = null;
    deleteSelection();
  }, { danger: true, shortcut: 'Del' });

  positionMenu(menu, x, y);
}

/**
 * Builds the connection context menu.
 */
function openConnectionMenu(conn, x, y) {
  closeMenu();
  const menu = $('#contextMenu');
  menu.innerHTML = '';
  addMenuLabel(menu, 'Connection');
  addMenuAction(menu, 'trash', 'Remove line', () => {
    pushHistory();
    const board = currentBoard();
    board.connections = board.connections.filter(c => c.id !== conn.id);
    ui.selectedConnection = null;
    saveSoon();
    renderConnections();
    closeMenu();
    toast('Line removed');
  }, { danger: true });
  positionMenu(menu, x, y);
}

/**
 * Builds the sidebar board options menu.
 */
function openBoardRowMenu(board, x, y) {
  closeMenu();
  const menu = $('#contextMenu');
  menu.innerHTML = '';
  addMenuLabel(menu, board.name);
  addMenuAction(menu, 'note', 'Rename', () => {
    closeMenu();
    if (state.activeBoardId !== board.id) openBoard(board.id);
    requestAnimationFrame(() => {
      const input = $('#boardTitle');
      if (input) { input.focus(); input.select(); }
    });
  });
  addMenuAction(menu, 'palette', 'Change icon', () => {
    closeMenu();
    openEmojiModal(board);
  });
  addMenuAction(menu, 'copy', 'Duplicate board', () => {
    closeMenu();
    duplicateBoard(board);
  });
  addMenuSeparator(menu);
  addMenuAction(menu, 'trash', 'Delete board', () => {
    closeMenu();
    deleteBoard(board);
  }, { danger: true });
  positionMenu(menu, x, y);
}

/**
 * Builds the topbar board options menu.
 */
function openBoardMenu(x, y) {
  const board = currentBoard();
  closeMenu();
  const menu = $('#contextMenu');
  menu.innerHTML = '';
  addMenuLabel(menu, board.name);
  addMenuAction(menu, 'note', 'Rename board', () => {
    closeMenu();
    const input = $('#boardTitle');
    if (input) { input.focus(); input.select(); }
  });
  addMenuAction(menu, 'palette', 'Change icon', () => {
    closeMenu();
    openEmojiModal(board);
  });
  addMenuAction(menu, 'copy', 'Duplicate board', () => {
    closeMenu();
    duplicateBoard(board);
  });
  addMenuSeparator(menu);
  addMenuAction(menu, 'trash', 'Delete board', () => {
    closeMenu();
    deleteBoard(board);
  }, { danger: true });
  positionMenu(menu, x, y);
}

/* ---------------- modals ---------------- */

/**
 * Closes the shared dialog.
 */
function closeModal() {
  const dlg = $('#modal');
  if (dlg && dlg.open) dlg.close();
}

/**
 * Builds and opens a modal from a title, body, and footer actions.
 */
function openModal(options) {
  const dlg = $('#modal');
  if (!dlg) return null;
  if (dlg.open) dlg.close();
  const width = options.width || 460;
  dlg.innerHTML = `
    <div class="modal-card" style="width:min(92vw, ${width}px)">
      <div class="modal-head">
        <div class="modal-head-text">
          <h2></h2>
          <p class="modal-sub"></p>
        </div>
        <button class="icon-btn modal-x" type="button" aria-label="Close">${icon('x', 17)}</button>
      </div>
      <div class="modal-body"></div>
      <div class="modal-foot"></div>
    </div>`;
  $('.modal-head h2', dlg).textContent = options.title || '';
  const sub = $('.modal-sub', dlg);
  if (options.subtitle) sub.textContent = options.subtitle;
  else sub.remove();
  $('.modal-body', dlg).innerHTML = options.body || '';
  const foot = $('.modal-foot', dlg);
  if (options.footer && options.footer.length) {
    options.footer.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (action.kind || 'ghost');
      btn.textContent = action.label;
      btn.addEventListener('click', () => action.onClick && action.onClick(dlg));
      foot.append(btn);
    });
  } else {
    foot.remove();
  }
  $('.modal-x', dlg).addEventListener('click', closeModal);
  dlg.showModal();
  if (options.onMount) options.onMount(dlg);
  return dlg;
}

/**
 * Opens a confirmation dialog with cancel and confirm actions.
 */
function confirmModal(title, message, onConfirm, confirmLabel = 'Delete') {
  openModal({
    title,
    subtitle: message,
    width: 440,
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: confirmLabel, kind: 'danger', onClick: () => { closeModal(); onConfirm(); } }
    ]
  });
}

/* ---------------- board management ---------------- */

/**
 * Opens the create-board dialog, optionally placing a board card.
 */
function openNewBoardModal(options = {}) {
  const placeCard = !!options.placeCard;
  openModal({
    title: placeCard ? 'New nested board' : 'New board',
    subtitle: placeCard ? 'A board inside this one. Open it to add cards.' : 'Give your new space a name.',
    width: 470,
    body: `
      <label class="field"><span>Name</span>
        <input class="input" id="nbName" maxlength="60" placeholder="Untitled board" autocomplete="off">
      </label>
      <div class="field"><span>Icon</span>
        <div class="emoji-input-row">
          <div class="emoji-preview" id="nbEmojiPreview" aria-hidden="true">${DEFAULT_EMOJI}</div>
          <input class="input emoji-input" id="nbEmoji" maxlength="24" placeholder="Type or paste an emoji" autocomplete="off" spellcheck="false" aria-label="Board icon">
        </div>
        <p class="field-hint">Use any emoji. On Windows, press <kbd class="kbd">Win</kbd> + <kbd class="kbd">.</kbd> to open the emoji keyboard.</p>
      </div>`,
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: 'Create board', kind: 'primary', onClick: create }
    ],
    onMount: dlg => {
      const input = $('#nbName', dlg);
      const emojiInput = $('#nbEmoji', dlg);
      const preview = $('#nbEmojiPreview', dlg);
      input.focus();
      emojiInput.addEventListener('input', () => {
        preview.textContent = normalizeEmoji(emojiInput.value, DEFAULT_EMOJI);
      });
      const onEnter = e => {
        if (e.key === 'Enter') { e.preventDefault(); create(dlg); }
      };
      input.addEventListener('keydown', onEnter);
      emojiInput.addEventListener('keydown', onEnter);
    }
  });

  /**
   * Creates the board from the dialog and optionally adds a board card.
   */
  function create(dlg) {
    const input = $('#nbName', dlg || $('#modal'));
    const emojiInput = $('#nbEmoji', dlg || $('#modal'));
    const name = (input.value || '').trim() || 'Untitled board';
    const emoji = normalizeEmoji(emojiInput ? emojiInput.value : '', DEFAULT_EMOJI);
    pushHistory();
    const board = {
      id: uid('b'),
      name,
      emoji,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      connections: []
    };
    state.boards.push(board);
    if (placeCard) {
      const size = SIZES.board;
      const pos = centerWorld(size.w, size.h);
      const item = createItem('board', pos.x, pos.y, { boardId: board.id, color: 'white' });
      currentBoard().items.push(item);
      ui.selected = new Set([item.id]);
      ui.selectedConnection = null;
      closeModal();
      saveSoon();
      renderAll();
      pushHistory();
      toast('Board created');
    } else {
      closeModal();
      saveSoon();
      renderSidebar();
      openBoard(board.id);
    }
  }
}

/**
 * Opens the board-icon dialog with a free-form emoji input.
 */
function openEmojiModal(board) {
  openModal({
    title: 'Board icon',
    subtitle: 'Use any emoji that feels like this space.',
    width: 470,
    body: `
      <div class="field"><span>Icon</span>
        <div class="emoji-input-row">
          <div class="emoji-preview" id="emojiPreview" aria-hidden="true"></div>
          <input class="input emoji-input" id="emojiInput" maxlength="24" placeholder="Type or paste an emoji" autocomplete="off" spellcheck="false" aria-label="Board icon">
        </div>
        <p class="field-hint">Use any emoji. On Windows, press <kbd class="kbd">Win</kbd> + <kbd class="kbd">.</kbd> to open the emoji keyboard.</p>
      </div>`,
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: 'Save icon', kind: 'primary', onClick: save }
    ],
    onMount: dlg => {
      const input = $('#emojiInput', dlg);
      const preview = $('#emojiPreview', dlg);
      input.value = board.emoji;
      preview.textContent = board.emoji;
      input.focus();
      input.select();
      input.addEventListener('input', () => {
        preview.textContent = normalizeEmoji(input.value, board.emoji);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
      });
    }
  });

  /**
   * Saves the chosen board icon and refreshes the sidebar and topbar.
   */
  function save() {
    const input = $('#emojiInput');
    const emoji = normalizeEmoji(input ? input.value : '', board.emoji);
    if (emoji !== board.emoji) {
      pushHistory();
      board.emoji = emoji;
      saveSoon();
      renderTopbar();
      renderSidebar();
      pushHistory();
    }
    closeModal();
  }
}

/**
 * Deep-copies a board, including cards, to-dos, and connections.
 */
function duplicateBoard(board) {
  pushHistory();
  const copy = deepClone(board);
  copy.id = uid('b');
  copy.name = board.name + ' copy';
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  const idMap = new Map();
  copy.items.forEach(item => {
    const oldId = item.id;
    item.id = uid('i');
    idMap.set(oldId, item.id);
    if (item.type === 'todo') item.todos.forEach(todo => { todo.id = uid('t'); });
  });
  copy.connections.forEach(conn => {
    conn.id = uid('c');
    conn.from = idMap.get(conn.from) || conn.from;
    conn.to = idMap.get(conn.to) || conn.to;
  });
  state.boards.push(copy);
  saveSoon();
  renderSidebar();
  openBoard(copy.id);
  pushHistory();
  toast('Board duplicated');
}

/**
 * Deletes a board after confirmation and cleans up references.
 */
function deleteBoard(board) {
  if (state.boards.length <= 1) {
    toast('You need at least one board');
    return;
  }
  confirmModal(
    'Delete “' + board.name + '”?',
    'The board and all its cards will be removed. You can undo this with Ctrl+Z.',
    () => {
      pushHistory();
      state.boards = state.boards.filter(b => b.id !== board.id);
      state.boards.forEach(other => {
        other.items = other.items.filter(item => !(item.type === 'board' && item.boardId === board.id));
        other.connections = other.connections.filter(c =>
          other.items.some(i => i.id === c.from) && other.items.some(i => i.id === c.to)
        );
      });
      delete state.views[board.id];
      navStack = navStack.filter(id => id !== board.id);
      if (state.activeBoardId === board.id) {
        state.activeBoardId = state.boards[0].id;
        const hadView = !!state.views[state.activeBoardId];
        ui.selected.clear();
        ui.selectedConnection = null;
        saveSoon();
        renderAll();
        if (!hadView) fitView();
      } else {
        ui.selected.clear();
        ui.selectedConnection = null;
        saveSoon();
        renderAll();
      }
      updateBack();
      pushHistory();
      toast('Board deleted');
    }
  );
}



