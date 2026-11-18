// ---------- Tiny synthesized SFX (no asset files) ----------
const Sfx = {
  ctx: null, master: null, noiseBuf: null, last: {},

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },

  tone(freq, dur, type = 'sine', vol = 0.3, slide = 1, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol = 0.3, freq = 1200, type = 'lowpass', delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.ctx) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 40) return; // rate-limit spam
    this.last[name] = now;
    try {
      switch (name) {
        case 'swing': this.noise(0.12, 0.12, 2600, 'bandpass'); break;
        case 'heavyswing': this.noise(0.22, 0.16, 1400, 'bandpass'); break;
        case 'hit': this.noise(0.09, 0.3, 900); this.tone(150, 0.09, 'square', 0.08, 0.5); break;
        case 'heavyhit': this.noise(0.16, 0.4, 600); this.tone(90, 0.16, 'square', 0.12, 0.5); break;
        case 'crit': this.noise(0.25, 0.45, 700); this.tone(70, 0.35, 'sawtooth', 0.18, 0.5); break;
        case 'hurt': this.tone(200, 0.22, 'sawtooth', 0.16, 0.45); this.noise(0.12, 0.25, 700); break;
        case 'dodge': this.noise(0.18, 0.1, 500, 'bandpass'); break;
        case 'parry': this.tone(1300, 0.4, 'triangle', 0.22, 0.98); this.tone(1950, 0.3, 'sine', 0.12, 0.99); this.noise(0.08, 0.2, 4000, 'highpass'); break;
        case 'parryfail': this.tone(500, 0.08, 'triangle', 0.06); break;
        case 'boom': this.tone(60, 0.5, 'sine', 0.45, 0.4); this.noise(0.4, 0.35, 280); break;
        case 'thud': this.tone(80, 0.25, 'sine', 0.3, 0.5); this.noise(0.15, 0.2, 400); break;
        case 'arrow': this.noise(0.08, 0.1, 3200, 'highpass'); break;
        case 'pickup': this.tone(880 + Math.random() * 300, 0.07, 'sine', 0.06, 1.6); break;
        case 'heal': this.tone(392, 0.5, 'sine', 0.14, 1.5); this.tone(587, 0.5, 'sine', 0.08, 1.5, 0.08); break;
        case 'door': this.tone(70, 0.5, 'square', 0.1, 0.7); this.noise(0.4, 0.2, 300); break;
        case 'roar': this.tone(70, 1.3, 'sawtooth', 0.28, 0.6); this.noise(1.0, 0.25, 500); break;
        case 'die': this.tone(300, 0.3, 'triangle', 0.1, 0.3); break;
        case 'youdied': this.tone(110, 2.2, 'sine', 0.3, 0.5); this.tone(165, 2.2, 'sine', 0.15, 0.5); break;
        case 'victory': [262, 330, 392, 523].forEach((f, i) => this.tone(f, 1.4, 'triangle', 0.12, 1, i * 0.18)); break;
        case 'ui': this.tone(620, 0.05, 'square', 0.04); break;
        case 'levelup': this.tone(523, 0.3, 'triangle', 0.12, 1.5); break;
        case 'stagger': this.tone(240, 0.3, 'square', 0.08, 0.5); break;
        case 'tired': this.tone(160, 0.12, 'square', 0.05); break;
      }
    } catch (e) { /* ignore audio errors */ }
  },
};
