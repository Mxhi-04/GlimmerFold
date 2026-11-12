// Packs a whole card (settings + picture) into the URL hash so a link carries everything.

function toB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const b = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function packCard(obj) {
  const json = JSON.stringify(obj);
  if ('CompressionStream' in window) {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return 'z' + toB64url(buf);
  }
  return 'j' + toB64url(new TextEncoder().encode(json));
}

export async function unpackCard(str) {
  const kind = str[0];
  const bytes = fromB64url(str.slice(1));
  if (kind === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function imageToDataURL(img, max, hasAlpha) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(1, max / Math.max(iw, ih));
  const c = document.createElement('canvas');
  c.width = Math.round(iw * s);
  c.height = Math.round(ih * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/webp', 0.86);
  if (!url.startsWith('data:image/webp')) url = hasAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
  return url;
}

export function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}
