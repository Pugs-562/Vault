// --- State Variables ---
let romFile = null;
let romUrl = null;
let currentTitle = "";

// --- DOM Elements ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const screenUpload = document.getElementById('upload-screen');
const screenAccepted = document.getElementById('accepted-screen');
const screenHome = document.getElementById('home-screen');
const screenEmulator = document.getElementById('emulator-screen');
const btnPlay = document.getElementById('btn-play');

// --- Event Listeners ---
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
});

function processFile(file) {
  if (romUrl) URL.revokeObjectURL(romUrl);
  
  romFile = file;
  romUrl = URL.createObjectURL(file);
  
  const filename = file.name;
  currentTitle = filename.replace(/\.[^.]+$/, "");
  
  document.getElementById('accepted-filename').innerText = filename;
  document.getElementById('game-title').innerText = currentTitle;
  document.getElementById('active-game-title').innerText = currentTitle;

  switchScreen(screenAccepted);
  loadBoxArt(filename);

  setTimeout(() => {
    switchScreen(screenHome);
  }, 1200);
}

function switchScreen(activeScreen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  activeScreen.classList.add('active');
}

// --- Libretro Box Art Search ---
async function loadBoxArt(filename) {
  const stem = filename.replace(/\.[^.]+$/, "");
  const candidates = new Set();

  candidates.add(stem);
  candidates.add(stem.replace(/_/g, " "));
  candidates.add(stem.replace(/\s+/g, " ").trim());
  
  const noTags = stem.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, "").trim();
  candidates.add(noTags);
  
  const base = stem.split(/[\(\[]/)[0].trim();
  candidates.add(base);
  
  if (noTags) candidates.add(`${noTags} (USA)`);
  if (base) {
    candidates.add(`${base} (USA)`);
    candidates.add(`${base} (Europe)`);
  }

  const sysDir = "Nintendo - Nintendo 64";
  const cdn = "https://thumbnails.libretro.com";
  const urls = Array.from(candidates).filter(Boolean).map(name => {
    const sanitized = name.replace(/[&*/:`<>?\\|"]/g, "_");
    return `${cdn}/${encodeURIComponent(sysDir)}/Named_Boxarts/${encodeURIComponent(sanitized)}.png`;
  });

  for (const url of urls) {
    const success = await tryLoadImage(url);
    if (success) {
      const imgEl = document.getElementById('game-boxart');
      imgEl.src = url;
      imgEl.classList.remove('hidden');
      document.getElementById('boxart-fallback').classList.add('hidden');
      break;
    }
  }
}

function tryLoadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// --- EmulatorJS Initialization ---
btnPlay.addEventListener('click', () => {
  if (!romUrl) return;

  switchScreen(screenEmulator);
  
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  // Set EmulatorJS configurations
  window.EJS_player = '#game-container';
  window.EJS_core = 'n64';
  window.EJS_gameUrl = romUrl;
  window.EJS_gameName = currentTitle || "N64 Game";
  window.EJS_color = '#00e5ff';
  window.EJS_startOnLoaded = true;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
  
  window.EJS_buttons = {
    playCounter: false,
    settings: true,
    fullscreen: true,
    saveState: true,
    loadState: true,
    gamepad: true,
    cheat: true,
    volume: true,
    quickSave: true,
    quickLoad: true,
    screenshot: true,
    restart: true
  };

  setTimeout(() => {
    const oldScript = document.getElementById('ejs-loader-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'ejs-loader-script';
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    document.body.appendChild(script);
  }, 100);
});

function exitEmulator() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  switchScreen(screenHome);
}
