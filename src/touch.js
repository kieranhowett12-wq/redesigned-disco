// ---------- Touch controls (phones / tablets) ----------
// Left side: floating virtual joystick (analog movement).
// Right side: action buttons. Tap ROLL to dodge, hold it to sprint (souls-style).
// Aim is automatic on touch: nearest awake enemy in sight, else movement direction.
const Touch = {
  active: false,           // true while the touch UI should be shown / used
  stick: null,             // { id, ox, oy, x, y }
  held: new Map(),         // touch id -> button id
  rollStart: null,
  buttons: [],
  s: 1,
  controlsLive: () => false, // set by Game: are we in gameplay (vs menus/screens)?
  RADIUS: 58,

  init(canvas) {
    try { this.active = matchMedia('(pointer: coarse)').matches; } catch (e) { }
    const opt = { passive: false };
    canvas.addEventListener('touchstart', e => this.onStart(e), opt);
    canvas.addEventListener('touchmove', e => this.onMove(e), opt);
    canvas.addEventListener('touchend', e => this.onEnd(e), opt);
    canvas.addEventListener('touchcancel', e => this.onEnd(e), opt);
    addEventListener('keydown', () => { this.active = false; });
  },

  layout(W, H) {
    const s = clamp(Math.min(W, H) / 400, 0.8, 1.4);
    this.s = s;
    this.buttons = [
      { id: 'light', label: 'ATTACK', x: W - 78 * s, y: H - 78 * s, r: 42 * s, color: '#d8c8a8' },
      { id: 'dodge', label: 'ROLL', sub: 'hold: run', x: W - 172 * s, y: H - 56 * s, r: 33 * s, color: '#8fb0d8' },
      { id: 'heavy', label: 'HEAVY', x: W - 60 * s, y: H - 172 * s, r: 30 * s, color: '#e0a060' },
      { id: 'parry', label: 'PARRY', x: W - 150 * s, y: H - 148 * s, r: 28 * s, color: '#ffd27a' },
      { id: 'heal', label: 'FLASK', x: W - 250 * s, y: H - 44 * s, r: 24 * s, color: '#e0913a' },
      { id: 'interact', label: 'USE', x: W - 240 * s, y: H - 122 * s, r: 27 * s, color: '#9fe0ff', contextual: true },
      { id: 'pause', label: 'II', x: W / 2, y: 26 * s, r: 18 * s, color: '#b8a890', small: true },
    ];
    this.stickHome = { x: 110 * s, y: H - 110 * s };
  },

  buttonAt(x, y) {
    for (const b of this.buttons) {
      if (b.contextual && !this.showInteract) continue;
      if (Math.hypot(x - b.x, y - b.y) < b.r * 1.25) return b;
    }
    return null;
  },

  pos(t, canvas) {
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  },

  onStart(e) {
    e.preventDefault();
    this.active = true;
    Sfx.unlock();
    const live = this.controlsLive();
    for (const t of e.changedTouches) {
      const p = this.pos(t, e.target);
      if (!live) {
        // menus & screens: a tap behaves like a mouse click at that point
        Input.mouse.x = p.x; Input.mouse.y = p.y;
        Input.pressed.add('Click');
        continue;
      }
      const b = this.buttonAt(p.x, p.y);
      if (b) {
        this.held.set(t.identifier, b.id);
        if (b.id === 'dodge') this.rollStart = performance.now();
        else this.press(b.id);
      } else if (!this.stick && p.x < innerWidth * 0.5) {
        this.stick = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
      }
    }
  },

  onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) {
        const p = this.pos(t, e.target);
        this.stick.x = p.x; this.stick.y = p.y;
        // let the base trail the thumb so the stick never "runs out"
        const R = this.RADIUS * this.s, dx = p.x - this.stick.ox, dy = p.y - this.stick.oy, d = Math.hypot(dx, dy);
        if (d > R * 1.4) { this.stick.ox = p.x - dx / d * R * 1.4; this.stick.oy = p.y - dy / d * R * 1.4; }
      }
    }
  },

  onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) this.stick = null;
      const id = this.held.get(t.identifier);
      if (id) {
        this.held.delete(t.identifier);
        if (id === 'dodge') {
          if (this.rollStart != null && performance.now() - this.rollStart < 280) this.press('dodge');
          this.rollStart = null;
        }
      }
    }
  },

  press(id) { Input.pressed.add('Touch_' + id); },

  sprinting() { return this.rollStart != null && performance.now() - this.rollStart >= 280; },

  // analog movement vector, length 0..1
  vector() {
    if (!this.stick) return { x: 0, y: 0 };
    const R = this.RADIUS * this.s;
    let dx = (this.stick.x - this.stick.ox) / R, dy = (this.stick.y - this.stick.oy) / R;
    let m = Math.hypot(dx, dy);
    if (m < 0.18) return { x: 0, y: 0 };
    if (m > 1) { dx /= m; dy /= m; m = 1; }
    const k = Math.min(1, (m - 0.18) / 0.62) / m; // remap dead zone, reach full speed before the rim
    return { x: dx * k, y: dy * k };
  },

  reset() { this.stick = null; this.held.clear(); this.rollStart = null; },

  render(ctx, game) {
    if (!this.active || !this.controlsLive()) return;
    const s = this.s;
    // joystick
    const R = this.RADIUS * s;
    const st = this.stick;
    const ox = st ? st.ox : this.stickHome.x, oy = st ? st.oy : this.stickHome.y;
    ctx.fillStyle = st ? 'rgba(20,15,25,0.35)' : 'rgba(20,15,25,0.2)';
    ctx.strokeStyle = st ? 'rgba(216,200,168,0.45)' : 'rgba(216,200,168,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.fill(); ctx.stroke();
    let kx = ox, ky = oy;
    if (st) {
      const dx = st.x - ox, dy = st.y - oy, d = Math.hypot(dx, dy);
      const c = Math.min(d, R);
      if (d > 0) { kx = ox + dx / d * c; ky = oy + dy / d * c; }
    }
    ctx.fillStyle = st ? 'rgba(216,200,168,0.55)' : 'rgba(216,200,168,0.2)';
    ctx.beginPath(); ctx.arc(kx, ky, R * 0.42, 0, TAU); ctx.fill();
    if (!st) {
      ctx.fillStyle = 'rgba(216,200,168,0.35)';
      ctx.font = `${Math.round(11 * s)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MOVE', ox, oy + R + 14 * s);
    }

    // buttons
    const heldIds = new Set(this.held.values());
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of this.buttons) {
      if (b.contextual && !this.showInteract) continue;
      const down = heldIds.has(b.id);
      let alpha = down ? 0.6 : 0.3;
      if (b.id === 'heal' && game.player.flasks <= 0) alpha = 0.12;
      if (b.contextual) alpha = 0.45 + 0.2 * Math.sin(game.time * 5);
      ctx.fillStyle = rgba(b.color, alpha * 0.45);
      ctx.strokeStyle = rgba(b.color, Math.min(1, alpha + 0.25));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (down ? 0.94 : 1), 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(b.color, Math.min(1, alpha + 0.45));
      ctx.font = `bold ${Math.round((b.small ? 12 : b.r > 38 * s ? 13 : 11) * s)}px ${FONT}`;
      ctx.fillText(b.label, b.x, b.y - (b.sub ? 5 * s : 0));
      if (b.sub) { ctx.font = `${Math.round(8 * s)}px ${FONT}`; ctx.fillText(b.sub, b.x, b.y + 8 * s); }
      if (b.id === 'heal') { ctx.font = `${Math.round(10 * s)}px ${FONT}`; ctx.fillText(`×${game.player.flasks}`, b.x, b.y + b.r + 9 * s); }
    }
    if (this.sprinting()) {
      const b = this.buttons.find(x => x.id === 'dodge');
      ctx.strokeStyle = 'rgba(143,176,216,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5 * s, 0, TAU); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
  },
};
