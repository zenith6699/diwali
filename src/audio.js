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
    this.ambient();
  }
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
        this.tone(f, t, 2.2, 'triangle', .05); this.tone(f * 2, t, 1.2, 'sine', .018);
      }
      setTimeout(pluck, 1300 + Math.random() * 1500);
    };
    setTimeout(pluck, 1800);
  }
  noiseBurst(t0, dur, type, f0, f1, gain, q = .8) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  whoosh() { L('whoosh'); if (!this.ctx) return; this.noiseBurst(this.ctx.currentTime, .85, 'bandpass', 500, 2600, .12, 1.2); }
  boom(size = .7) {
    L('boom', size); if (!this.ctx) return; const c = this.ctx, t = c.currentTime + .02;
    this.noiseBurst(t, 1.3, 'lowpass', 900, 70, .55 * size, .7);
    const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + .6);
    g.gain.setValueAtTime(.5 * size, t); g.gain.exponentialRampToValueAtTime(.0001, t + .8); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + .9);
    for (let i = 0; i < 9; i++) this.noiseBurst(t + .25 + Math.random() * 1.4, .06, 'highpass', 4200, 6000, .05 * size, .5);
  }
  crackle(dur = 5) {
    L('crackle', dur); if (!this.ctx) return; const t = this.ctx.currentTime;
    for (let i = 0; i < dur * 22; i++) this.noiseBurst(t + Math.random() * dur, .04 + Math.random() * .04, 'highpass', 3000 + Math.random() * 3000, 7000, .04 + Math.random() * .05, .4);
    this.noiseBurst(t, dur, 'highpass', 5200, 5800, .03, .3);
  }
  bell() {
    L('bell'); if (!this.ctx) return; const c = this.ctx, t = c.currentTime + .02, base = 540;
    [[1, .5, 4.2], [2.76, .32, 3.2], [5.4, .2, 2.4], [8.93, .1, 1.6], [.5, .25, 5]].forEach(([r, gn, d]) => this.tone(base * r, t, d, 'sine', gn * .22));
    this.noiseBurst(t, .08, 'bandpass', 3000, 3200, .12, 2);
  }
  chime() {
    L('chime'); if (!this.ctx) return; const t = this.ctx.currentTime + .02;
    [880, 1108.7, 1318.5, 1760, 2217].forEach((f, i) => this.tone(f, t + i * .11, 1.8, 'sine', .07));
  }
  heart() { L('heart'); if (!this.ctx) return; const t = this.ctx.currentTime + .02;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * .16, 2.8, 'triangle', .06)); }
}
