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
  board: { w: 240, h: 170 },
  table: { w: 380, h: 320 },
  file: { w: 320, h: 280 }
};
/* Largest PDF or video UberNotes will store in localStorage, in bytes. */
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

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

/**
 * Parses a #rgb or #rrggbb color into channel values, or null when invalid.
 */
function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

/**
 * Formats red, green, and blue channels as a #rrggbb string.
 */
function rgbToHex(r, g, b) {
  const part = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return '#' + part(r) + part(g) + part(b);
}

/**
 * Blends color a toward color b by t, where 0 keeps a and 1 gives b.
 */
function mixColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

/**
 * Returns a color as an rgba() string with the given alpha.
 */
function withAlpha(hex, alpha) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

/**
 * True when a color is dark enough to need light text on top of it.
 */
function isDarkColor(hex) {
  const c = hexToRgb(hex);
  if (!c) return false;
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255 < 0.5;
}

/**
 * Coerces a saved custom theme into valid hex colors.
 */
function normalizeCustomTheme(theme) {
  const t = theme && typeof theme === 'object' ? theme : {};
  const pick = (value, fallback) => {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : fallback;
  };
  return {
    bg: pick(t.bg, DEFAULT_CUSTOM_THEME.bg),
    accent: pick(t.accent, DEFAULT_CUSTOM_THEME.accent)
  };
}

/**
 * Derives readable panels and text from the custom background color.
 */
function customPalette(c) {
  const dark = isDarkColor(c.bg);
  return {
    dark,
    text: dark ? '#f1eee7' : '#26231e',
    surface: dark ? mixColor(c.bg, '#ffffff', 0.08) : mixColor(c.bg, '#ffffff', 0.72)
  };
}

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
  brush: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02Z"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18"/><path d="M9.5 9.5V20"/><path d="M15 9.5V20"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'
};

/**
 * Builds an inline SVG icon string from the ICONS map.
 */
function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/** Typeface presets offered in the Themes dialog. */
const FONTS = [
  { id: 'sans', name: 'Sans', desc: 'Clean and neutral' },
  { id: 'serif', name: 'Serif', desc: 'Warm and editorial' },
  { id: 'rounded', name: 'Rounded', desc: 'Soft and friendly' },
  { id: 'mono', name: 'Mono', desc: 'Even and technical' }
];

/** Starting palette for a new custom theme. */
const DEFAULT_CUSTOM_THEME = {
  bg: '#f4f1ea',
  accent: '#5b5bd6'
};

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function localDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function nextDueDate(value, repeat) {
  const [year, month, day] = value.split('-').map(Number);
  const today = localDateString();
  let date;
  if (repeat === 'monthly') {
    let monthOffset = 1;
    do {
      const monthIndex = month - 1 + monthOffset;
      const targetYear = year + Math.floor(monthIndex / 12);
      const targetMonth = monthIndex % 12;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      date = new Date(targetYear, targetMonth, Math.min(day, lastDay));
      monthOffset++;
    } while (localDateString(date) <= today);
  } else {
    const interval = repeat === 'weekly' ? 7 : 1;
    date = new Date(year, month - 1, day);
    do {
      date.setDate(date.getDate() + interval);
    } while (localDateString(date) <= today);
  }
  return localDateString(date);
}

/** CSS custom properties that a custom theme overrides. */
const THEME_VARS = [
  '--bg', '--sidebar', '--surface', '--surface-2', '--hover',
  '--text', '--text-2', '--text-3', '--border', '--border-strong',
  '--dot', '--accent', '--accent-hover', '--accent-soft', '--accent-ring',
  '--line', '--line-strong'
];

/* ---------------- table & file data ---------------- */

/** Default column labels for a brand-new table card. */
const TABLE_DEFAULT_COLS = ['Item', 'Qty', 'Price'];

/**
 * Builds the starting columns and rows for a new table card.
 */
function defaultTable() {
  const cols = TABLE_DEFAULT_COLS.map(label => ({ id: uid('col'), label }));
  const rows = [0, 1, 2].map(() => ({ id: uid('row'), cells: cols.map(() => '') }));
  return { cols, rows };
}

/**
 * Repairs a table card so columns, rows, and cells always line up.
 */
function normalizeTable(item) {
  const raw = item.table && typeof item.table === 'object' ? item.table : {};
  let cols = Array.isArray(raw.cols) ? raw.cols.filter(c => c && typeof c === 'object') : [];
  cols = cols.map((c, i) => ({
    id: typeof c.id === 'string' && c.id ? c.id : uid('col'),
    label: typeof c.label === 'string' ? c.label : 'Column ' + (i + 1)
  }));
  if (!cols.length) {
    cols = TABLE_DEFAULT_COLS.map(label => ({ id: uid('col'), label }));
  }
  let rows = Array.isArray(raw.rows) ? raw.rows.filter(r => r && typeof r === 'object') : [];
  rows = rows.map(r => {
    const cells = Array.isArray(r.cells) ? r.cells : [];
    return {
      id: typeof r.id === 'string' && r.id ? r.id : uid('row'),
      cells: cols.map((_, i) => (cells[i] == null ? '' : String(cells[i])))
    };
  });
  if (!rows.length) rows = [{ id: uid('row'), cells: cols.map(() => '') }];
  item.table = { cols, rows };
}

/**
 * Parses a table cell as a number, or returns null when it is not numeric.
 */
function cellNumber(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;
  if (!/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text)) return null;
  return Number(text.replace(/,/g, ''));
}

/**
 * Formats a computed number for the table summary row.
 */
function formatNumber(n) {
  if (!Number.isFinite(n)) return '';
  return Number(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Repairs a file card so its metadata and data URL are always valid.
 */
function normalizeFile(item) {
  const raw = item.file && typeof item.file === 'object' ? item.file : null;
  if (!raw || typeof raw.data !== 'string' || !raw.data.startsWith('data:')) {
    item.file = null;
    return;
  }
  item.file = {
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'File',
    mime: typeof raw.mime === 'string' ? raw.mime : '',
    size: Number.isFinite(raw.size) ? raw.size : 0,
    data: raw.data
  };
}

/**
 * True when a file is a PDF or an MP4 video.
 */
function isSupportedFile(file) {
  const name = (file.name || '').toLowerCase();
  return file.type === 'application/pdf' || file.type === 'video/mp4' ||
    name.endsWith('.pdf') || name.endsWith('.mp4');
}

/**
 * Formats a byte count as a short human-readable size.
 */
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Cached object URLs for file cards, keyed by card id. */
const fileUrlCache = new Map();

/**
 * Converts a stored data URL into a Blob.
 */
function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
  if (/;base64/i.test(meta)) {
    try {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (err) {
      console.warn('Could not decode file data', err);
      return null;
    }
  }
  try {
    return new Blob([decodeURIComponent(body)], { type: mime });
  } catch (err) {
    return null;
  }
}

/**
 * Returns a reusable blob URL for a file card, rebuilding it if the data changed.
 */
function fileObjectUrl(item) {
  if (!item.file || !item.file.data) return '';
  const cached = fileUrlCache.get(item.id);
  if (cached && cached.data === item.file.data) return cached.url;
  if (cached) URL.revokeObjectURL(cached.url);
  const blob = dataUrlToBlob(item.file.data);
  if (!blob) {
    fileUrlCache.delete(item.id);
    return '';
  }
  const url = URL.createObjectURL(blob);
  fileUrlCache.set(item.id, { data: item.file.data, url });
  return url;
}

/**
 * Releases the cached blob URL for one card.
 */
function forgetFileUrl(id) {
  const cached = fileUrlCache.get(id);
  if (!cached) return;
  URL.revokeObjectURL(cached.url);
  fileUrlCache.delete(id);
}

/**
 * Releases every cached blob URL when the page is closed.
 */
function releaseFileUrls() {
  fileUrlCache.forEach(entry => URL.revokeObjectURL(entry.url));
  fileUrlCache.clear();
}

/* ---------------- state ---------------- */

let state;
let ui = {
  selected: new Set(),
  selectedConnection: null,
  connectFrom: null,
  boardFilter: '',
  specialView: null,
  spaceDown: false,
  drag: null,
  resize: null,
  pan: null,
  marquee: null,
  // Active touch points on the canvas, used for pinch-to-zoom.
  touchPointers: new Map(),
  pinch: null,
  touchPinched: false,
  lastTap: null,
  touchHintShown: false,
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
  data.theme = ['light', 'dark', 'custom'].includes(data.theme) ? data.theme : 'light';
  data.customTheme = normalizeCustomTheme(data.customTheme);
  data.font = FONTS.some(f => f.id === data.font) ? data.font : 'sans';
  data.trash = Array.isArray(data.trash) ? data.trash.filter(entry => entry && typeof entry === 'object') : [];
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
      if (item.type === 'todo') {
        if (typeof item.title !== 'string') item.title = '';
        item.todos = Array.isArray(item.todos) ? item.todos.filter(todo => todo && typeof todo === 'object') : [];
        item.todos.forEach(todo => {
          if (typeof todo.id !== 'string') todo.id = uid('t');
          if (typeof todo.text !== 'string') todo.text = '';
          todo.done = todo.done === true;
          if (!isValidDate(todo.dueDate)) {
            delete todo.dueDate;
            delete todo.repeat;
          }
          if (!['daily', 'weekly', 'monthly'].includes(todo.repeat)) delete todo.repeat;
        });
      }
      if (item.type === 'table') normalizeTable(item);
      if (item.type === 'file') normalizeFile(item);
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
    font: 'sans',
    customTheme: { ...DEFAULT_CUSTOM_THEME },
    activeBoardId: welcomeId,
    trash: [],
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
  return !!(el && typeof el.matches === 'function' &&
    (el.isContentEditable || el.matches('input, textarea, select')));
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
    return true;
  } catch (err) {
    console.error('Save failed', err);
    setSaved('Storage full', 'error');
    if (!ui.storageWarned) {
      ui.storageWarned = true;
      toast('Local storage is full. Export a backup and remove a large image or file.', 'error');
    }
    return false;
  }
}

/**
 * Serializes the undoable parts of the workspace.
 */
function snapshot() {
  return JSON.stringify({ boards: state.boards, activeBoardId: state.activeBoardId, trash: state.trash });
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
  state.trash = Array.isArray(snap.trash) ? snap.trash : [];
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
 * Applies the light, dark, or custom theme. Custom themes derive every
 * supporting color from the four colors the user picks.
 */
function applyTheme() {
  const root = document.documentElement;
  const custom = state.theme === 'custom';
  const c = state.customTheme || DEFAULT_CUSTOM_THEME;
  const palette = custom ? customPalette(c) : null;
  const dark = custom ? palette.dark : state.theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.custom = custom ? '1' : '0';
  if (!custom) {
    THEME_VARS.forEach(name => root.style.removeProperty(name));
    return;
  }
  const text = palette.text;
  const surface = palette.surface;
  const values = {
    '--bg': c.bg,
    '--sidebar': mixColor(surface, c.bg, 0.35),
    '--surface': surface,
    '--surface-2': mixColor(surface, text, 0.055),
    '--hover': withAlpha(text, dark ? 0.07 : 0.06),
    '--text': text,
    '--text-2': mixColor(text, c.bg, 0.35),
    '--text-3': mixColor(text, c.bg, 0.55),
    '--border': withAlpha(text, dark ? 0.14 : 0.09),
    '--border-strong': withAlpha(text, dark ? 0.24 : 0.16),
    '--dot': withAlpha(text, dark ? 0.13 : 0.16),
    '--accent': c.accent,
    '--accent-hover': mixColor(c.accent, dark ? '#ffffff' : '#000000', 0.12),
    '--accent-soft': withAlpha(c.accent, dark ? 0.14 : 0.1),
    '--accent-ring': withAlpha(c.accent, dark ? 0.3 : 0.22),
    '--line': withAlpha(text, dark ? 0.28 : 0.32),
    '--line-strong': withAlpha(text, dark ? 0.5 : 0.6)
  };
  THEME_VARS.forEach(name => root.style.setProperty(name, values[name]));
}

/**
 * Applies the saved typeface preset to the whole app.
 */
function applyFont() {
  document.documentElement.dataset.font = state.font || 'sans';
}

/**
 * Switches the color theme, saves it, and refreshes the Themes dialog.
 */
function setTheme(theme) {
  state.theme = ['light', 'dark', 'custom'].includes(theme) ? theme : 'light';
  applyTheme();
  saveSoon();
}

/**
 * Switches the typeface preset, saves it, and refreshes the Themes dialog.
 */
function setFont(font) {
  state.font = FONTS.some(f => f.id === font) ? font : 'sans';
  applyFont();
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
  const today = localDateString();
  let todayCount = 0;
  let overdueCount = 0;
  state.boards.forEach(board => board.items.forEach(item => {
    if (item.type !== 'todo') return;
    item.todos.forEach(todo => {
      if (todo.done || !isValidDate(todo.dueDate)) return;
      if (todo.dueDate === today) todayCount++;
      else if (todo.dueDate < today) overdueCount++;
    });
  }));
  $('#todayCount').textContent = String(todayCount);
  $('#overdueCount').textContent = String(overdueCount);
  $('#trashCount').textContent = String(state.trash.length);
  $$('.smart-view').forEach(button => {
    button.classList.toggle('active', button.dataset.view === ui.specialView);
    button.onclick = () => openSmartView(button.dataset.view);
  });
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
  if (ui.specialView) {
    if (emoji) emoji.textContent = ui.specialView === 'today' ? '☀️' : ui.specialView === 'overdue' ? '⏰' : '🗑️';
    if (title && document.activeElement !== title) title.value =
      ui.specialView === 'today' ? 'Today' : ui.specialView === 'overdue' ? 'Overdue' : 'Trash';
    if (title) title.readOnly = true;
    if (meta) meta.textContent = ui.specialView === 'trash'
      ? state.trash.length + (state.trash.length === 1 ? ' deleted item' : ' deleted items')
      : ui.specialView === 'today'
        ? 'Tasks due today'
        : 'Past-due tasks';
  } else {
    if (emoji) emoji.textContent = board.emoji;
    if (title && document.activeElement !== title) title.value = board.name;
    if (title) title.readOnly = false;
    if (meta) {
      const n = board.items.length;
      meta.textContent = n + (n === 1 ? ' card' : ' cards');
    }
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
  if (ui.specialView) {
    renderTaskView();
    return;
  }
  $('#taskView').hidden = true;
  $('#canvas').style.display = '';
  $('#toolbar').hidden = false;
  $('#canvasHint').hidden = false;
  $('.zoombar').hidden = false;
  $('#canvasWrap').classList.remove('has-task-view');
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

function openSmartView(view) {
  if (!['today', 'overdue', 'trash'].includes(view)) return;
  ui.specialView = view;
  ui.selected.clear();
  ui.selectedConnection = null;
  cancelConnect(true);
  closeMenu();
  renderAll();
  closeMobileSidebar();
}

function renderTaskView() {
  const view = $('#taskView');
  const canvas = $('#canvas');
  if (!view || !canvas) return;
  canvas.style.display = 'none';
  view.hidden = false;
  $('#emptyState').hidden = true;
  $('#toolbar').hidden = true;
  $('#canvasHint').hidden = true;
  $('.zoombar').hidden = true;
  view.innerHTML = '';
  $('#canvasWrap').classList.add('has-task-view');
  view.onpointerdown = event => event.stopPropagation();

  if (ui.specialView === 'trash') {
    renderTrashView(view);
    return;
  }

  const today = localDateString();
  const entries = [];
  state.boards.forEach(board => board.items.forEach(item => {
    if (item.type !== 'todo') return;
    item.todos.forEach(todo => {
      if (todo.done || !isValidDate(todo.dueDate)) return;
      const due = ui.specialView === 'today'
        ? todo.dueDate === today
        : todo.dueDate < today;
      if (due) entries.push({ board, item, todo });
    });
  }));
  entries.sort((a, b) => a.todo.dueDate.localeCompare(b.todo.dueDate));
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'task-view-empty';
    empty.textContent = ui.specialView === 'today'
      ? 'Nothing due today. Add due dates to tasks to see them here.'
      : 'You’re all caught up. Past-due tasks will show up here.';
    view.append(empty);
    return;
  }
  const list = document.createElement('div');
  list.className = 'task-view-list';
  entries.forEach(({ board, item, todo }) => {
    const row = document.createElement('article');
    row.className = 'task-view-row';
    const check = document.createElement('button');
    check.className = 'todo-check';
    check.type = 'button';
    check.title = 'Mark as done';
    check.innerHTML = icon('check', 12);
    check.addEventListener('click', () => toggleTodoDone(item, todo));
    const body = document.createElement('div');
    body.className = 'task-view-body';
    const text = document.createElement('div');
    text.className = 'task-view-text';
    text.textContent = todo.text.trim() || 'Untitled task';
    const meta = document.createElement('div');
    meta.className = 'task-view-meta';
    meta.textContent = board.name + ' · ' + (item.title.trim() || 'To-do');
    const due = document.createElement('time');
    due.className = 'task-view-due' + (todo.dueDate < today ? ' overdue' : '');
    due.dateTime = todo.dueDate;
    due.textContent = formatDueDate(todo.dueDate);
    body.append(text, meta);
    const open = document.createElement('button');
    open.className = 'task-view-open';
    open.type = 'button';
    open.textContent = 'Open';
    open.addEventListener('click', () => openTaskBoard(board.id, item.id));
    row.append(check, body, due, open);
    list.append(row);
  });
  view.append(list);
}

function formatDueDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function openTaskBoard(boardId, itemId) {
  ui.specialView = null;
  openBoard(boardId);
  ui.selected = new Set([itemId]);
  renderBoard();
  const item = itemById(itemId);
  if (item) centerOnItem(item);
}

function renderTrashView(view) {
  const header = document.createElement('div');
  header.className = 'trash-view-head';
  const label = document.createElement('span');
  label.textContent = 'Deleted items stay here until you remove them permanently.';
  header.append(label);
  if (state.trash.length) {
    const empty = document.createElement('button');
    empty.className = 'btn danger';
    empty.type = 'button';
    empty.textContent = 'Empty Trash';
    empty.addEventListener('click', emptyTrash);
    header.append(empty);
  }
  view.append(header);
  if (!state.trash.length) {
    const empty = document.createElement('div');
    empty.className = 'task-view-empty';
    empty.textContent = 'Trash is empty.';
    view.append(empty);
    return;
  }
  const list = document.createElement('div');
  list.className = 'task-view-list';
  state.trash.slice().sort((a, b) => b.deletedAt - a.deletedAt).forEach(entry => {
    const row = document.createElement('article');
    row.className = 'task-view-row trash-view-row';
    const body = document.createElement('div');
    body.className = 'task-view-body';
    const title = document.createElement('div');
    title.className = 'task-view-text';
    title.textContent = entry.kind === 'board'
      ? entry.board.name
      : entry.kind === 'task'
        ? entry.todo.text.trim() || 'Untitled task'
        : cardTitle(entry.item);
    const meta = document.createElement('div');
    meta.className = 'task-view-meta';
    const parent = entry.kind === 'board' ? null : boardById(entry.boardId);
    const parentItem = entry.kind === 'task' && parent
      ? parent.items.find(item => item.id === entry.itemId && item.type === 'todo')
      : null;
    meta.textContent = entry.kind === 'board'
      ? 'Board'
      : entry.kind === 'task'
        ? parentItem
          ? 'Task · ' + parent.name + ' / ' + (parentItem.title.trim() || 'To-do')
          : 'Task · restore its ' + (parent ? 'to-do card' : 'board') + ' first'
        : 'Card' + (parent ? ' · ' + parent.name : ' · original board deleted');
    body.append(title, meta);
    const restore = document.createElement('button');
    restore.className = 'btn ghost';
    restore.type = 'button';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => restoreTrashEntry(entry.id));
    const remove = document.createElement('button');
    remove.className = 'btn danger';
    remove.type = 'button';
    remove.textContent = 'Delete forever';
    remove.addEventListener('click', () => permanentlyDeleteTrashEntry(entry.id));
    row.append(body, restore, remove);
    list.append(row);
  });
  view.append(list);
}

function cardTitle(item) {
  if (item.type === 'todo') return item.title.trim() || 'To-do';
  if (item.type === 'note') return (item.text || '').split('\n')[0].trim() || 'Note';
  if (item.type === 'link') return item.title || 'Link';
  if (item.type === 'file') return item.file && item.file.name || 'File';
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

/* ---------------- navigation ---------------- */

/**
 * Navigates to a board, updating history, selection, and view.
 */
function openBoard(id, options = {}) {
  const target = boardById(id);
  if (!target) return;
  const wasSpecialView = !!ui.specialView;
  ui.specialView = null;
  if (state.activeBoardId === id && !wasSpecialView) {
    closeMobileSidebar();
    return;
  }
  if (state.activeBoardId === id) {
    renderAll();
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
  else if (item.type === 'table') buildTable(el, item);
  else if (item.type === 'file') buildFile(el, item);

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
    renderSidebar();
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
      toggleTodoDone(item, todo);
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

    const meta = document.createElement('div');
    meta.className = 'todo-meta';
    const dueControl = document.createElement('label');
    dueControl.className = 'todo-control todo-date-control';
    dueControl.title = 'Set due date';
    const dueIcon = document.createElement('span');
    dueIcon.className = 'todo-control-icon';
    dueIcon.innerHTML = icon('calendar', 12);
    const dueLabel = document.createElement('span');
    dueLabel.className = 'todo-control-label';
    dueLabel.textContent = 'Due date';
    const dueValue = document.createElement('span');
    dueValue.className = 'todo-date-value';
    dueValue.textContent = isValidDate(todo.dueDate) ? formatDueDate(todo.dueDate) : '';
    const dueDate = document.createElement('input');
    dueDate.className = 'todo-due-date';
    dueDate.type = 'date';
    dueDate.value = isValidDate(todo.dueDate) ? todo.dueDate : '';
    dueDate.classList.toggle('has-value', !!dueDate.value);
    dueDate.setAttribute('aria-label', 'Due date');
    dueDate.addEventListener('pointerdown', e => e.stopPropagation());
    dueDate.addEventListener('click', e => e.stopPropagation());
    dueDate.addEventListener('change', () => {
      pushHistory();
      if (dueDate.value) todo.dueDate = dueDate.value;
      else {
        delete todo.dueDate;
        delete todo.repeat;
        repeat.value = '';
      }
      dueDate.classList.toggle('has-value', !!dueDate.value);
      dueValue.textContent = dueDate.value ? formatDueDate(dueDate.value) : '';
      saveSoon();
      renderSidebar();
      pushHistory();
    });
    dueControl.append(dueIcon, dueLabel, dueValue, dueDate);

    const repeatControl = document.createElement('label');
    repeatControl.className = 'todo-control todo-repeat-control';
    repeatControl.title = 'Repeat task';
    const repeatIcon = document.createElement('span');
    repeatIcon.className = 'todo-control-icon';
    repeatIcon.innerHTML = icon('repeat', 12);
    const repeat = document.createElement('select');
    repeat.className = 'todo-repeat';
    repeat.setAttribute('aria-label', 'Repeat task');
    [
      ['', 'Repeat'],
      ['daily', 'Daily'],
      ['weekly', 'Weekly'],
      ['monthly', 'Monthly']
    ].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      repeat.append(option);
    });
    repeat.value = todo.repeat || '';
    repeat.addEventListener('pointerdown', e => e.stopPropagation());
    repeat.addEventListener('click', e => e.stopPropagation());
    repeat.addEventListener('change', () => {
      if (repeat.value && !isValidDate(todo.dueDate)) {
        repeat.value = '';
        toast('Set a due date before adding a repeat', 'error');
        return;
      }
      pushHistory();
      if (repeat.value) todo.repeat = repeat.value;
      else delete todo.repeat;
      saveSoon();
      pushHistory();
    });
    repeatControl.append(repeatIcon, repeat);

    meta.append(dueControl, repeatControl);
    const content = document.createElement('div');
    content.className = 'todo-content';
    content.append(text, meta);

    const remove = document.createElement('button');
    remove.className = 'todo-remove';
    remove.type = 'button';
    remove.title = 'Remove item';
    remove.innerHTML = icon('x', 13);
    remove.addEventListener('pointerdown', e => e.stopPropagation());
    remove.addEventListener('click', e => {
      e.stopPropagation();
      pushHistory();
      state.trash.push({
        id: uid('trash'),
        kind: 'task',
        deletedAt: Date.now(),
        boardId: state.activeBoardId,
        itemId: item.id,
        index,
        todo: deepClone(todo)
      });
      item.todos.splice(index, 1);
      renderTodoRows(list, item);
      saveSoon();
      renderSidebar();
      pushHistory();
    });

    row.append(check, content, remove);
    list.append(row);
  });
}

function toggleTodoDone(item, todo) {
  const board = state.boards.find(candidate => candidate.items.includes(item));
  if (!board) return;
  pushHistory();
  todo.done = !todo.done;
  if (todo.done && todo.repeat && isValidDate(todo.dueDate)) {
    const next = Object.assign({}, todo, {
      id: uid('t'),
      dueDate: nextDueDate(todo.dueDate, todo.repeat),
      done: false
    });
    item.todos.splice(item.todos.indexOf(todo) + 1, 0, next);
    delete todo.repeat;
  }
  saveSoon();
  pushHistory();
  if (ui.specialView) {
    renderSidebar();
    renderTaskView();
    renderTopbar();
    return;
  }
  const card = cardEl(item.id);
  const list = card && $('.todo-list', card);
  if (list) renderTodoRows(list, item);
  renderSidebar();
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
  const inTrash = state.trash.some(entry => entry.kind === 'board' && entry.board.id === item.boardId);
  const body = document.createElement('div');
  body.className = 'board-card-body';

  const emoji = document.createElement('div');
  emoji.className = 'board-card-emoji';
  emoji.textContent = target ? target.emoji : '❓';

  const name = document.createElement('div');
  name.className = 'board-card-name';
  name.textContent = target ? target.name : inTrash ? 'Board in Trash' : 'Missing board';

  const meta = document.createElement('div');
  meta.className = 'board-card-meta';
  meta.textContent = target ? target.items.length + (target.items.length === 1 ? ' card' : ' cards') : inTrash ? 'Restore it from Trash' : 'This board was deleted';

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

/**
 * Builds the table card with editable headers, cells, and a totals row.
 */
function buildTable(el, item) {
  normalizeTable(item);
  const body = document.createElement('div');
  body.className = 'table-body';
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  const actions = document.createElement('div');
  actions.className = 'table-actions';
  body.append(scroll, actions);
  el.append(body);
  renderTableGrid(scroll, actions, item);
}

/**
 * Rebuilds the table grid after a row or column change.
 */
function renderTableGrid(scroll, actions, item) {
  const table = item.table;
  scroll.innerHTML = '';
  const grid = document.createElement('table');
  grid.className = 'table-grid';

  // Header row with editable column names and per-column delete buttons.
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  table.cols.forEach((col, ci) => {
    const th = document.createElement('th');
    const label = document.createElement('div');
    label.className = 'table-cell table-head-cell';
    label.contentEditable = 'true';
    label.spellcheck = false;
    label.dataset.placeholder = 'Column';
    label.textContent = col.label;
    label.addEventListener('focus', () => pushHistory());
    label.addEventListener('blur', () => pushHistory());
    label.addEventListener('input', () => {
      col.label = label.innerText;
      saveSoon();
    });
    th.append(label);

    const del = document.createElement('button');
    del.className = 'table-col-del';
    del.type = 'button';
    del.title = 'Delete column';
    del.setAttribute('aria-label', 'Delete column');
    del.innerHTML = icon('x', 11);
    del.addEventListener('pointerdown', e => e.stopPropagation());
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (table.cols.length <= 1) {
        toast('A table needs at least one column');
        return;
      }
      pushHistory();
      table.cols.splice(ci, 1);
      table.rows.forEach(row => row.cells.splice(ci, 1));
      saveSoon();
      renderTableGrid(scroll, actions, item);
      pushHistory();
    });
    th.append(del);
    headRow.append(th);
  });
  const headGutter = document.createElement('th');
  headGutter.className = 'table-gutter';
  headRow.append(headGutter);
  thead.append(headRow);

  // Body rows: one editable cell per column plus a hover delete gutter.
  const tbody = document.createElement('tbody');
  table.rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    table.cols.forEach((col, ci) => {
      const td = document.createElement('td');
      const cell = document.createElement('div');
      cell.className = 'table-cell';
      cell.contentEditable = 'true';
      cell.spellcheck = false;
      cell.dataset.row = String(ri);
      cell.dataset.col = String(ci);
      cell.textContent = row.cells[ci] || '';
      cell.addEventListener('focus', () => pushHistory());
      cell.addEventListener('blur', () => pushHistory());
      cell.addEventListener('input', () => {
        row.cells[ci] = cell.innerText;
        saveSoon();
        refreshTableSums(grid, item);
      });
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const below = grid.querySelector(`.table-cell[data-row="${ri + 1}"][data-col="${ci}"]`);
          if (below) focusEditable(below);
          else addTableRow(scroll, actions, item, ci);
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          const flat = $$('.table-cell[data-row]', grid);
          const at = flat.indexOf(cell);
          const target = flat[at + (e.shiftKey ? -1 : 1)];
          if (target) focusEditable(target);
          else if (!e.shiftKey) addTableRow(scroll, actions, item, 0);
        }
      });
      td.append(cell);
      tr.append(td);
    });

    const gutter = document.createElement('td');
    gutter.className = 'table-gutter';
    const del = document.createElement('button');
    del.className = 'table-row-del';
    del.type = 'button';
    del.title = 'Delete row';
    del.setAttribute('aria-label', 'Delete row');
    del.innerHTML = icon('x', 11);
    del.addEventListener('pointerdown', e => e.stopPropagation());
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (table.rows.length <= 1) {
        toast('A table needs at least one row');
        return;
      }
      pushHistory();
      table.rows.splice(ri, 1);
      saveSoon();
      renderTableGrid(scroll, actions, item);
      pushHistory();
    });
    gutter.append(del);
    tr.append(gutter);
    tbody.append(tr);
  });

  // Summary row: sum and average for every column holding numbers.
  const tfoot = document.createElement('tfoot');
  const footRow = document.createElement('tr');
  table.cols.forEach((col, ci) => {
    const td = document.createElement('td');
    td.className = 'table-sum';
    td.dataset.sumCol = String(ci);
    footRow.append(td);
  });
  const footGutter = document.createElement('td');
  footGutter.className = 'table-gutter';
  footRow.append(footGutter);
  tfoot.append(footRow);

  grid.append(thead, tbody, tfoot);
  scroll.append(grid);
  refreshTableSums(grid, item);
  renderTableActions(actions, scroll, item);
}

/**
 * Appends a row to the table and optionally focuses one of its cells.
 */
function addTableRow(scroll, actions, item, focusCol) {
  pushHistory();
  item.table.rows.push({ id: uid('row'), cells: item.table.cols.map(() => '') });
  saveSoon();
  renderTableGrid(scroll, actions, item);
  pushHistory();
  if (Number.isInteger(focusCol)) {
    const target = scroll.querySelector(
      `.table-cell[data-row="${item.table.rows.length - 1}"][data-col="${focusCol}"]`
    );
    if (target) focusEditable(target);
  }
}

/**
 * Recomputes the sum and average cells without rebuilding the table.
 */
function refreshTableSums(grid, item) {
  item.table.cols.forEach((col, ci) => {
    const cell = grid.querySelector(`.table-sum[data-sum-col="${ci}"]`);
    if (!cell) return;
    let sum = 0;
    let count = 0;
    item.table.rows.forEach(row => {
      const n = cellNumber(row.cells[ci]);
      if (n !== null) {
        sum += n;
        count += 1;
      }
    });
    if (!count) {
      cell.textContent = '';
      cell.title = 'Type numbers in this column to see a total';
      return;
    }
    cell.textContent = 'Σ ' + formatNumber(sum) + '  ⌀ ' + formatNumber(sum / count);
    cell.title = 'Sum ' + formatNumber(sum) + ' · Average ' + formatNumber(sum / count) +
      ' · ' + count + (count === 1 ? ' number' : ' numbers');
  });
}

/**
 * Builds the add-row and add-column controls under a table.
 */
function renderTableActions(actions, scroll, item) {
  actions.innerHTML = '';
  const addRow = document.createElement('button');
  addRow.className = 'table-add';
  addRow.type = 'button';
  addRow.textContent = '+ Row';
  addRow.addEventListener('pointerdown', e => e.stopPropagation());
  addRow.addEventListener('click', e => {
    e.stopPropagation();
    addTableRow(scroll, actions, item, 0);
  });

  const addCol = document.createElement('button');
  addCol.className = 'table-add';
  addCol.type = 'button';
  addCol.textContent = '+ Column';
  addCol.addEventListener('pointerdown', e => e.stopPropagation());
  addCol.addEventListener('click', e => {
    e.stopPropagation();
    pushHistory();
    item.table.cols.push({ id: uid('col'), label: 'Column ' + (item.table.cols.length + 1) });
    item.table.rows.forEach(row => row.cells.push(''));
    saveSoon();
    renderTableGrid(scroll, actions, item);
    pushHistory();
  });

  const hint = document.createElement('span');
  hint.className = 'table-hint';
  hint.textContent = 'Totals update automatically';

  actions.append(addRow, addCol, hint);
}

/**
 * Builds the file card: inline preview for PDFs and MP4s plus metadata.
 */
function buildFile(el, item) {
  const file = item.file;
  const isVideo = !!(file && (file.mime || '').startsWith('video/'));
  const body = document.createElement('div');
  body.className = 'file-body';

  const stage = document.createElement('div');
  stage.className = 'file-stage';
  const url = file ? fileObjectUrl(item) : '';

  if (!file || !url) {
    stage.classList.add('file-stage-empty');
    const missing = document.createElement('div');
    missing.className = 'file-missing';
    missing.innerHTML = icon('file', 26);
    const note = document.createElement('span');
    note.textContent = file ? 'Preview unavailable' : 'File unavailable';
    missing.append(note);
    stage.append(missing);
  } else if (isVideo) {
    const video = document.createElement('video');
    video.className = 'file-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    stage.append(video);
  } else {
    const frame = document.createElement('iframe');
    frame.className = 'file-frame';
    frame.title = file.name;
    frame.src = url + '#toolbar=0&navpanes=0&view=FitH';
    stage.append(frame);
  }

  const meta = document.createElement('div');
  meta.className = 'file-meta';

  const badge = document.createElement('span');
  badge.className = 'file-badge' + (isVideo ? ' is-video' : '');
  badge.textContent = isVideo ? 'MP4' : 'PDF';

  const info = document.createElement('div');
  info.className = 'file-info';
  const name = document.createElement('div');
  name.className = 'file-name';
  name.textContent = file ? file.name : 'Missing file';
  name.title = file ? file.name : '';
  const size = document.createElement('div');
  size.className = 'file-size';
  size.textContent = file
    ? [isVideo ? 'MP4 video' : 'PDF document', formatBytes(file.size)].filter(Boolean).join(' · ')
    : 'Add the file again';
  info.append(name, size);
  meta.append(badge, info);

  if (file) {
    const open = document.createElement('button');
    open.className = 'file-open';
    open.type = 'button';
    open.title = 'Open in a new tab';
    open.innerHTML = 'Open ' + icon('external', 11);
    open.addEventListener('pointerdown', e => e.stopPropagation());
    open.addEventListener('click', e => {
      e.stopPropagation();
      const target = fileObjectUrl(item);
      if (target) window.open(target, '_blank');
      else toast('Could not open this file', 'error');
    });
    meta.append(open);
  }

  body.append(stage, meta);
  el.append(body);
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
  if (ui.pinch || ui.touchPointers.size > 1) return;
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
  const minW = r.item.type === 'note' ? 170
    : r.item.type === 'board' ? 180
    : r.item.type === 'table' ? 240
    : 200;
  const minH = r.item.type === 'todo' ? 140
    : r.item.type === 'image' ? 150
    : r.item.type === 'table' ? 190
    : 110;
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
 * Cancels any drag, resize, or pan that was running before a pinch started.
 * Cards stay where they were moved instead of jumping back.
 */
function cancelCanvasGestures() {
  if (ui.drag) {
    window.removeEventListener('pointermove', onDragMove);
    const d = ui.drag;
    ui.drag = null;
    d.entries.forEach(entry => {
      if (entry.el) {
        entry.el.classList.remove('dragging');
        entry.el.style.zIndex = String(entry.z || 1);
      }
    });
    renderConnections();
    saveSoon();
  }
  if (ui.resize) {
    window.removeEventListener('pointermove', onResizeMove);
    ui.resize = null;
    saveSoon();
  }
  if (ui.pan) {
    window.removeEventListener('pointermove', onPanMove);
    ui.pan = null;
    $('#canvasWrap').classList.remove('panning');
    saveSoon();
  }
}

/**
 * Measures the distance and midpoint between the first two touches.
 */
function touchMetrics() {
  const points = Array.from(ui.touchPointers.values());
  const a = points[0];
  const b = points[1];
  return {
    dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
    midX: (a.x + b.x) / 2,
    midY: (a.y + b.y) / 2
  };
}

/**
 * Starts a pinch gesture anchored on the world point under the fingers.
 */
function startPinch() {
  cancelCanvasGestures();
  const rect = $('#canvasWrap').getBoundingClientRect();
  const v = getView();
  const m = touchMetrics();
  ui.pinch = {
    dist: m.dist,
    zoom: v.z,
    worldX: (m.midX - rect.left - v.x) / v.z,
    worldY: (m.midY - rect.top - v.y) / v.z
  };
  ui.touchPinched = true;
  ui.lastTap = null;
  document.body.classList.add('pinching');
}

/**
 * Clears touch gesture state, for example when the window loses focus.
 */
function resetTouchState() {
  ui.touchPointers.clear();
  ui.pinch = null;
  ui.touchPinched = false;
  ui.lastTap = null;
  document.body.classList.remove('pinching');
}

/**
 * Tracks touch points so two fingers can pinch the canvas.
 */
function onTouchPointerDown(e) {
  if (e.pointerType !== 'touch') return;
  // A fresh primary touch means any older, missed pointers are stale.
  if (e.isPrimary) {
    ui.touchPointers.clear();
    ui.pinch = null;
    ui.touchPinched = false;
    document.body.classList.remove('pinching');
  }
  // Gestures that start on floating controls should press the control, not zoom.
  if (e.target.closest && e.target.closest('.toolbar, .zoombar, .canvas-hint, .empty-state')) return;
  const interactive = !!(e.target.closest && e.target.closest(
    '.card, button, a, input, textarea, select, [contenteditable]'
  ));
  ui.touchPointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    interactive
  });
  // Mention the touch gestures once per browser session.
  if (!ui.touchHintShown) {
    ui.touchHintShown = true;
    try {
      if (!sessionStorage.getItem('ubernotes.touchHint')) {
        sessionStorage.setItem('ubernotes.touchHint', '1');
        toast('Pinch to zoom · double-tap to zoom in');
      }
    } catch (err) {
      toast('Pinch to zoom · double-tap to zoom in');
    }
  }
  if (ui.touchPointers.size === 2) startPinch();
}

/**
 * Scales and pans the canvas while two fingers move.
 */
function onTouchPointerMove(e) {
  const point = ui.touchPointers.get(e.pointerId);
  if (!point) return;
  point.x = e.clientX;
  point.y = e.clientY;
  if (Math.hypot(point.x - point.startX, point.y - point.startY) > 10) point.moved = true;
  if (!ui.pinch || ui.touchPointers.size < 2) return;
  // Keep the normal drag and pan handlers from reacting to each finger.
  e.preventDefault();
  e.stopPropagation();
  const rect = $('#canvasWrap').getBoundingClientRect();
  const v = getView();
  const m = touchMetrics();
  const nz = clamp(ui.pinch.zoom * (m.dist / ui.pinch.dist), MIN_ZOOM, MAX_ZOOM);
  v.z = nz;
  v.x = m.midX - rect.left - ui.pinch.worldX * nz;
  v.y = m.midY - rect.top - ui.pinch.worldY * nz;
  applyView();
}

/**
 * Finishes a pinch and turns a quick double-tap into a zoom.
 */
function onTouchPointerUp(e) {
  const point = ui.touchPointers.get(e.pointerId);
  if (!point) return;
  ui.touchPointers.delete(e.pointerId);
  if (ui.pinch && ui.touchPointers.size < 2) {
    ui.pinch = null;
    document.body.classList.remove('pinching');
    saveSoon();
  }
  if (ui.touchPointers.size) return;
  const pinched = ui.touchPinched;
  ui.touchPinched = false;
  if (pinched || point.interactive || point.moved || e.type !== 'pointerup') {
    ui.lastTap = null;
    return;
  }
  handleDoubleTap(e.clientX, e.clientY);
}

/**
 * Zooms in on the tapped point when the canvas is double-tapped.
 */
function handleDoubleTap(clientX, clientY) {
  const now = Date.now();
  const last = ui.lastTap;
  ui.lastTap = { time: now, x: clientX, y: clientY };
  if (!last || now - last.time > 320 || Math.hypot(clientX - last.x, clientY - last.y) > 30) return;
  ui.lastTap = null;
  const v = getView();
  // Toggle between a readable 100% and a closer 200% view.
  const target = v.z < 0.95 ? 1 : v.z < 1.9 ? 2 : 1;
  zoomAt(clientX, clientY, target / v.z);
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
  if (e.target.closest && e.target.closest('.task-view')) return;
  // Let the table grid scroll natively instead of panning the canvas.
  if (!e.ctrlKey && !e.metaKey && e.target.closest &&
      e.target.closest('.table-scroll')) return;
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
 * Adds a captured note or link to the current board.
 */
function addCapturedCard(type, content) {
  const size = SIZES[type];
  const pos = centerWorld(size.w, size.h);
  pushHistory();
  const item = createItem(type, pos.x, pos.y, content);
  currentBoard().items.push(item);
  ui.selected = new Set([item.id]);
  ui.selectedConnection = null;
  saveSoon();
  renderBoard();
  renderSidebar();
  pushHistory();
  toast(type === 'link' ? 'Link captured' : 'Note captured');
}

/**
 * Opens a focused, keyboard-friendly dialog for capturing a note.
 */
function openQuickCapture() {
  function capture(dlg) {
    const input = $('#quickCaptureInput', dlg || $('#modal'));
    const text = input.value;
    if (!text.trim()) {
      input.classList.add('invalid');
      input.focus();
      return;
    }
    closeModal();
    addCapturedCard('note', { text });
  }

  openModal({
    title: 'Quick capture',
    subtitle: 'Save a thought to ' + currentBoard().name + '.',
    width: 500,
    body: `
      <label class="field quick-capture-field">
        <span>Your thought</span>
        <textarea class="input quick-capture-input" id="quickCaptureInput" placeholder="Type or paste anything…" rows="5"></textarea>
      </label>`,
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: 'Capture note', kind: 'primary', onClick: capture }
    ],
    onMount: dlg => {
      const input = $('#quickCaptureInput', dlg);
      input.focus();
      input.addEventListener('input', () => input.classList.remove('invalid'));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          capture(dlg);
        }
      });
    }
  });
}

/**
 * Normalizes a pasted URL, including bare domains, to a safe HTTP(S) URL.
 */
function normalizePastedUrl(value) {
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate)) return null;
  let url = candidate;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    if (!/^(?:www\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i.test(url)) {
      return null;
    }
    url = 'https://' + url;
  }
  return safeUrl(url);
}

/**
 * Extracts plain text or a single copied hyperlink and creates the matching card.
 */
function captureClipboard(data) {
  let text = data.getData('text/plain') || '';
  let link = null;
  const pastedUrl = normalizePastedUrl(text);
  if (pastedUrl) {
    link = { url: pastedUrl, title: hostOf(pastedUrl) || pastedUrl };
  } else {
    const html = data.getData('text/html');
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a[href]'));
      if (anchors.length === 1) {
        const anchorText = (anchors[0].textContent || '').trim();
        const url = safeUrl(anchors[0].getAttribute('href'));
        if (url && (!text.trim() || text.trim() === anchorText)) {
          link = { url, title: anchorText || hostOf(url) || url };
        }
      }
      if (!text.trim()) text = doc.body.textContent || '';
    }
  }

  if (link) {
    addCapturedCard('link', { url: link.url, title: link.title, description: '' });
  } else if (text.trim()) {
    addCapturedCard('note', { text });
  } else {
    return false;
  }
  return true;
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
  if (type === 'file') {
    ui.filePoint = null;
    $('#fileInput').click();
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
      : type === 'table'
        ? { table: defaultTable() }
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
  const removed = board.items.filter(item => ui.selected.has(item.id));
  removed.forEach(item => {
    state.trash.push({
      id: uid('trash'),
      kind: 'card',
      deletedAt: Date.now(),
      boardId: board.id,
      item: deepClone(item),
      connections: deepClone(board.connections.filter(conn => conn.from === item.id || conn.to === item.id))
    });
  });
  board.items = board.items.filter(item => !ui.selected.has(item.id));
  board.connections = board.connections.filter(c => !ui.selected.has(c.from) && !ui.selected.has(c.to));
  ui.selected.clear();
  saveSoon();
  renderBoard();
  renderSidebar();
  pushHistory();
  toast(count === 1 ? 'Card moved to Trash' : 'Cards moved to Trash');
}

function restoreTrashEntry(id) {
  const index = state.trash.findIndex(entry => entry.id === id);
  if (index < 0) return;
  const entry = state.trash[index];
  const taskBoard = entry.kind === 'task' ? boardById(entry.boardId) : null;
  const taskCard = taskBoard && taskBoard.items.find(item => item.id === entry.itemId && item.type === 'todo');
  if (entry.kind === 'task' && !taskCard) {
    toast('Restore the original board and to-do card first', 'error');
    return;
  }
  if (entry.kind === 'board' && state.boards.some(board => board.id === entry.board.id)) {
    toast('A board with that ID already exists', 'error');
    return;
  }
  pushHistory();
  if (entry.kind === 'board') {
    state.boards.push(entry.board);
    if (entry.view) state.views[entry.board.id] = entry.view;
  } else if (entry.kind === 'task') {
    const todo = deepClone(entry.todo);
    if (taskCard.todos.some(existing => existing.id === todo.id)) todo.id = uid('t');
    taskCard.todos.splice(Math.min(entry.index, taskCard.todos.length), 0, todo);
  } else {
    const board = boardById(entry.boardId) || currentBoard();
    const item = deepClone(entry.item);
    const oldId = item.id;
    if (board.items.some(existing => existing.id === item.id)) item.id = uid('i');
    item.z = board.items.reduce((z, existing) => Math.max(z, existing.z || 0), 0) + 1;
    board.items.push(item);
    const restoredIds = new Set(board.items.map(existing => existing.id));
    entry.connections.forEach(conn => {
      const restored = deepClone(conn);
      if (restored.from === oldId) restored.from = item.id;
      if (restored.to === oldId) restored.to = item.id;
      if (restoredIds.has(restored.from) && restoredIds.has(restored.to) &&
          !board.connections.some(existing => existing.from === restored.from && existing.to === restored.to)) {
        board.connections.push(restored);
      }
    });
  }
  state.trash.splice(index, 1);
  saveSoon();
  renderAll();
  pushHistory();
  toast('Item restored');
}

function permanentlyDeleteTrashEntry(id) {
  const entry = state.trash.find(candidate => candidate.id === id);
  if (!entry) return;
  confirmModal('Delete permanently?', 'This cannot be undone.', () => {
    pushHistory();
    removeTrashEntry(entry);
    renderAll();
    saveSoon();
    pushHistory();
    toast('Deleted permanently');
  }, 'Delete forever');
}

function removeTrashEntry(entry) {
  if (entry.kind === 'card') {
    forgetFileUrl(entry.item.id);
  } else if (entry.kind === 'board') {
    const removedIds = new Set(entry.board.items.map(item => item.id));
    entry.board.items.forEach(item => {
      if (item.type === 'file') forgetFileUrl(item.id);
    });
    state.boards.forEach(board => {
      board.items = board.items.filter(item => !(item.type === 'board' && item.boardId === entry.board.id));
      board.connections = board.connections.filter(conn =>
        !removedIds.has(conn.from) && !removedIds.has(conn.to) &&
        board.items.some(item => item.id === conn.from) && board.items.some(item => item.id === conn.to)
      );
    });
    delete state.views[entry.board.id];
  }
  state.trash = state.trash.filter(candidate => candidate.id !== entry.id);
}

function emptyTrash() {
  confirmModal('Empty Trash?', 'All deleted cards and boards will be permanently removed.', () => {
    pushHistory();
    state.trash.slice().forEach(removeTrashEntry);
    state.trash = [];
    saveSoon();
    renderAll();
    pushHistory();
    toast('Trash emptied');
  }, 'Empty Trash');
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
    if (copy.type === 'table' && copy.table) {
      copy.table.cols.forEach(col => { col.id = uid('col'); });
      copy.table.rows.forEach(row => { row.id = uid('row'); });
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

function openTransferModal(mode, item) {
  const source = currentBoard();
  const selectedIds = ui.selected.has(item.id) ? Array.from(ui.selected) : [item.id];
  const targets = state.boards.filter(board => board.id !== source.id);
  if (!targets.length) {
    toast('Create another board first');
    return;
  }
  const dlg = openModal({
    title: mode === 'move' ? 'Move to board' : 'Copy to board',
    subtitle: selectedIds.length === 1
      ? 'Choose where to ' + mode + ' this card.'
      : 'Choose where to ' + mode + ' these ' + selectedIds.length + ' cards.',
    body: '<label class="field"><span>Destination board</span><select class="input" id="transferBoardSelect"></select></label>',
    footer: [
      { label: 'Cancel', kind: 'ghost', onClick: closeModal },
      { label: mode === 'move' ? 'Move cards' : 'Copy cards', kind: 'primary', onClick: transfer }
    ],
    onMount: root => {
      const select = $('#transferBoardSelect', root);
      targets.forEach(board => {
        const option = document.createElement('option');
        option.value = board.id;
        option.textContent = board.emoji + ' ' + board.name;
        select.append(option);
      });
      select.focus();
    }
  });

  function transfer() {
    const target = boardById($('#transferBoardSelect', dlg).value);
    if (!target || target.id === source.id) return;
    const moving = source.items.filter(candidate => selectedIds.includes(candidate.id));
    if (!moving.length) { closeModal(); return; }
    pushHistory();
    const idMap = new Map();
    let z = target.items.reduce((max, candidate) => Math.max(max, candidate.z || 0), 0);
    const copies = moving.map(original => {
      const copy = mode === 'move' ? original : deepClone(original);
      if (mode === 'copy') {
        copy.id = uid('i');
        if (copy.type === 'todo') copy.todos.forEach(todo => { todo.id = uid('t'); });
        if (copy.type === 'table' && copy.table) {
          copy.table.cols.forEach(col => { col.id = uid('col'); });
          copy.table.rows.forEach(row => { row.id = uid('row'); });
        }
        copy.x += 26;
        copy.y += 26;
      }
      copy.z = ++z;
      idMap.set(original.id, copy.id);
      return copy;
    });
    const selected = new Set(moving.map(candidate => candidate.id));
    const internalConnections = source.connections.filter(conn =>
      selected.has(conn.from) && selected.has(conn.to)
    );
    if (mode === 'move') {
      source.items = source.items.filter(candidate => !selected.has(candidate.id));
      source.connections = source.connections.filter(conn =>
        !selected.has(conn.from) && !selected.has(conn.to)
      );
    }
    target.items.push(...copies);
    internalConnections.forEach(conn => {
      const from = idMap.get(conn.from);
      const to = idMap.get(conn.to);
      if (from && to) target.connections.push({ id: uid('c'), from, to });
    });
    ui.selected.clear();
    ui.selectedConnection = null;
    closeModal();
    saveSoon();
    openBoard(target.id);
    ui.selected = new Set(copies.map(copy => copy.id));
    renderAll();
    pushHistory();
    toast(mode === 'move' ? 'Cards moved' : 'Cards copied');
  }
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

/**
 * Adds one or more PDF or MP4 files as cards at an optional world point.
 */
async function handleFileFiles(files, point) {
  const valid = Array.from(files).filter(isSupportedFile);
  if (!valid.length) {
    toast('Only PDF and MP4 files can be added here', 'error');
    return;
  }
  const usable = valid.filter(file => file.size <= MAX_FILE_BYTES);
  const tooBig = valid.filter(file => file.size > MAX_FILE_BYTES);
  if (tooBig.length) {
    toast(
      tooBig[0].name + ' is too large. Files live in this browser, so the limit is ' +
      formatBytes(MAX_FILE_BYTES) + '.',
      'error'
    );
  }
  if (!usable.length) return;
  toast(usable.length > 1 ? 'Adding ' + usable.length + ' files…' : 'Adding file…');
  const board = currentBoard();
  let offset = 0;
  for (const file of usable) {
    try {
      const data = await readFileAsDataURL(file);
      const w = SIZES.file.w;
      const h = SIZES.file.h;
      const base = point
        ? { x: point.x - w / 2, y: point.y - h / 2 }
        : centerWorld(w, h);
      pushHistory();
      const item = createItem('file', base.x + offset, base.y + offset, {
        w,
        h,
        file: {
          name: file.name || 'File',
          mime: file.type || '',
          size: file.size || 0,
          data
        }
      });
      board.items.push(item);
      ui.selected = new Set([item.id]);
      ui.selectedConnection = null;
      // Saving immediately lets us roll back when the file does not fit.
      if (!saveNow()) {
        board.items = board.items.filter(other => other.id !== item.id);
        ui.selected.clear();
        renderBoard();
        renderSidebar();
        toast(file.name + ' did not fit in local storage. Try a smaller file.', 'error');
        continue;
      }
      renderBoard();
      renderSidebar();
      pushHistory();
      offset += 26;
    } catch (err) {
      console.error('File failed', err);
      toast('Could not add that file', 'error');
    }
  }
}

/* ---------------- search palette ---------------- */

/**
 * Returns the human-readable label for a card type.
 */
function typeLabel(type) {
  return {
    note: 'Note', todo: 'To-do', link: 'Link', image: 'Image',
    board: 'Board', table: 'Table', file: 'File'
  }[type] || 'Card';
}

/**
 * Collects the searchable text from a card.
 */
function itemSearchText(item) {
  if (item.type === 'note') return item.text || '';
  if (item.type === 'todo') return [item.title || ''].concat((item.todos || []).map(t => t.text)).join(' ');
  if (item.type === 'link') return [item.title, item.description, item.url].join(' ');
  if (item.type === 'image') return item.caption || '';
  if (item.type === 'table' && item.table) {
    const labels = item.table.cols.map(col => col.label);
    const cells = item.table.rows.reduce((all, row) => all.concat(row.cells), []);
    return labels.concat(cells).join(' ');
  }
  if (item.type === 'file') return item.file ? item.file.name : '';
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
    ['Open Today / Overdue / Trash', 'Sidebar'],
    ['Quick capture', '⌘⇧Space'],
    ['Add a note', 'N'],
    ['Add a to-do', 'T'],
    ['Add an image', 'I'],
    ['Add a link', 'L'],
    ['Add a board', 'B'],
    ['Add a table', 'G'],
    ['Add a PDF or MP4', 'F'],
    ['Search everything', '⌘K'],
    ['Undo / redo', '⌘Z / ⇧⌘Z'],
    ['Duplicate card', '⌘D'],
    ['Delete selection', 'Del'],
    ['Fit to content', '⌘0'],
    ['Zoom in / out', '⌘+ / ⌘−'],
    ['Zoom on touch', 'Pinch / double-tap'],
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

/* ---------------- appearance ---------------- */

/**
 * Opens the Themes dialog with Styles and Fonts tabs.
 */
function openThemesModal() {
  const themes = [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' }
  ];
  const c = state.customTheme || DEFAULT_CUSTOM_THEME;
  const body = `
    <div class="theme-tabs" role="tablist" aria-label="Appearance">
      <button class="theme-tab" type="button" role="tab" data-tab="styles" aria-selected="true">Styles</button>
      <button class="theme-tab" type="button" role="tab" data-tab="fonts" aria-selected="false">Fonts</button>
    </div>
    <div class="theme-panel" data-panel="styles" role="tabpanel">
      <p class="theme-note">Pick a look for your workspace.</p>
      <div class="style-grid">
        ${themes.map(t => `
          <button class="style-option" type="button" data-theme-choice="${t.id}" aria-pressed="false">
            <span class="style-swatch style-swatch-${t.id}" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="style-name">${t.name}</span>
            <span class="style-check" aria-hidden="true">${icon('check', 15)}</span>
          </button>`).join('')}
      </div>
      <button class="style-option style-option-wide" type="button" data-theme-choice="custom" aria-pressed="false">
        <span class="custom-stripes" aria-hidden="true">
          <i data-stripe="bg"></i><i data-stripe="surface"></i><i data-stripe="text"></i><i data-stripe="accent"></i>
        </span>
        <span class="style-name">Custom</span>
        <span class="style-check" aria-hidden="true">${icon('check', 15)}</span>
      </button>
      <div class="custom-editor" hidden>
        <div class="custom-editor-head">
          <span>Custom colors</span>
          <button class="custom-reset" type="button">Reset</button>
        </div>
        <div class="custom-grid">
          ${[
            ['bg', 'Background'],
            ['accent', 'Accent']
          ].map(([key, label]) => `
            <label class="custom-field">
              <span>${label}</span>
              <input type="color" data-custom="${key}" value="${c[key]}" aria-label="${label} color">
            </label>`).join('')}
        </div>
        <p class="field-hint custom-hint">Panels and text adjust automatically for readability.</p>
      </div>
    </div>
    <div class="theme-panel" data-panel="fonts" role="tabpanel" hidden>
      <p class="theme-note">Choose the typeface used across the app.</p>
      <div class="font-list">
        ${FONTS.map(f => `
          <button class="font-option" type="button" data-font-choice="${f.id}" aria-pressed="false">
            <span class="font-sample font-sample-${f.id}" aria-hidden="true">Aa</span>
            <span class="font-meta">
              <span class="font-name">${f.name}</span>
              <span class="font-desc">${f.desc}</span>
            </span>
            <span class="font-check" aria-hidden="true">${icon('check', 15)}</span>
          </button>`).join('')}
      </div>
    </div>`;
  openModal({
    title: 'Themes',
    subtitle: 'Make UberNotes feel like yours.',
    width: 480,
    body,
    footer: [{ label: 'Done', kind: 'primary', onClick: closeModal }],
    onMount: dlg => {
      const editor = $('.custom-editor', dlg);
      const colorInputs = $$('[data-custom]', dlg);
      // Paints the Custom row's color stripes from the current palette.
      const paintStripes = () => {
        const palette = state.customTheme || DEFAULT_CUSTOM_THEME;
        const derived = customPalette(palette);
        const colors = {
          bg: palette.bg,
          surface: derived.surface,
          text: derived.text,
          accent: palette.accent
        };
        $$('[data-stripe]', dlg).forEach(stripe => {
          stripe.style.background = colors[stripe.dataset.stripe];
        });
      };
      // Marks the active theme and font choices, and reveals the editor.
      const sync = () => {
        $$('.style-option', dlg).forEach(btn => {
          const on = btn.dataset.themeChoice === state.theme;
          btn.classList.toggle('is-selected', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $$('.font-option', dlg).forEach(btn => {
          const on = btn.dataset.fontChoice === (state.font || 'sans');
          btn.classList.toggle('is-selected', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        editor.hidden = state.theme !== 'custom';
        paintStripes();
      };
      // Shows one tab panel and hides the other.
      const showTab = name => {
        $$('.theme-tab', dlg).forEach(tab => {
          const on = tab.dataset.tab === name;
          tab.classList.toggle('is-active', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $$('.theme-panel', dlg).forEach(panel => {
          panel.hidden = panel.dataset.panel !== name;
        });
      };
      $$('.theme-tab', dlg).forEach(tab => {
        tab.addEventListener('click', () => showTab(tab.dataset.tab));
      });
      $$('.style-option', dlg).forEach(btn => {
        btn.addEventListener('click', () => { setTheme(btn.dataset.themeChoice); sync(); });
      });
      $$('.font-option', dlg).forEach(btn => {
        btn.addEventListener('click', () => { setFont(btn.dataset.fontChoice); sync(); });
      });
      // Editing any color applies it live and switches to the custom theme.
      colorInputs.forEach(input => {
        input.addEventListener('input', () => {
          state.customTheme = {
            ...(state.customTheme || DEFAULT_CUSTOM_THEME),
            [input.dataset.custom]: input.value
          };
          state.theme = 'custom';
          applyTheme();
          saveSoon();
          sync();
        });
      });
      // Restores the starting palette.
      $('.custom-reset', dlg).addEventListener('click', () => {
        state.customTheme = { ...DEFAULT_CUSTOM_THEME };
        state.theme = 'custom';
        colorInputs.forEach(input => { input.value = state.customTheme[input.dataset.custom]; });
        applyTheme();
        saveSoon();
        sync();
      });
      showTab('styles');
      sync();
    }
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
        applyFont();
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
  if (ui.pinch || ui.touchPointers.size > 1) return;
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
  if (mod && e.shiftKey && e.code === 'Space') {
    e.preventDefault();
    openQuickCapture();
    return;
  }
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
    else if (key === 'g') { e.preventDefault(); addItem('table'); }
    else if (key === 'f') { e.preventDefault(); addItem('file'); }
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
  const data = e.clipboardData;
  if (!data) return;
  const files = Array.from(data.files || []);
  const images = files.filter(file => file.type.startsWith('image/'));
  const documents = files.filter(isSupportedFile);
  if (images.length || documents.length) {
    e.preventDefault();
    if (images.length) handleImageFiles(images);
    if (documents.length) handleFileFiles(documents);
    return;
  }
  if (captureClipboard(data)) e.preventDefault();
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
  $('#themeBtn').addEventListener('click', openThemesModal);
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
  $('#fileInput').addEventListener('change', e => {
    const files = e.target.files;
    if (files && files.length) {
      ui.filePoint = null;
      handleFileFiles(files);
    }
    e.target.value = '';
  });

  $('#backBtn').addEventListener('click', goBack);
  $('#quickCaptureBtn').addEventListener('click', openQuickCapture);
  // Right-clicking the board name opens the board options menu; left-click
  // still focuses the field for inline renaming.
  $('#boardTitle').addEventListener('contextmenu', e => {
    if (ui.specialView) return;
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
  // Touch gestures run in the capture phase so two fingers always win over
  // a card drag or a canvas pan that the first finger started.
  wrap.addEventListener('pointerdown', onTouchPointerDown, { capture: true });
  window.addEventListener('pointermove', onTouchPointerMove, { capture: true, passive: false });
  window.addEventListener('pointerup', onTouchPointerUp, { capture: true });
  window.addEventListener('pointercancel', onTouchPointerUp, { capture: true });
  window.addEventListener('blur', resetTouchState);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetTouchState();
  });
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
    e.preventDefault();
    const list = Array.from(files);
    const images = list.filter(file => file.type.startsWith('image/'));
    const docs = list.filter(isSupportedFile);
    if (!images.length && !docs.length) {
      toast('Only images, PDFs, and MP4 files can be dropped here', 'error');
      return;
    }
    const point = screenToWorld(e.clientX, e.clientY);
    if (images.length) {
      ui.imagePoint = point;
      handleImageFiles(images, point);
    }
    if (docs.length) {
      ui.filePoint = point;
      handleFileFiles(docs, point);
    }
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
  applyFont();
  window.addEventListener('pagehide', e => {
    if (!e.persisted) releaseFileUrls();
  });
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
  if (item.type === 'file' && item.file) {
    addMenuAction(menu, 'external', 'Open file', () => {
      closeMenu();
      const url = fileObjectUrl(item);
      if (url) window.open(url, '_blank');
      else toast('Could not open this file', 'error');
    });
    addMenuAction(menu, 'download', 'Download file', () => {
      closeMenu();
      const url = fileObjectUrl(item);
      if (!url) {
        toast('Could not download this file', 'error');
        return;
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file.name || 'file';
      document.body.append(link);
      link.click();
      link.remove();
    });
  }
  addMenuAction(menu, 'copy', 'Duplicate', () => {
    closeMenu();
    ui.selected = new Set([item.id]);
    ui.selectedConnection = null;
    duplicateSelection();
  }, { shortcut: '⌘D' });
  addMenuAction(menu, 'external', 'Move to board…', () => {
    closeMenu();
    openTransferModal('move', item);
  });
  addMenuAction(menu, 'copy', 'Copy to board…', () => {
    closeMenu();
    openTransferModal('copy', item);
  });
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
 * Moves a board to Trash after confirmation.
 */
function deleteBoard(board) {
  if (state.boards.length <= 1) {
    toast('You need at least one board');
    return;
  }
  confirmModal(
    'Delete “' + board.name + '”?',
    'The board and its cards will move to Trash, where you can restore them.',
    () => {
      pushHistory();
      state.trash.push({
        id: uid('trash'),
        kind: 'board',
        deletedAt: Date.now(),
        board: deepClone(board),
        view: state.views[board.id] ? deepClone(state.views[board.id]) : null
      });
      state.boards = state.boards.filter(b => b.id !== board.id);
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
      toast('Board moved to Trash');
    }
  );
}
