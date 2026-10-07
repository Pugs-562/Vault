// --- IndexedDB Operations ---
const DB_NAME = 'N64EmulatorDB';
const STORE_NAME = 'roms';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRomToDB(file) {
  const db = await openDB();
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = { name: file.name, buffer: buffer };
    const req = store.put(data, 'active_rom');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- UI Logic ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const screenUpload = document.getElementById('upload-screen');
const screenAccepted = document.getElementById('accepted-screen');
const screenHome = document.getElementById('home-screen');
const screenEmulator = document.getElementById('emulator-screen');
const btnPlay = document.getElementById('btn-play');
const emuFrame = document.getElementById('emulator-frame');

let currentTitle = "";

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) processFile(e.target.files[0]);
});

async function processFile(file) {
  currentTitle = file.name.replace(/\.[^.]+$/, "");
  
  document.getElementById('accepted-filename').innerText = file.name;
  document.getElementById('game-title').innerText = currentTitle;
  document.getElementById('active-game-title').innerText = currentTitle;

  // Persist raw binary into IndexedDB
  await saveRomToDB(file);

  switchScreen(screenAccepted);
  loadBoxArt(file.name);

  setTimeout(() => switchScreen(screenHome), 1200);
}

function switchScreen(activeScreen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  activeScreen.classList.add('active');
}

// --- Libretro Box Art Finder ---
async function loadBoxArt(filename) {
  const stem = filename.replace(/\.[^.]+$/, "");
  const base = stem.split(/[\(\[]/)[0].trim();
  const candidates = [stem, stem.replace(/_/g, " "), base, `${base} (USA)`, `${base} (Europe)`];

  const sysDir = "Nintendo - Nintendo 64";
  const cdn = "https://thumbnails.libretro.com";
  const urls = candidates.map(name => `${cdn}/${encodeURIComponent(sysDir)}/Named_Boxarts/${encodeURIComponent(name.replace(/[&*/:`<>?\\|"]/g, "_"))}.png`);

  for (const url of urls) {
    const success = await new Promise(res => { const img = new Image(); img.onload = ()=>res(true); img.onerror = ()=>res(false); img.src = url; });
    if (success) {
      const imgEl = document.getElementById('game-boxart');
      imgEl.src = url;
      imgEl.classList.remove('hidden');
      document.getElementById('boxart-fallback').classList.add('hidden');
      break;
    }
  }
}

// --- Launch Emulator Frame ---
btnPlay.addEventListener('click', () => {
  switchScreen(screenEmulator);
  // Point the iframe to emulator.html which reads the IndexedDB store
  emuFrame.src = 'emulator.html';
});

function exitEmulator() {
  emuFrame.src = 'about:blank';
  switchScreen(screenHome);
}
