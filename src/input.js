// ---------- Input (keyboard + mouse, with per-step "pressed" edges) ----------
const Input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0 },
  binds: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    light: ['Mouse0', 'KeyJ', 'Touch_light'],
    heavy: ['Mouse2', 'KeyK', 'Touch_heavy'],
    dodge: ['Space', 'Touch_dodge'],
    parry: ['KeyQ', 'KeyF', 'Touch_parry'],
    heal: ['KeyR', 'Touch_heal'],
    interact: ['KeyE', 'Touch_interact'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    pause: ['Escape', 'KeyP', 'Touch_pause'],
    confirm: ['Enter', 'NumpadEnter', 'KeyE', 'Space'],
    menuUp: ['KeyW', 'ArrowUp'],
    menuDown: ['KeyS', 'ArrowDown'],
    back: ['Escape'],
  },
  onBlur: null,

  init(canvas) {
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      Sfx.unlock();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    canvas.addEventListener('mousedown', e => {
      const c = 'Mouse' + e.button;
      this.keys.add(c); this.pressed.add(c);
      this.pressed.add('Click');
      Sfx.unlock();
    });
    addEventListener('mouseup', e => this.keys.delete('Mouse' + e.button));
    canvas.addEventListener('mousemove', e => {
      if (typeof Touch !== 'undefined' && (e.movementX || e.movementY)) Touch.active = false;
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('blur', () => { this.keys.clear(); if (this.onBlur) this.onBlur(); });
  },

  down(a) {
    if (a === 'sprint' && typeof Touch !== 'undefined' && Touch.sprinting()) return true;
    return this.binds[a].some(c => this.keys.has(c));
  },
  // movement: keyboard (digital) or touch joystick (analog), length <= 1
  moveVector() {
    let x = 0, y = 0;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    const l = Math.hypot(x, y);
    if (l) return { x: x / l, y: y / l };
    return typeof Touch !== 'undefined' ? Touch.vector() : { x: 0, y: 0 };
  },
  hit(a) { return this.binds[a].some(c => this.pressed.has(c)); },
  clicked() { return this.pressed.has('Click'); },
  consume() { this.pressed.clear(); },
};
