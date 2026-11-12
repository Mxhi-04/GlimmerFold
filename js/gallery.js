// All gallery designs in one place, built on demand and cached lightly (full-size art is heavy).
import { BASE_PRESETS } from './presets.js';
import { OCCASIONS } from './occasions.js';
import { drawLayer } from './livecat.js';
import { insideFrom } from './life.js';

export const PRESETS = [...BASE_PRESETS, ...OCCASIONS].map((p) => ({ ...p, settings: { mode: 'designed', ...p.settings } }));
export const CATEGORIES = ['All', 'Birthday', 'Love', 'Wedding', 'Holidays', 'Celebrate', 'Thanks & care', 'Everyday'];

// fonts the gallery artwork is drawn with — load before building anything
export const ART_FONTS = [
  '400 40px "Great Vibes"', '600 40px "Playfair Display"', '600 40px "Cormorant Garamond"', '500 40px Caveat',
  '400 40px "Pinyon Script"', '600 40px Cinzel', '400 40px Pacifico', '400 40px Sacramento', '500 20px Inter',
];

const cache = new Map();
export function buildPreset(id) {
  if (cache.has(id)) {
    const v = cache.get(id);
    cache.delete(id);
    cache.set(id, v);
    return v;
  }
  const p = PRESETS.find((q) => q.id === id) || PRESETS[0];
  const out = p.build();
  const src = {
    image: out.art, designed: out.mask, designedText: out.mask._text || null, cardRect: out.cardRect || null,
    hasAlpha: p.settings.shape === 'diecut', presetId: p.id,
    layers: out.layers || null,
    // the living pieces' foil also shows through on the inside of the cover
    insideMask: out.insideMask || (out.layers ? insideFrom(out.layers, out.art.width, out.art.height) : null),
    stampFromLayers: !!out.insideMask,
  };
  cache.set(p.id, src);
  while (cache.size > 4) cache.delete(cache.keys().next().value);
  return src;
}

// Small preview without keeping the full-size art around.
export function buildThumb(id, size = 120) {
  const keep = cache.has(id);
  const src = buildPreset(id);
  const img = src.image;
  const s = size / Math.max(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (src.layers) for (const ly of src.layers) drawLayer(ctx, ly, 'canvas', s);
  if (!keep) cache.delete(id);
  return c;
}

export { drawLayer };
