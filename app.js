let romFile = null;
let romUrl = null;
let currentTitle = "";

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const screenUpload = document.getElementById('upload-screen');
const screenAccepted = document.getElementById('accepted-screen');
const screenHome = document.getElementById('home-screen');
const screenEmulator = document.getElementById('emulator-screen');
const btnPlay = document.getElementById('btn-play');

// --- File Handling ---
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
  setTimeout(() => switchScreen(screenHome), 1200);
}

function switchScreen(activeScreen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  activeScreen.classList.add('active');
}

// --- Box Art Fetcher ---
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

// --- THE FIX: Iframe Emulator Boot ---
btnPlay.addEventListener('click', () => {
  if (!romUrl) return;
  switchScreen(screenEmulator);
  
  const container = document.getElementById('game-container');
  container.innerHTML = ''; // Clear previous instances

  // 1. Create a pristine iframe so EmulatorJS can calculate window height properly
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.allow = "autoplay; gamepad; microphone; fullscreen";
  container.appendChild(iframe);

  // 2. Inject the Emulator code directly into the iframe document
  const doc = iframe.contentWindow.document;
  const safeTitle = currentTitle.replace(/'/g, "\\'").replace(/"/g, '\\"');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }</style>
    </head>
    <body>
      <div id="game" style="width: 100%; height: 100%;"></div>
      <script>
        window.EJS_player = '#game';
        window.EJS_core = 'n64';
        window.EJS_gameUrl = '${romUrl}';
        window.EJS_gameName = '${safeTitle}';
        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
        window.EJS_color = '#00e5ff';
        window.EJS_startOnLoaded = true;
        
        window.EJS_buttons = {
          playCounter: false, settings: true, fullscreen: true, saveState: true, 
          loadState: true, gamepad: true, cheat: true, volume: true, 
          quickSave: true, quickLoad: true, screenshot: true, restart: true
        };
      <\/script>
      <script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script>
    </body>
    </html>
  `;
  
  doc.open();
  doc.write(html);
  doc.close();
});

function exitEmulator() {
  document.getElementById('game-container').innerHTML = '';
  switchScreen(screenHome);
}
