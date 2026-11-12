// Turns a picture + settings into the texture set for each face of the card:
// colour, roughness/metalness (ORM), normal (emboss + paper grain), foil mask and die-cut alpha.
import { drawMotif } from './shapes.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function hexToRgb(hex) {
  let h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
}
export function luma(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export const FOILS = {
  gold: { label: 'Gold', rgb: [0.97, 0.8, 0.46], css: 'radial-gradient(circle at 30% 28%, #fff4c4 0 12%, #e9c46a 30%, #9c7425 62%, #f3d98b 86%)' },
  silver: { label: 'Silver', rgb: [0.9, 0.91, 0.93], css: 'radial-gradient(circle at 30% 28%, #ffffff 0 12%, #d9dce1 30%, #80858d 62%, #eef0f3 86%)' },
  rose: { label: 'Rose gold', rgb: [0.95, 0.72, 0.65], css: 'radial-gradient(circle at 30% 28%, #fff0ea 0 12%, #eab3a3 30%, #a5675a 62%, #f6d0c4 86%)' },
  copper: { label: 'Copper', rgb: [0.9, 0.57, 0.4], css: 'radial-gradient(circle at 30% 28%, #ffe2cc 0 12%, #de8f62 30%, #8a4524 62%, #f0b48c 86%)' },
  pink: { label: 'Pink', rgb: [0.98, 0.6, 0.76], css: 'radial-gradient(circle at 30% 28%, #fff0f6 0 12%, #f59cc0 30%, #b04a78 62%, #fbc6dc 86%)' },
  holo: { label: 'Holographic', rgb: [0.93, 0.93, 0.97], holo: true, css: 'conic-gradient(from 200deg, #ffd1f0, #c9f0ff, #d9ffd8, #fff5c2, #ffd0d0, #e2d1ff, #ffd1f0)' },
};

export const FINISH = {
  mirror: { label: 'Mirror', rough: 0.1 },
  satin: { label: 'Satin', rough: 0.34 },
  brushed: { label: 'Brushed', rough: 0.22 },
  glitter: { label: 'Glitter', rough: 0.2 },
};

export function foilRGB(st) {
  if (st.foil === 'custom') return hexToRgb(st.foilCustom);
  return (FOILS[st.foil] || FOILS.gold).rgb;
}
export const isHolo = (st) => st.foil === 'holo';

// ---------------------------------------------------------------- fonts
export const COVER_FONTS = {
  'Great Vibes': (px) => `400 ${px}px "Great Vibes"`,
  'Playfair Display': (px) => `600 ${px}px "Playfair Display"`,
  'Cormorant Garamond': (px) => `600 ${px}px "Cormorant Garamond"`,
  Caveat: (px) => `600 ${px}px Caveat`,
  'Dancing Script': (px) => `600 ${px}px "Dancing Script"`,
  Inter: (px) => `600 ${px}px Inter`,
};
export const LETTER_FONTS = {
  Caveat: (px) => `500 ${px}px Caveat`,
  'Homemade Apple': (px) => `400 ${px * 0.72}px "Homemade Apple"`,
  'Dancing Script': (px) => `500 ${px * 0.92}px "Dancing Script"`,
  Kalam: (px) => `400 ${px * 0.86}px Kalam`,
  'Playfair Display': (px) => `italic 500 ${px * 0.82}px "Playfair Display"`,
  Inter: (px) => `400 ${px * 0.74}px Inter`,
};

// ---------------------------------------------------------------- numeric helpers
export function blur(src, w, h, r) {
  r = Math.round(r);
  if (r < 1) return src.slice();
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let s = 0;
    for (let i = -r; i <= r; i++) s += src[o + clamp(i, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s / d;
      s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) s += tmp[clamp(i, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / d;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
const blur2 = (src, w, h, r) => blur(blur(src, w, h, r), w, h, r);

export function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(w, h, cell, seed) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    let fy = gy - y0;
    fy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      let fx = gx - x0;
      fx = fx * fx * (3 - 2 * fx);
      const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
      const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
      out[y * w + x] = lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * 2 - 1;
    }
  }
  return out;
}

const grainCache = new Map();
export function grainField(w, h, type) {
  const key = `${w}x${h}:${type}`;
  if (grainCache.has(key)) return grainCache.get(key);
  const N = w * h;
  const g = new Float32Array(N);
  if (type === 'smooth') {
    const a = valueNoise(w, h, 1.4, 7);
    for (let i = 0; i < N; i++) g[i] = a[i] * 0.07;
  } else if (type === 'linen') {
    const a = valueNoise(w, h, 18, 4), b = valueNoise(w, h, 1.2, 5), c = valueNoise(w, h, 5, 6);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const tx = Math.abs(Math.sin(x * 1.25 + a[i] * 1.6 + c[i] * 0.6));
        const ty = Math.abs(Math.sin(y * 1.25 + a[i] * 1.6 - c[i] * 0.6));
        g[i] = (tx * 0.5 + ty * 0.5 - 0.64) * 0.42 + b[i] * 0.06;
      }
  } else if (type === 'felt') {
    const a = valueNoise(w, h, 10, 6), b = valueNoise(w, h, 3.2, 8), c = valueNoise(w, h, 1.1, 9);
    for (let i = 0; i < N; i++) g[i] = a[i] * 0.28 + b[i] * 0.22 + c[i] * 0.14;
  } else {
    // cotton
    const a = valueNoise(w, h, 7, 1), b = valueNoise(w, h, 2.4, 2), c = valueNoise(w, h, 1, 3);
    for (let i = 0; i < N; i++) g[i] = a[i] * 0.16 + b[i] * 0.14 + c[i] * 0.09;
  }
  if (grainCache.size > 12) grainCache.clear();
  grainCache.set(key, g);
  return g;
}

function sobel(L, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - (L[i - w - 1] + 2 * L[i - 1] + L[i + w - 1]);
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - (L[i - w - 1] + 2 * L[i - w] + L[i - w + 1]);
      out[i] = Math.hypot(gx, gy);
    }
  // normalise so the 97th percentile of real edges reads as 1
  const samples = [];
  for (let i = 0; i < out.length; i += 7) if (out[i] > 0.02) samples.push(out[i]);
  samples.sort((a, b) => a - b);
  const p = samples.length ? samples[Math.floor(samples.length * 0.97)] : 1;
  const k = 1 / Math.max(p, 0.05);
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, out[i] * k);
  return out;
}

function goldScore(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 0.04) return 0;
  const s = d / (1 - Math.abs(2 * l - 1) + 1e-6);
  let hh;
  if (mx === r) hh = ((g - b) / d) % 6;
  else if (mx === g) hh = (b - r) / d + 2;
  else hh = (r - g) / d + 4;
  hh *= 60;
  if (hh < 0) hh += 360;
  const dh = Math.abs(hh - 43);
  const hw = Math.exp(-(dh * dh) / (2 * 9 * 9));
  return hw * smoothstep(0.12, 0.3, s) * (1 - smoothstep(0.86, 1, s)) * smoothstep(0.22, 0.38, l) * (1 - smoothstep(0.82, 0.94, l));
}

export function heightToNormal(Hf, w, h, strength, px, py) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const yu = y > 0 ? y - 1 : y, yd = y < h - 1 ? y + 1 : y;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const xl = x > 0 ? x - 1 : x, xr = x < w - 1 ? x + 1 : x;
      let nx = -(Hf[y * w + xr] - Hf[y * w + xl]) * strength;
      let ny = (Hf[yd * w + x] - Hf[yu * w + x]) * strength;
      if (px) {
        nx += px[i];
        ny += py[i];
      }
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = i * 4;
      d[o] = (nx * inv * 0.5 + 0.5) * 255;
      d[o + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[o + 2] = (inv * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grayCanvas(arr, w, h, mirror = false) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = arr[y * w + (mirror ? w - 1 - x : x)] * 255;
      const o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v;
      d[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- picture analysis
export function detectAlpha(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(1, 220 / Math.max(iw, ih));
  const c = makeCanvas(iw * s, ih * s);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let t = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) t++;
  return t / (d.length / 4) > 0.04;
}

function alphaBox(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(1, 600 / Math.max(iw, ih));
  const c = makeCanvas(iw * s, ih * s);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (d[(y * c.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0) return { x: 0, y: 0, w: iw, h: ih };
  return { x: x0 / s, y: y0 / s, w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s };
}

function coreRect(alpha, W, H) {
  const cols = new Float32Array(W), rows = new Float32Array(H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = alpha[y * W + x];
      cols[x] += a;
      rows[y] += a;
    }
  const mc = Math.max(...cols), mr = Math.max(...rows);
  let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
  while (x0 < W - 1 && cols[x0] < mc * 0.62) x0++;
  while (x1 > 0 && cols[x1] < mc * 0.62) x1--;
  while (y0 < H - 1 && rows[y0] < mr * 0.62) y0++;
  while (y1 > 0 && rows[y1] < mr * 0.62) y1--;
  if (x1 - x0 < W * 0.3 || y1 - y0 < H * 0.3) return { x: W * 0.06, y: H * 0.06, w: W * 0.88, h: H * 0.88 };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Lays the picture out on the card and pre-computes everything the foil modes need.
export function computeLayout(src, st, maxSide = 1024) {
  const img = src.image;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  let W, H, rect = null, draw, dieCut = false, borderPx = 0;

  if (st.shape === 'diecut' && src.hasAlpha) {
    dieCut = true;
    const bb = src.alphaBox || (src.alphaBox = alphaBox(img));
    const pad = Math.round(Math.max(bb.w, bb.h) * 0.03);
    const rx = bb.x - pad, ry = bb.y - pad, rw = bb.w + pad * 2, rh = bb.h + pad * 2;
    const s = maxSide / Math.max(rw, rh);
    W = Math.round(rw * s);
    H = Math.round(rh * s);
    draw = { x: -rx * s, y: -ry * s, w: iw * s, h: ih * s };
    if (src.cardRect) {
      const cr = src.cardRect;
      rect = { x: (cr.x - rx) * s, y: (cr.y - ry) * s, w: cr.w * s, h: cr.h * s };
    }
    borderPx = Math.max(3, pad * s * 0.55);
  } else {
    const asp =
      st.shape === 'portrait' ? 5 / 7 : st.shape === 'square' ? 1 : st.shape === 'landscape' ? 7 / 5 : clamp(iw / ih, 0.6, 1.7);
    if (asp >= 1) {
      W = maxSide;
      H = Math.round(maxSide / asp);
    } else {
      H = maxSide;
      W = Math.round(maxSide * asp);
    }
    const s = st.fit === 'fit' ? Math.min((W * 0.82) / iw, (H * 0.82) / ih) : Math.max(W / iw, H / ih);
    draw = { x: (W - iw * s) / 2, y: (H - ih * s) / 2, w: iw * s, h: ih * s };
    rect = { x: 0, y: 0, w: W, h: H };
  }

  const artCanvas = makeCanvas(W, H);
  const actx = artCanvas.getContext('2d', { willReadFrequently: true });
  actx.imageSmoothingQuality = 'high';
  actx.drawImage(img, draw.x, draw.y, draw.w, draw.h);
  const art = actx.getImageData(0, 0, W, H).data;

  const N = W * H;
  let designed = null;
  if (src.designed) {
    const dc = makeCanvas(W, H);
    const dctx = dc.getContext('2d', { willReadFrequently: true });
    dctx.fillStyle = '#000';
    dctx.fillRect(0, 0, W, H);
    dctx.drawImage(src.designed, draw.x, draw.y, draw.w, draw.h);
    const dd = dctx.getImageData(0, 0, W, H).data;
    designed = new Float32Array(N);
    for (let i = 0; i < N; i++) designed[i] = dd[i * 4] / 255;
  }
  let textMask = null;
  if (src.designedText) {
    const tc = makeCanvas(W, H);
    const tctx = tc.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(src.designedText, draw.x, draw.y, draw.w, draw.h);
    const td = tctx.getImageData(0, 0, W, H).data;
    textMask = new Float32Array(N);
    for (let i = 0; i < N; i++) textMask[i] = td[i * 4 + 3] / 255;
    textMask = blur(textMask, W, H, 2).map((v) => Math.min(1, v * 2.5));
  }
  let insideExtra = null;
  if (src.insideMask) {
    const ic = makeCanvas(W, H);
    const ictx = ic.getContext('2d', { willReadFrequently: true });
    ictx.drawImage(src.insideMask, draw.x, draw.y, draw.w, draw.h);
    const id = ictx.getImageData(0, 0, W, H).data;
    insideExtra = new Float32Array(N);
    for (let i = 0; i < N; i++) insideExtra[i] = id[i * 4 + 3] / 255;
  }

  const alpha = new Float32Array(N), lum = new Float32Array(N), gold = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const a = art[o + 3] / 255;
    const r = art[o] / 255, g = art[o + 1] / 255, b = art[o + 2] / 255;
    alpha[i] = a;
    lum[i] = a * (0.2126 * r + 0.7152 * g + 0.0722 * b) + (1 - a);
    gold[i] = a * goldScore(r, g, b);
  }

  let sil = null, safe = null, pageCut = false;
  if (dieCut) {
    const r = Math.max(1, Math.round(borderPx / 2));
    const b = blur2(alpha, W, H, r);
    sil = new Float32Array(N);
    for (let i = 0; i < N; i++) sil[i] = Math.max(alpha[i] > 0.5 ? 1 : 0, smoothstep(0.03, 0.14, b[i]));
    if (!rect) {
      // No card rectangle given: cut both halves of the card to the picture's shape.
      pageCut = true;
      safe = coreRect(alpha, W, H);
      rect = { x: 0, y: 0, w: W, h: H };
    }
  }

  const edge = sobel(blur(lum, W, H, 1), W, H);
  const lum3 = blur2(lum, W, H, 2);
  return { W, H, rect, dieCut, pageCut, safe, borderPx, art, alpha, lum, lum3, edge, gold, designed, textMask, insideExtra, stampFromLayers: !!src.stampFromLayers, sil, artCanvas, draw, iw, ih };
}

// ---------------------------------------------------------------- foil mask
export function renderCoverText(L, st) {
  if (!st.coverText || !st.coverText.trim()) return null;
  const { W, H, rect } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const lines = st.coverText.split('\n');
  const spec = COVER_FONTS[st.coverFont] || COVER_FONTS['Great Vibes'];
  let fs = rect.h * lerp(0.05, 0.2, st.coverSize);
  ctx.font = spec(fs);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
  if (widest > rect.w * 0.86) fs *= (rect.w * 0.86) / widest;
  ctx.font = spec(fs);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const lh = fs * 1.08;
  const cy = rect.y + rect.h * lerp(0.1, 0.9, st.coverY);
  const y0 = cy - (lh * lines.length) / 2 + lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, rect.x + rect.w / 2, y0 + i * lh));
  const d = ctx.getImageData(0, 0, W, H).data;
  const a = new Float32Array(W * H);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}

// Returns { mask, coverage, note }
export function buildMask(L, st, paint, textAlpha) {
  const { W, H } = L;
  const N = W * H;
  let m = new Float32Array(N);
  const a = st.amount;
  let note = '';
  let mode = st.mode;

  const fromGold = () => {
    const thr = lerp(0.72, 0.1, a);
    for (let i = 0; i < N; i++) m[i] = smoothstep(thr - 0.08, thr + 0.08, L.gold[i]);
  };
  const fromDetails = () => {
    const thr = lerp(0.94, 0.16, a);
    for (let i = 0; i < N; i++) {
      const s = Math.max(L.edge[i] * 0.92, Math.pow(1 - L.lum[i], 1.35));
      m[i] = smoothstep(thr - 0.07, thr + 0.07, s) * L.alpha[i];
    }
  };

  if (mode === 'designed') {
    if (L.designed) {
      const grow = lerp(0.7, 0.15, a);
      for (let i = 0; i < N; i++) m[i] = smoothstep(grow - 0.2, grow + 0.05, L.designed[i]);
      note = "The card's own foil, as it was made.";
    } else {
      fromGold();
      let cov = 0;
      for (let i = 0; i < N; i += 3) cov += m[i];
      cov /= N / 3;
      if (cov < 0.002 || cov > 0.5) {
        fromDetails();
        note = "Couldn't spot any printed foil in this picture, so the fine details turn to foil instead.";
      } else note = 'The gold and metallic-looking parts of your picture turn to foil.';
    }
  } else if (mode === 'details') {
    fromDetails();
    note = 'The fine lines and dark detail turn to foil.';
  } else if (mode === 'shadows') {
    const thr = lerp(0.86, 0.18, a);
    for (let i = 0; i < N; i++) m[i] = smoothstep(thr - 0.1, thr + 0.1, 1 - L.lum3[i]) * L.alpha[i];
    note = 'The darker areas turn to foil, softly.';
  } else if (mode === 'colour') {
    const [tr, tg, tb] = hexToRgb(st.pickColor);
    const tol = lerp(0.05, 0.55, a);
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      const d = Math.hypot(L.art[o] / 255 - tr, L.art[o + 1] / 255 - tg, L.art[o + 2] / 255 - tb);
      m[i] = (1 - smoothstep(tol * 0.6, tol, d)) * L.alpha[i];
    }
    note = 'Everything close to this colour turns to foil.';
  } else if (mode === 'all') {
    for (let i = 0; i < N; i++) m[i] = L.alpha[i];
    note = 'The whole picture is stamped in foil.';
  } else if (mode === 'paint') {
    if (paint && paint.length === N) m.set(paint);
    if (L.sil) for (let i = 0; i < N; i++) m[i] *= L.sil[i];
    note = 'Paint foil straight onto the picture below.';
  }

  if (mode !== 'paint') {
    const b = blur(m, W, H, 1);
    for (let i = 0; i < N; i++) m[i] = Math.max(b[i], m[i] * 0.6);
  }

  if (textAlpha && st.coverInk === 'foil') for (let i = 0; i < N; i++) m[i] = Math.max(m[i], textAlpha[i]);

  if (st.border) {
    const bw = Math.min(W, H) * lerp(0.004, 0.02, st.borderWidth);
    if (L.sil) {
      const r = Math.max(1, Math.round(bw / 2));
      const e = blur2(L.sil, W, H, r);
      for (let i = 0; i < N; i++) m[i] = Math.max(m[i], L.sil[i] * (1 - smoothstep(0.9, 0.99, e[i])));
    } else {
      const inset = Math.min(W, H) * 0.035;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const d = Math.min(x, y, W - 1 - x, H - 1 - y);
          const band = smoothstep(inset - 1, inset, d) * (1 - smoothstep(inset + bw, inset + bw + 1, d));
          const i = y * W + x;
          if (band > m[i]) m[i] = band;
        }
    }
  }

  let cov = 0;
  for (let i = 0; i < N; i += 5) cov += m[i];
  return { mask: m, coverage: cov / (N / 5), note };
}

// ---------------------------------------------------------------- surfaces
function foilPixel(F, holo, glitter, x, y, W, H, out) {
  let r = F[0], g = F[1], b = F[2];
  if (holo) {
    const t = ((x + y * 0.6) / (W + H)) * 9.0;
    r = 0.82 + 0.16 * Math.sin(t);
    g = 0.82 + 0.16 * Math.sin(t + 2.1);
    b = 0.84 + 0.16 * Math.sin(t + 4.2);
  }
  if (glitter) {
    const k = 0.78 + hash2((x / 2.2) | 0, (y / 2.2) | 0, 5) * 0.4;
    r *= k;
    g *= k;
    b *= k;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
}

function brushedStreaks(W, H) {
  const s = new Float32Array(W * H);
  const n = valueNoise(W, H, 40, 21);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const yy = y + n[y * W + x] * 6;
      s[y * W + x] = hash2(0, Math.floor(yy), 31) * 2 - 1;
    }
  }
  return blur(s, W, H, 1);
}

// Front of the card + the inside of the cover (mirrored, it's the back of the same paper).
export function buildCoverSurfaces(L, st, m, textAlpha) {
  const { W, H, art, alpha, lum, sil } = L;
  const N = W * H;
  const P = hexToRgb(st.paper);
  const F = foilRGB(st);
  const holo = isHolo(st);
  const glitter = st.finish === 'glitter';
  const brushed = st.finish === 'brushed';
  const fin = FINISH[st.finish] || FINISH.mirror;
  const grain = grainField(W, H, st.paperTex);
  const sticker = [0.985, 0.98, 0.97];
  const ink = textAlpha && st.coverInk !== 'foil' ? hexToRgb(st.coverInkColor) : null;

  const mb = blur2(m, W, H, 2);
  let pe = null;
  if (st.picEmboss > 0.01) {
    const f = new Float32Array(N);
    for (let i = 0; i < N; i++) f[i] = alpha[i] * (0.4 + 0.6 * (1 - lum[i]));
    pe = blur2(f, W, H, 3);
  }
  const silB = sil ? blur2(sil, W, H, 3) : null;
  const textB = ink ? blur(textAlpha, W, H, 1) : null;
  const streak = brushed ? brushedStreaks(W, H) : null;

  const colorC = makeCanvas(W, H), ormC = makeCanvas(W, H);
  const cctx = colorC.getContext('2d'), octx = ormC.getContext('2d');
  const cImg = cctx.createImageData(W, H), oImg = octx.createImageData(W, H);
  const cd = cImg.data, od = oImg.data;
  const hgt = new Float32Array(N);
  const px = glitter ? new Float32Array(N) : null, py = glitter ? new Float32Array(N) : null;
  const fp = [0, 0, 0];
  const base = sil ? sticker : P;

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      const a = alpha[i];
      const fiber = 1 + grain[i] * (a > 0.5 ? 0.04 : 0.09);
      let r = (base[0] * (1 - a) + (art[o] / 255) * a) * fiber;
      let g = (base[1] * (1 - a) + (art[o + 1] / 255) * a) * fiber;
      let b = (base[2] * (1 - a) + (art[o + 2] / 255) * a) * fiber;
      if (ink) {
        const t = textAlpha[i];
        r = lerp(r, ink[0], t);
        g = lerp(g, ink[1], t);
        b = lerp(b, ink[2], t);
      }
      const mi = m[i];
      if (mi > 0.001) {
        foilPixel(F, holo, glitter, x, y, W, H, fp);
        r = lerp(r, fp[0], mi);
        g = lerp(g, fp[1], mi);
        b = lerp(b, fp[2], mi);
      }
      cd[o] = clamp(r, 0, 1) * 255;
      cd[o + 1] = clamp(g, 0, 1) * 255;
      cd[o + 2] = clamp(b, 0, 1) * 255;
      cd[o + 3] = 255;

      let rough = fin.rough;
      if (glitter) rough += (hash2((x / 2.2) | 0, (y / 2.2) | 0, 9) - 0.5) * 0.24;
      od[o] = 255;
      od[o + 1] = lerp(0.84, clamp(rough, 0.04, 1), mi) * 255;
      od[o + 2] = mi * 255;
      od[o + 3] = 255;

      let h = grain[i] + mb[i] * st.emboss * 2.6;
      if (pe) h += pe[i] * st.picEmboss * 2.4;
      if (textB) h -= textB[i] * 0.5;
      if (streak) h += streak[i] * 0.22 * mi;
      if (silB) h += silB[i] * 0.8;
      hgt[i] = h;
      if (glitter && mi > 0.15) {
        const cx = (x / 2.2) | 0, cy = (y / 2.2) | 0;
        px[i] = (hash2(cx, cy, 11) - 0.5) * 1.5 * mi;
        py[i] = (hash2(cx, cy, 12) - 0.5) * 1.5 * mi;
      }
    }
  cctx.putImageData(cImg, 0, 0);
  octx.putImageData(oImg, 0, 0);
  const front = {
    color: colorC,
    orm: ormC,
    normal: heightToNormal(hgt, W, H, 1, px, py),
    mask: grayCanvas(m, W, H),
    alpha: sil ? grayCanvas(sil, W, H) : null,
  };

  // ---- inside of the cover (mirror image of the front)
  const mode = st.insideCover;
  const c2 = makeCanvas(W, H), o2 = makeCanvas(W, H);
  const c2x = c2.getContext('2d'), o2x = o2.getContext('2d');
  const c2i = c2x.createImageData(W, H), o2i = o2x.createImageData(W, H);
  const c2d = c2i.data, o2d = o2i.data;
  const h2 = new Float32Array(N);
  const m2 = new Float32Array(N);
  // what shows through on the inside is the artwork's foil, not the lettering (which would read backwards)
  let mIn = m, mbIn = mb;
  if (L.textMask || L.insideExtra) {
    mIn = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let v = L.textMask ? m[i] * (1 - L.textMask[i]) : m[i];
      if (L.insideExtra && L.insideExtra[i] > v) v = L.insideExtra[i];
      mIn[i] = v;
    }
    mbIn = blur2(mIn, W, H, 2);
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x, j = y * W + (W - 1 - x), o = i * 4;
      const fiber = 1 + grain[i] * 0.09;
      let r = P[0] * fiber, g = P[1] * fiber, b = P[2] * fiber;
      let mi = 0;
      if (mode === 'mirror') {
        mi = mIn[j];
        if (mi > 0.001) {
          foilPixel(F, holo, glitter, x, y, W, H, fp);
          r = lerp(r, fp[0], mi);
          g = lerp(g, fp[1], mi);
          b = lerp(b, fp[2], mi);
        }
      }
      m2[i] = mi;
      c2d[o] = clamp(r, 0, 1) * 255;
      c2d[o + 1] = clamp(g, 0, 1) * 255;
      c2d[o + 2] = clamp(b, 0, 1) * 255;
      c2d[o + 3] = 255;
      o2d[o] = 255;
      o2d[o + 1] = lerp(0.86, fin.rough, mi) * 255;
      o2d[o + 2] = mi * 255;
      o2d[o + 3] = 255;
      let h = grain[i];
      if (mode !== 'plain') {
        h -= mbIn[j] * st.emboss * 2.2;
        if (pe) h -= pe[j] * st.picEmboss * 1.8;
      }
      if (silB) h += silB[j] * 0.8;
      h2[i] = h;
    }
  c2x.putImageData(c2i, 0, 0);
  o2x.putImageData(o2i, 0, 0);
  const inside = {
    color: c2,
    orm: o2,
    normal: heightToNormal(h2, W, H, 1),
    mask: grayCanvas(m2, W, H),
    alpha: sil ? grayCanvas(sil, W, H, true) : null,
  };
  return { front, inside };
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

function pageSize(L) {
  if (L.pageCut) return [L.W, L.H];
  const s = 1024 / Math.max(L.rect.w, L.rect.h);
  return [Math.round(L.rect.w * s), Math.round(L.rect.h * s)];
}
// Area of the page that is safely inside the card (for die-cut pages, the core of the shape).
function pageArea(L, W, H) {
  if (L.pageCut && L.safe) return { x: L.safe.x, y: L.safe.y, w: L.safe.w, h: L.safe.h };
  return { x: 0, y: 0, w: W, h: H };
}

// Inside right page: optional letter sheet, the handwritten letter and a small foil motif.
// A small copy of the card's own foil, cropped to where the foil is (used as the inside mark).
function coverFoilStamp(L, maskIn) {
  const { W, H } = L;
  let mask = maskIn;
  if (L.textMask || L.insideExtra) {
    mask = new Float32Array(W * H);
    for (let i = 0; i < mask.length; i++) {
      let v = L.textMask ? maskIn[i] * (1 - L.textMask[i]) : maskIn[i];
      // living cards: include the moving pieces (the cat card uses only its character)
      if (L.insideExtra) v = L.stampFromLayers ? L.insideExtra[i] : Math.max(v, L.insideExtra[i]);
      mask[i] = v;
    }
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2)
      if (mask[y * W + x] > 0.35) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) return null;
  const c = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const o = (y * c.width + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = mask[(y + y0) * W + (x + x0)] * 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function buildLetterSurface(L, st, coverMask) {
  const [W, H] = pageSize(L);
  const N = W * H;
  const P = hexToRgb(st.paper);
  const F = foilRGB(st);
  const holo = isHolo(st);
  const fin = FINISH[st.finish] || FINISH.mirror;
  const grain = grainField(W, H, st.paperTex);

  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = st.paper;
  ctx.fillRect(0, 0, W, H);

  const area = pageArea(L, W, H);
  const mg = Math.round(Math.min(area.w, area.h) * 0.065);
  const ins = st.insert ? { x: area.x + mg, y: area.y + mg, w: area.w - mg * 2, h: area.h - mg * 2 } : area;
  const sheet = luma(P) > 0.55 ? mixRgb(P, [1, 0.995, 0.975], 0.72) : [0.97, 0.955, 0.925];
  if (st.insert) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,30,20,0.16)';
    ctx.shadowBlur = W * 0.012;
    ctx.shadowOffsetY = W * 0.004;
    ctx.fillStyle = rgbToHex(sheet);
    ctx.fillRect(ins.x, ins.y, ins.w, ins.h);
    ctx.restore();
  }
  const bgForInk = st.insert ? sheet : P;

  // letter text → its own alpha layer
  const tc = makeCanvas(W, H);
  const tctx = tc.getContext('2d', { willReadFrequently: true });
  const spec = LETTER_FONTS[st.letterFont] || LETTER_FONTS.Caveat;
  let fs = area.h * lerp(0.038, 0.085, st.letterSize);
  const maxW = ins.w * 0.78;
  const stamp = st.motif === 'card' && coverMask ? coverFoilStamp(L, coverMask) : null;
  const motifSize = st.motif === 'none' || (st.motif === 'card' && !stamp) ? 0 : Math.min(area.w, area.h) * (stamp ? 0.13 : 0.075);
  const maxH = ins.h * 0.74 - motifSize * 1.4;
  let lines = [];
  for (let k = 0; k < 14; k++) {
    tctx.font = spec(fs);
    lines = wrapLines(tctx, st.letter || '', maxW);
    if (lines.length * fs * 1.32 <= maxH) break;
    fs *= 0.9;
  }
  const lh = fs * 1.32;
  const align = st.letterAlign || 'center';
  tctx.textAlign = align;
  tctx.textBaseline = 'middle';
  tctx.fillStyle = '#fff';
  const blockH = lines.length * lh;
  const cy = ins.y + ins.h * 0.46 - motifSize * 0.4;
  const y0 = cy - blockH / 2 + lh / 2;
  const tx = align === 'left' ? ins.x + (ins.w - maxW) / 2 : align === 'right' ? ins.x + (ins.w + maxW) / 2 : ins.x + ins.w / 2;
  lines.forEach((l, i) => tctx.fillText(l, tx, y0 + i * lh));
  const td = tctx.getImageData(0, 0, W, H).data;

  // motif + insert masks
  const mc = makeCanvas(W, H);
  const mctx = mc.getContext('2d', { willReadFrequently: true });
  if (motifSize) {
    const my = Math.min(ins.y + ins.h - motifSize * 1.1, y0 + blockH + motifSize * 0.9);
    if (stamp) {
      const s = motifSize / Math.max(stamp.width, stamp.height);
      const dw = stamp.width * s, dh = stamp.height * s;
      mctx.drawImage(stamp, ins.x + ins.w / 2 - dw / 2, my - dh / 2, dw, dh);
    } else drawMotif(mctx, st.motif, ins.x + ins.w / 2, my, motifSize, '#fff');
  }
  const md = mctx.getImageData(0, 0, W, H).data;
  const insA = new Float32Array(N);
  if (st.insert) for (let y = ins.y | 0; y < ins.y + ins.h; y++) for (let x = ins.x | 0; x < ins.x + ins.w; x++) insA[y * W + x] = 1;
  const insB = blur2(insA, W, H, 2);

  const text = new Float32Array(N), foil = new Float32Array(N);
  const style = st.letterStyle;
  for (let i = 0; i < N; i++) {
    text[i] = td[i * 4 + 3] / 255;
    foil[i] = Math.max(md[i * 4 + 3] / 255, style === 'foil' ? text[i] : 0);
  }
  const foilB = blur2(foil, W, H, 1);
  const textB = style === 'letterpress' ? blur(text, W, H, 1) : null;
  const ink = hexToRgb(style === 'letterpress' ? st.letterInk : st.letterInk);

  const cd0 = ctx.getImageData(0, 0, W, H);
  const cd = cd0.data;
  const oc = makeCanvas(W, H), octx = oc.getContext('2d');
  const oImg = octx.createImageData(W, H), od = oImg.data;
  const hgt = new Float32Array(N);
  const fp = [0, 0, 0];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      const fiber = 1 + grain[i] * 0.07;
      let r = (cd[o] / 255) * fiber, g = (cd[o + 1] / 255) * fiber, b = (cd[o + 2] / 255) * fiber;
      if (style !== 'foil') {
        const t = text[i] * (style === 'letterpress' ? 0.92 : 0.95);
        r = lerp(r, ink[0], t);
        g = lerp(g, ink[1], t);
        b = lerp(b, ink[2], t);
      }
      const mi = foil[i];
      if (mi > 0.001) {
        foilPixel(F, holo, false, x, y, W, H, fp);
        r = lerp(r, fp[0], mi);
        g = lerp(g, fp[1], mi);
        b = lerp(b, fp[2], mi);
      }
      cd[o] = clamp(r, 0, 1) * 255;
      cd[o + 1] = clamp(g, 0, 1) * 255;
      cd[o + 2] = clamp(b, 0, 1) * 255;
      od[o] = 255;
      od[o + 1] = lerp(0.85, fin.rough, mi) * 255;
      od[o + 2] = mi * 255;
      od[o + 3] = 255;
      let h = grain[i] + insB[i] * 1.1 + foilB[i] * 1.2;
      if (textB) h -= textB[i] * 1.6;
      hgt[i] = h;
    }
  void bgForInk;
  ctx.putImageData(cd0, 0, 0);
  octx.putImageData(oImg, 0, 0);
  return { color: c, orm: oc, normal: heightToNormal(hgt, W, H, 1), mask: grayCanvas(foil, W, H), alpha: L.pageCut ? grayCanvas(L.sil, W, H) : null };
}

// Back of the card: plain stock with a tiny debossed maker's mark.
export function buildBackSurface(L, st) {
  const [W, H] = pageSize(L);
  const N = W * H;
  const P = hexToRgb(st.paper);
  const grain = grainField(W, H, st.paperTex);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = st.paper;
  ctx.fillRect(0, 0, W, H);
  const mk = makeCanvas(W, H);
  const mx = mk.getContext('2d', { willReadFrequently: true });
  const fs = Math.round(H * 0.022);
  mx.font = `500 ${fs}px Inter`;
  mx.textAlign = 'center';
  mx.fillStyle = '#fff';
  const ar = pageArea(L, W, H);
  // the back is seen mirrored relative to the front, so mirror the safe area too
  const bx = W - (ar.x + ar.w / 2);
  drawMotif(mx, 'sparkle', bx, ar.y + ar.h * 0.86, fs * 1.6, '#fff');
  mx.fillText('GLIMMERFOLD', bx, ar.y + ar.h * 0.92);
  const md = mx.getImageData(0, 0, W, H).data;
  const mark = new Float32Array(N);
  for (let i = 0; i < N; i++) mark[i] = md[i * 4 + 3] / 255;
  const markB = blur(mark, W, H, 1);
  const tone = luma(P) > 0.5 ? mixRgb(P, [0, 0, 0], 0.32) : mixRgb(P, [1, 1, 1], 0.35);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const oc = makeCanvas(W, H), octx = oc.getContext('2d');
  const oImg = octx.createImageData(W, H), od = oImg.data;
  const hgt = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const f = 1 + grain[i] * 0.09;
    const t = mark[i] * 0.85;
    d[o] = clamp(lerp(P[0] * f, tone[0], t), 0, 1) * 255;
    d[o + 1] = clamp(lerp(P[1] * f, tone[1], t), 0, 1) * 255;
    d[o + 2] = clamp(lerp(P[2] * f, tone[2], t), 0, 1) * 255;
    od[o] = 255;
    od[o + 1] = 0.86 * 255;
    od[o + 2] = 0;
    od[o + 3] = 255;
    hgt[i] = grain[i] - markB[i] * 0.7;
  }
  ctx.putImageData(img, 0, 0);
  octx.putImageData(oImg, 0, 0);
  return { color: c, orm: oc, normal: heightToNormal(hgt, W, H, 1), mask: null, alpha: L.pageCut ? grayCanvas(L.sil, W, H, true) : null };
}

// Overlay used by the little foil preview / paint canvas in the sidebar.
export function maskOverlay(L, m, st) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H), d = img.data;
  const F = isHolo(st) ? [0.75, 0.65, 0.95] : foilRGB(st);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    d[o] = F[0] * 255;
    d[o + 1] = F[1] * 255;
    d[o + 2] = F[2] * 255;
    d[o + 3] = m[i] * 235;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
