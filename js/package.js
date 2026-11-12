// Packs a card into ONE self-contained .html file: the 3D viewer, every module, three.js and the card
// itself (settings + picture) are all inside, so it opens by double-click in any browser — no server,
// no link, works offline (only the web fonts need internet; without it, similar fonts are used).

const MODULES = ['main', 'surface', 'presets', 'occasions', 'gallery', 'fx', 'shapes', 'share', 'livecat', 'life', 'package'];
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const ROOM_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js';

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const asJs = (src) => 'data:text/javascript;base64,' + b64(src);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function text(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
}

// code = the packed card (same format as a share link); returns a Blob of the finished page
export async function packageCard(code, title) {
  const base = new URL('.', location.href);
  const imports = {};
  // our modules: relative imports become bare names the import map can serve from inside the file
  for (const n of MODULES) {
    const src = (await text(new URL(`js/${n}.js`, base))).replace(/from\s+'\.\/([a-z]+)\.js'/g, (_, m) => `from 'gf/${m}.js'`);
    imports[`gf/${n}.js`] = asJs(src);
  }
  // three.js goes inside too, so the card works with no internet
  for (const [key, url] of [['three', THREE_URL], ['three/addons/environments/RoomEnvironment.js', ROOM_URL]]) {
    try {
      imports[key] = asJs(await text(url));
    } catch (e) {
      imports[key] = url; // fall back to loading it online
    }
  }
  const icon = 'data:image/svg+xml;base64,' + b64(await text(new URL('assets/glimmerfold-icon.svg', base)));
  const mark = 'data:image/svg+xml;base64,' + b64(await text(new URL('assets/glimmerfold-mark.svg', base)));
  let html = await text(new URL('index.html', base));
  html = html
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, () => `<script type="importmap">${JSON.stringify({ imports })}</script>`)
    .replace('<script type="module" src="js/main.js"></script>', () => `<script>window.__GF_CARD = ${JSON.stringify(code)};</script>\n<script type="module">import 'gf/main.js';</script>`)
    .split('assets/glimmerfold-icon.svg').join(icon)
    .split('assets/glimmerfold-mark.svg').join(mark)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`)
    .replace('<body>', () => '<body class="viewer packaged">');
  return new Blob([html], { type: 'text/html' });
}
