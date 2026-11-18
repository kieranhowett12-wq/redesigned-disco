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
    light: ['Mouse0', 'KeyJ'],
    heavy: ['Mouse2', 'KeyK'],
    dodge: ['Space'],
    parry: ['KeyQ', 'KeyF'],
    heal: ['KeyR'],
    interact: ['KeyE'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    pause: ['Escape', 'KeyP'],
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
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('blur', () => { this.keys.clear(); if (this.onBlur) this.onBlur(); });
  },

  down(a) { return this.binds[a].some(c => this.keys.has(c)); },
  hit(a) { return this.binds[a].some(c => this.pressed.has(c)); },
  clicked() { return this.pressed.has('Click'); },
  consume() { this.pressed.clear(); },
};
