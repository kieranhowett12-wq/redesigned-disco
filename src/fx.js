// ---------- Particles, floating text, decals, screen shake, hit-stop ----------
class FX {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.decals = [];
    this.shake = 0;
    this.hitstop = 0;
    this.flash = 0;          // red screen flash on player damage
    this.flashColor = '#a01010';
  }

  burst(x, y, n, color, speed = 120, life = 0.5, size = 3, angle = null, spread = TAU) {
    for (let i = 0; i < n; i++) {
      const a = angle === null ? Math.random() * TAU : angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.6), max: life,
        color, size: size * (0.6 + Math.random() * 0.8), drag: 5, glow: false,
      });
    }
  }

  embers(x, y, n, color = '#ff9a3c') {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-70, -20),
        life: rand(0.5, 1.1), max: 1.1, color, size: rand(1.5, 3), drag: 1.5, glow: true,
      });
    }
  }

  text(x, y, str, color = '#fff', size = 14, life = 0.9) {
    this.texts.push({ x: x + rand(-6, 6), y, str, color, size, life, max: life, vy: -45 });
  }

  decal(x, y, r, color) {
    this.decals.push({ x, y, r, color, rot: Math.random() * TAU });
    if (this.decals.length > 250) this.decals.shift();
  }

  addShake(a) { this.shake = Math.max(this.shake, a); }
  stop(t) { this.hitstop = Math.max(this.hitstop, t); }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const f = Math.exp(-p.drag * dt);
      p.vx *= f; p.vy *= f;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-3 * dt); }
    this.texts = this.texts.filter(t => t.life > 0);
  }

  renderDecals(ctx) {
    for (const d of this.decals) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, d.rot, 0, TAU);
      ctx.fill();
    }
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  renderTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = clamp(t.life / t.max * 1.5, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px Georgia, serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(t.str, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
