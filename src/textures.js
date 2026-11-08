import * as THREE from 'three';
import { rand } from './util.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const mk = (c, { repeat, srgb = true } = {}) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
};
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Value-noise helpers for believable weathering
function noiseField(w, h, scale, R) {
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2, g = new Float32Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = R();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}

// returns { map, bump, rough } for granite setts laid in a running bond
export function cobbleSet() {
  const W = 512, H = 512, R = rand(7);
  const [c, g] = cv(W, H), [cb, gb] = cv(W, H), [cr, gr] = cv(W, H);
  g.fillStyle = '#2a2420'; g.fillRect(0, 0, W, H); gb.fillStyle = '#000'; gb.fillRect(0, 0, W, H); gr.fillStyle = '#d8d8d8'; gr.fillRect(0, 0, W, H);
  const cols = 6, rows = 12, bw = W / cols, bh = H / rows, n1 = noiseField(W, H, 6, R), n2 = noiseField(W, H, 28, R);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let i = -1; i <= cols; i++) {
      const jx = (R() - .5) * 5, jy = (R() - .5) * 4, x = i * bw + off + 3 + jx, y = r * bh + 3 + jy, w = bw - 6 - R() * 4, h = bh - 6 - R() * 3, rad = 10 + R() * 8;
      const hue = 24 + R() * 20, sat = 6 + R() * 12, lig = 30 + R() * 22;
      g.fillStyle = `hsl(${hue},${sat}%,${lig}%)`; rr(g, x, y, w, h, rad); g.fill();
      const lg = g.createLinearGradient(x, y, x, y + h); lg.addColorStop(0, 'rgba(255,240,220,.16)'); lg.addColorStop(.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = lg; rr(g, x, y, w, h, rad); g.fill();
      const hv = 150 + R() * 70; gb.fillStyle = `rgb(${hv},${hv},${hv})`; rr(gb, x, y, w, h, rad); gb.fill();
      const rv = 120 + R() * 110; gr.fillStyle = `rgb(${rv},${rv},${rv})`; rr(gr, x, y, w, h, rad); gr.fill();
    }
  }
  // grain / mineral speckle + dirt in the grooves
  const id = g.getImageData(0, 0, W, H), d = id.data, ib = gb.getImageData(0, 0, W, H), db = ib.data;
  for (let k = 0; k < W * H; k++) {
    const nv = (n1[k] - .5) * 46 + (n2[k] - .5) * 36, sp = (R() - .5) * 26;
    d[k * 4] += nv + sp; d[k * 4 + 1] += nv + sp; d[k * 4 + 2] += nv * .9 + sp;
    const gv = db[k * 4]; db[k * 4] = db[k * 4 + 1] = db[k * 4 + 2] = Math.max(0, Math.min(255, gv + (n1[k] - .5) * 40 + (R() - .5) * 22));
  }
  g.putImageData(id, 0, 0); gb.putImageData(ib, 0, 0);
  const mapT = mk(c, { repeat: [7, 47] }), bumpT = mk(cb, { repeat: [7, 47], srgb: false }), roughT = mk(cr, { repeat: [7, 47], srgb: false });
  return { map: mapT, bump: bumpT, rough: roughT };
}
export function cobbleTex() { return cobbleSet().map; }

// weathered lime-wash: stains, rising damp at the base, rain streaks, flaking
export function plasterSet() {
  const S = 512, R = rand(3), [c, g] = cv(S, S), [cb, gb] = cv(S, S);
  g.fillStyle = '#e9e1d6'; g.fillRect(0, 0, S, S); gb.fillStyle = '#808080'; gb.fillRect(0, 0, S, S);
  const n1 = noiseField(S, S, 5, R), n2 = noiseField(S, S, 40, R), n3 = noiseField(S, S, 120, R);
  const id = g.getImageData(0, 0, S, S), d = id.data, ib = gb.getImageData(0, 0, S, S), db = ib.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x, v = (n1[k] - .5) * 18 + (n2[k] - .5) * 34 + (n3[k] - .5) * 30, damp = Math.pow(Math.max(0, (y - S * .7) / (S * .3)), 1.6) * (.4 + n2[k]) * 46;
    d[k * 4] += v - damp * .8; d[k * 4 + 1] += v - damp; d[k * 4 + 2] += v * .95 - damp * 1.15;
    const b = 128 + (n1[k] - .5) * 90 + (n2[k] - .5) * 40; db[k * 4] = db[k * 4 + 1] = db[k * 4 + 2] = Math.max(0, Math.min(255, b));
  }
  g.putImageData(id, 0, 0); gb.putImageData(ib, 0, 0);
  for (let i = 0; i < 46; i++) { // rain streaks
    const x = R() * S, y = R() * S * .5, l = 60 + R() * 260, w = 2 + R() * 7; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(70,55,40,0)'); gr.addColorStop(.3, `rgba(70,55,40,${.05 + R() * .08})`); gr.addColorStop(1, 'rgba(70,55,40,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, l);
  }
  for (let i = 0; i < 14; i++) { const x = R() * S, y = R() * S, r = 6 + R() * 20; g.fillStyle = 'rgba(190,170,140,.35)'; g.beginPath(); g.ellipse(x, y, r, r * .7, R() * 3, 0, 7); g.fill(); gb.fillStyle = 'rgba(40,40,40,.5)'; gb.beginPath(); gb.ellipse(x, y, r, r * .7, 0, 0, 7); gb.fill(); }
  return { map: mk(c), bump: mk(cb, { srgb: false }) };
}
export function plasterTex() { return plasterSet().map; }

export function windowTex() {
  const [c, g] = cv(128, 192);
  const gr = g.createLinearGradient(0, 0, 0, 192);
  gr.addColorStop(0, '#ffeaa8'); gr.addColorStop(1, '#ffa24a');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = 'rgba(90,30,15,.92)'; g.lineWidth = 8; g.strokeRect(3, 3, 122, 186);
  g.lineWidth = 5;
  for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(i * 42.6, 0); g.lineTo(i * 42.6, 192); g.stroke(); }
  for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(0, j * 48); g.lineTo(128, j * 48); g.stroke(); }
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(120,50,20,.7)';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    const cx = i * 42.6 + 21.3, cy = j * 48 + 24;
    g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 12, cy); g.lineTo(cx, cy + 16); g.lineTo(cx - 12, cy); g.closePath(); g.stroke();
  }
  return mk(c);
}

export function doorTex() {
  const [c, g] = cv(512, 768); const R = rand(11);
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, '#5e1812'); gr.addColorStop(.5, '#7a2418'); gr.addColorStop(1, '#4e120f');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 768);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${R() * .12})`; g.fillRect(R() * 512, R() * 768, 1.5, 30 + R() * 80); }
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(254, 0, 4, 768);
  // carved panels
  for (const px of [30, 276]) for (const [py, ph] of [[40, 300], [370, 340]]) {
    g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 4; g.strokeRect(px, py, 206, ph);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.strokeRect(px + 10, py + 10, 186, ph - 20);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + 12, py + 12, 182, ph - 24);
    // floral diamond
    g.strokeStyle = 'rgba(255,190,100,.55)'; g.lineWidth = 3;
    const cx = px + 103, cy = py + ph / 2;
    g.beginPath(); g.moveTo(cx, cy - 60); g.lineTo(cx + 40, cy); g.lineTo(cx, cy + 60); g.lineTo(cx - 40, cy); g.closePath(); g.stroke();
    g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.stroke();
  }
  // brass studs
  g.fillStyle = '#f6c25b';
  for (let y = 22; y < 768; y += 36) for (const x of [14, 240, 272, 498]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  return mk(c);
}

export function rangoliTex() {
  const S = 1024, [c, g] = cv(S, S);
  g.translate(S / 2, S / 2);
  const pal = ['#ff2d6f', '#ffb300', '#ffffff', '#2ec4b6', '#7b2ff7', '#ff6b35'];
  g.fillStyle = '#2b0a26'; g.beginPath(); g.arc(0, 0, 505, 0, 7); g.fill();
  const petals = (n, r0, r1, w, col, stroke) => {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate(i / n * Math.PI * 2);
      g.beginPath(); g.moveTo(0, -r0); g.quadraticCurveTo(w, -(r0 + r1) / 2, 0, -r1); g.quadraticCurveTo(-w, -(r0 + r1) / 2, 0, -r0);
      g.fillStyle = col(i); g.fill(); g.strokeStyle = stroke; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.arc(0, -(r0 + r1) / 2, 7, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
  };
  petals(24, 330, 495, 46, i => pal[i % 6], '#fff7e0');
  petals(16, 200, 345, 56, i => pal[(i + 2) % 6], '#fff7e0');
  petals(12, 85, 215, 52, i => pal[(i + 4) % 6], '#fff7e0');
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 470, Math.sin(a) * 470, 6, 0, 7); g.fillStyle = '#ffd24a'; g.fill(); }
  g.beginPath(); g.arc(0, 0, 90, 0, 7); g.fillStyle = '#ffb300'; g.fill();
  g.beginPath(); g.arc(0, 0, 55, 0, 7); g.fillStyle = '#ff2d6f'; g.fill();
  g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fillStyle = '#fff'; g.fill();
  return mk(c);
}

export function signTex(text, bg = '#6b1030', fg = '#ffd98a') {
  const [c, g] = cv(512, 128);
  g.fillStyle = bg; rr(g, 4, 4, 504, 120, 18); g.fill();
  g.strokeStyle = fg; g.lineWidth = 5; rr(g, 12, 12, 488, 104, 12); g.stroke();
  g.fillStyle = fg; g.font = '700 58px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  return mk(c);
}

export function lehengaTex() {
  const [c, g] = cv(256, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#f7861f'); gr.addColorStop(1, '#e4561a');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ffd36b';
  for (let r = 0; r < 8; r++) for (let i = 0; i < 8; i++) {
    const x = i * 32 + (r % 2) * 16 + 16, y = r * 32 + 16;
    g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.fill();
  }
  return mk(c, { repeat: [3, 1] });
}

export function woodBoxTex() {
  const [c, g] = cv(256, 256); const R = rand(5);
  g.fillStyle = '#c46a2a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${R() < .5 ? '60,20,6' : '240,150,70'},${.25 + R() * .4})`; g.lineWidth = 3 + R() * 7;
    g.beginPath(); const y = R() * 256; g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * .05 + i) * 14);
    g.stroke();
  }
  return mk(c);
}

export function cardTex(title = 'Happy Diwali') {
  const [c, g] = cv(256, 320);
  g.fillStyle = '#fff6e6'; g.fillRect(0, 0, 256, 320);
  g.strokeStyle = '#e0a23a'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 300);
  g.fillStyle = '#c0392b'; g.font = '700 34px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center';
  g.fillText(title, 128, 70);
  g.fillStyle = '#e8465a';
  g.save(); g.translate(128, 180); g.scale(2.2, 2.2); g.beginPath();
  g.moveTo(0, 14); g.bezierCurveTo(-30, -10, -12, -34, 0, -14); g.bezierCurveTo(12, -34, 30, -10, 0, 14); g.fill(); g.restore();
  return mk(c);
}

export function plateTex() {
  const [c, g] = cv(128, 128);
  g.fillStyle = '#f3e3c3'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#c9892b'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
  return mk(c);
}
