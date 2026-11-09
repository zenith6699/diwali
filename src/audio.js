import musicB64 from './assets/music.mp3';
const L = (n, x) => { (window.__alog = window.__alog || []).push([window.__T || 0, n, x]); };
export class Sound {
  constructor() { this.ctx = null; this.muted = false; }
  start() {
    if (window.__rec || new URLSearchParams(location.search).has('rec')) return;
    if (this.ctx) { this.ctx.resume?.(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try { this.ctx = new C(); } catch (e) { return; }
    const c = this.ctx; this.ctx.resume?.();
    this.master = c.createGain(); this.master.gain.value = .85; this.master.connect(c.destination);
    const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = .45; this.rev.connect(rg); rg.connect(this.master);
    this.bus = c.createGain(); this.bus.connect(this.master); this.bus.connect(this.rev);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noise = nb;
    this.orbit = this.mkPan(0, 1.6, 3, 2.2, .5);
    this.music();
  }
  // the user's track plays from the first tap, looped, with a copy circling the head for the 8D feel
  music() {
    const c = this.ctx; if (this._mus) return; this._mus = 1;
    const bin = atob(musicB64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const done = buf => {
      if (!buf || !this.ctx) return;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const dry = c.createGain(), wet = c.createGain(), fade = c.createGain();
      fade.gain.setValueAtTime(0, c.currentTime); fade.gain.linearRampToValueAtTime(1, c.currentTime + 3);
      dry.gain.value = .78; wet.gain.value = .3;
      src.connect(dry); src.connect(wet); dry.connect(fade); wet.connect(this.orbit); fade.connect(this.master);
      src.start(0); this.musicSrc = src;
    };
    try { const p = c.decodeAudioData(u8.buffer.slice(0), done, () => { }); p && p.catch && p.catch(() => { }); } catch (e) { }
  }
  // ---- 8D / spatial: HRTF panners placed in world space, listener follows the camera
  setListener(pos, look) {
    if (!this.ctx) return; const L = this.ctx.listener, t = this.ctx.currentTime;
    const fx = look.x - pos.x, fy = look.y - pos.y, fz = look.z - pos.z, fl = Math.hypot(fx, fy, fz) || 1;
    this._lp = pos; this._lf = [fx / fl, fy / fl, fz / fl];
    if (L.positionX) { L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z; L.forwardX.value = fx / fl; L.forwardY.value = fy / fl; L.forwardZ.value = fz / fl; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else if (L.setPosition) { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fx / fl, fy / fl, fz / fl, 0, 1, 0); }
    // the 8D orbit: the melody circles the listener's head (~11 s per lap), slightly rising and falling
    if (this.orbit) { const a = t * .58, r = 3.2, f = this._lf, rx = f[2], rz = -f[0], rl = Math.hypot(rx, rz) || 1;
      const ox = pos.x + (Math.sin(a) * rx / rl + Math.cos(a) * f[0]) * r, oz = pos.z + (Math.sin(a) * rz / rl + Math.cos(a) * f[2]) * r, oy = pos.y + Math.sin(a * .7) * 1.2;
      this.setPan(this.orbit, ox, oy, oz); }
  }
  mkPan(x, y, z, ref = 4, roll = 1) {
    const c = this.ctx, p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 400;
    this.setPan(p, x, y, z); p.connect(this.bus); return p;
  }
  setPan(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
  at(v, ref, roll) { return v && this.ctx ? this.mkPan(v.x, v.y, v.z, ref, roll) : this.bus; }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : .85, this.ctx.currentTime, .05); }
  tone(f, t0, dur, type = 'sine', gain = .1, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.bus); o.start(t0); o.stop(t0 + dur + .05);
  }
  ambient() {
    const c = this.ctx, g = c.createGain(); g.gain.value = .0; g.gain.linearRampToValueAtTime(.05, c.currentTime + 4); g.connect(this.bus);
    [73.42, 110, 146.83, 220.5].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f + (i % 2 ? .3 : -.2);
      const og = c.createGain(); og.gain.value = [.9, .6, .35, .12][i]; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07 + i * .03; lg.gain.value = .25; lfo.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(g); o.start(); lfo.start();
    });
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25], seq = [0, 2, 4, 3, 2, 1, 0, 2, 3, 4, 5, 4, 3, 2];
    let i = 0;
    const pluck = () => {
      if (!this.ctx) return;
      const t = c.currentTime + .05, f = scale[seq[i++ % seq.length]];
      if (!this.muted) {
        this.tone(f, t, 2.2, 'triangle', .09, this.orbit); this.tone(f * 2, t, 1.2, 'sine', .035, this.orbit);
      }
      setTimeout(pluck, 1300 + Math.random() * 1500);
    };
    setTimeout(pluck, 1800);
  }
  noiseBurst(t0, dur, type, f0, f1, gain, q = .8, dest) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.bus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  whoosh(at) { L('whoosh'); if (!this.ctx) return; this.noiseBurst(this.ctx.currentTime, .85, 'bandpass', 500, 2600, .12, 1.2, at && this.at(at, 14, .6)); }
  boom(size = .7, at) {
    L('boom', size); if (!this.ctx) return; const c = this.ctx; let dst = this.bus, dly = 0;
    if (at) { dst = this.at(at, 30, .55); const lp = this._lp; if (lp) dly = Math.min(.45, Math.hypot(at.x - lp.x, at.y - lp.y, at.z - lp.z) / 260); }
    const t = c.currentTime + .02 + dly;
    this.noiseBurst(t, 1.3, 'lowpass', 900, 70, .55 * size, .7, dst);
    const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + .6);
    g.gain.setValueAtTime(.5 * size, t); g.gain.exponentialRampToValueAtTime(.0001, t + .8); o.connect(g); g.connect(dst); o.start(t); o.stop(t + .9);
    for (let i = 0; i < 9; i++) this.noiseBurst(t + .25 + Math.random() * 1.4, .06, 'highpass', 4200, 6000, .05 * size, .5, dst);
  }
  crackle(dur = 5, at) {
    L('crackle', dur); if (!this.ctx) return; const t = this.ctx.currentTime, d = at ? this.at(at, 2.5, 1) : this.bus;
    for (let i = 0; i < dur * 11; i++) this.noiseBurst(t + Math.random() * dur, .04 + Math.random() * .04, 'highpass', 3000 + Math.random() * 3000, 7000, .04 + Math.random() * .05, .4, d);
    this.noiseBurst(t, dur, 'highpass', 5200, 5800, .03, .3, d);
  }
  bell(at) {
    L('bell'); if (!this.ctx) return; const c = this.ctx, t = c.currentTime + .02, base = 540, d = at ? this.at(at, 6, .8) : this.bus;
    [[1, .5, 4.2], [2.76, .32, 3.2], [5.4, .2, 2.4], [8.93, .1, 1.6], [.5, .25, 5]].forEach(([r, gn, du]) => this.tone(base * r, t, du, 'sine', gn * .22, d));
    this.noiseBurst(t, .08, 'bandpass', 3000, 3200, .12, 2, d);
  }
  chime(at) {
    L('chime'); if (!this.ctx) return; const t = this.ctx.currentTime + .02, d = at ? this.at(at, 3, 1) : this.bus;
    [880, 1108.7, 1318.5, 1760, 2217].forEach((f, i) => this.tone(f, t + i * .11, 1.8, 'sine', .07, d));
  }
  heart() { L('heart'); if (!this.ctx) return; const t = this.ctx.currentTime + .02;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * .16, 2.8, 'triangle', .06, this.orbit)); }
}
