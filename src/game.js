// ---------- Game: state machine, floor loading, world update, rendering ----------
const Game = {
  state: 'title',
  toasts: [],
  meta: { runs: 0, deaths: 0, wardens: 0, best: 0 },

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Input.init(this.canvas);
    Input.onBlur = () => { if (this.state === 'play' && !this.player.dead) this.openPause(); };
    this.resize();
    addEventListener('resize', () => this.resize());
    this.fx = new FX();
    this.titleFx = new FX();
    this.loadMeta();
    this.acc = 0;
    this.last = performance.now();
    this.time = 0;
    requestAnimationFrame(t => this.loop(t));
  },

  loadMeta() { try { const m = JSON.parse(localStorage.getItem('ashenspire.meta')); if (m) Object.assign(this.meta, m); } catch (e) { } },
  saveMeta() { try { localStorage.setItem('ashenspire.meta', JSON.stringify(this.meta)); } catch (e) { } },

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = innerWidth; this.H = innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.zoom = clamp(Math.min(this.W / 980, this.H / 600), 0.55, 2.4);
    this.viewW = this.W / this.zoom; this.viewH = this.H / this.zoom;
    this.ui = clamp(Math.min(this.W / 1280, this.H / 760), 0.62, 1.5);
  },

  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 6) {
      this.update(step);
      Input.consume();
      this.acc -= step; n++;
    }
    if (n >= 6) this.acc = 0;
    this.render();
    requestAnimationFrame(t => this.loop(t));
  },

  // ---------------- run / floor lifecycle ----------------
  newRun() {
    const seed = (Math.random() * 1e9) | 0;
    this.run = {
      seed, floor: 0, level: 1, vigor: 0, endurance: 0, strength: 0,
      embers: 0, relics: [], kills: 0, time: 0, hp: null, flasks: null, dmgDealt: 0,
    };
    this.meta.runs++; this.saveMeta();
    this.loadFloor(0);
  },

  loadFloor(i) {
    const cfg = FLOORS[i];
    this.floorCfg = cfg; this.run.floor = i;
    const rng = new RNG((this.run.seed ^ (i * 0x9E3779B1)) >>> 0);
    this.map = generateDungeon(rng, cfg);
    this.mapCanvas = renderMapCanvas(this.map, cfg.palette);
    this.enemies = []; this.projectiles = []; this.shockwaves = [];
    this.pickups = []; this.interactables = [];
    this.fx = new FX();
    this.toasts = [];
    this.bossActive = null; this.bossDead = false;
    this.deathT = 0;
    this.populate(rng, cfg);
    this.player = new Player(this.map.start.x, this.map.start.y, this.run);
    this.cam = { x: this.player.x, y: this.player.y };
    this.minimap = new Minimap(this.map);
    this.map.revealAround(this.player.x, this.player.y, 6);
    this.state = 'play';
    this.toast(`${cfg.name}`, cfg.title, 4, 'title');
  },

  populate(rng, cfg) {
    const m = this.map;
    for (const room of m.rooms) {
      if (room.type === 'combat') {
        let budget = Math.round(lerp(cfg.budget[0], cfg.budget[1], room.depth) + rng.range(-0.6, 1.2));
        if (room.elite) budget += 3;
        const spawns = [];
        if (room.elite) spawns.push('brute');
        let guard = 0;
        while (budget > 0 && guard++ < 40) {
          const opts = cfg.enemyPool.filter(([t]) => ENEMY_TYPES[t].cost <= budget);
          if (!opts.length) break;
          const t = weightedPick(opts, () => rng.next());
          spawns.push(t); budget -= ENEMY_TYPES[t].cost;
        }
        const tiles = rng.shuffle(m.roomTiles(room, 3));
        const placed = [];
        for (const t of spawns) {
          const spot = tiles.find(([x, y]) => placed.every(([px, py]) => Math.hypot(px - x, py - y) >= 2.2));
          if (!spot) break;
          placed.push(spot);
          const e = new Enemy(t, (spot[0] + 0.5) * TILE, (spot[1] + 0.5) * TILE, cfg);
          e.room = room; room.enemies.push(e); this.enemies.push(e);
        }
      } else if (room.type === 'treasure') {
        this.interactables.push({ type: 'chest', x: room.cx, y: room.cy, used: false });
      } else if (room.type === 'shrine') {
        this.interactables.push({ type: 'shrine', x: room.cx, y: room.cy, used: false });
      } else if (room.type === 'boss') {
        const b = new Boss(cfg.boss, room.cx, room.cy, cfg);
        b.room = room; b.facing = Math.PI / 2;
        room.enemies.push(b); this.enemies.push(b);
      }
      if (room.hasShrine) this.interactables.push({ type: 'shrine', x: room.cx, y: room.cy - TILE * 2, used: false });
    }
  },

  ascend() {
    const next = this.run.floor + 1;
    this.run.hp = this.player.hp;
    this.run.flasks = this.player.maxFlasks; // flasks refill between floors
    this.meta.best = Math.max(this.meta.best, next); this.saveMeta();
    if (FLOORS[next]) {
      this.loadFloor(next);
    } else {
      this.state = 'victory'; this.stateT = 0;
      Sfx.play('victory');
    }
  },

  // ---------------- helpers used by entities ----------------
  mouseWorld() {
    return {
      x: this.cam.x - this.viewW / 2 + Input.mouse.x / this.zoom,
      y: this.cam.y - this.viewH / 2 + Input.mouse.y / this.zoom,
    };
  },

  countAttackers(self) {
    let n = 0;
    for (const e of this.enemies)
      if (e !== self && !e.dead && !e.isBoss && e.isAttacking() && !!e.def.ranged === !!self.def.ranged) n++;
    return n;
  },

  toast(text, sub = '', dur = 2.5, style = 'small') {
    this.toasts = this.toasts.filter(t => t.style !== style);
    this.toasts.push({ text, sub, t: 0, dur, style });
  },

  onEnemyKilled(e) {
    this.run.kills++;
    this.fx.burst(e.x, e.y, 30, e.def.dark, 220, 0.8, 4);
    this.fx.embers(e.x, e.y, 18);
    this.fx.decal(e.x, e.y, e.r * 0.9, 'rgba(40,10,15,0.5)');
    Sfx.play('die');
    // ember drops
    const total = Math.round(e.def.embers * (this.floorCfg.emberMult || 1));
    const n = e.isBoss ? 30 : Math.max(2, Math.round(total / 5));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(60, e.isBoss ? 320 : 160);
      this.pickups.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, value: total / n, t: 0 });
    }
    if (e.isBoss) {
      this.bossDead = true;
      this.meta.wardens++; this.saveMeta();
      this.fx.stop(0.35); this.fx.addShake(20);
      Sfx.play('victory');
    }
  },

  onPlayerDeath() {
    this.deathT = 0;
    this.meta.deaths++; this.saveMeta();
    Sfx.play('youdied');
  },

  fullyInside(p, room) {
    const m = this.map, pad = p.r + 4;
    for (const [ox, oy] of [[-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad]])
      if (m.roomAt(p.x + ox, p.y + oy) !== room.id) return false;
    return true;
  },

  activateRoom(room) {
    const alive = room.enemies.filter(e => !e.dead);
    if (!alive.length) { room.cleared = true; return; }
    room.active = true;
    for (const d of room.doors) this.map.locked[d] = 1;
    Sfx.play('door');
    this.fx.addShake(3);
    alive.forEach((e, i) => e.wake(0.35 + i * 0.12 + Math.random() * 0.2));
    if (room.type === 'boss') {
      const b = alive.find(e => e.isBoss);
      if (b) {
        this.bossActive = b;
        b.state = 'waking'; b.t = 0; b.dur = 1.8;
        this.toast(b.def.name, '', 3.2, 'boss');
        Sfx.play('roar');
      }
    }
  },

  clearRoom(room) {
    room.active = false; room.cleared = true;
    for (const d of room.doors) this.map.locked[d] = 0;
    Sfx.play('door');
    if (room.type === 'boss') {
      this.toast('WARDEN FELLED', 'A stairway rises from the ashes', 5, 'victory');
      this.interactables.push({ type: 'stairs', x: room.cx, y: room.cy, used: false });
      this.fx.embers(room.cx, room.cy, 60, '#ffd27a');
    } else {
      this.toast('Chamber cleansed', '', 1.8, 'small');
      if (room.elite) {
        this.interactables.push({ type: 'chest', x: room.cx, y: room.cy, used: false, elite: true });
        this.fx.embers(room.cx, room.cy, 30, '#ffd27a');
      }
    }
  },

  interact(it) {
    const p = this.player;
    if (it.type === 'chest') {
      it.used = true;
      Sfx.play('levelup');
      this.fx.embers(it.x, it.y, 30, '#ffd27a');
      const choices = rollRelics(this.run, 3);
      if (!choices.length) { this.run.embers += 100; this.toast('The chest holds only embers', '+100', 2); return; }
      openRelicMenu(this, choices);
    } else if (it.type === 'shrine') {
      openShrineMenu(this, it);
    } else if (it.type === 'stairs') {
      this.ascend();
    }
  },

  openPause() { openPauseMenu(this); },

  // ---------------- update ----------------
  update(dt) {
    this.time += dt;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter(t => t.t < t.dur);

    switch (this.state) {
      case 'title':
        this.titleFx.update(dt);
        if (Math.random() < 0.5) this.titleFx.embers(rand(0, this.W), this.H + 10, 1);
        for (const p of this.titleFx.particles) p.vy -= 20 * dt;
        if (Input.hit('confirm') || Input.clicked()) { Sfx.unlock(); Sfx.play('ui'); this.newRun(); }
        break;
      case 'play': this.updatePlay(dt); break;
      case 'menu': updateMenu(this, dt); break;
      case 'victory':
        this.stateT += dt;
        this.fx.update(dt);
        if (this.stateT > 2 && (Input.hit('confirm') || Input.clicked())) this.state = 'title';
        break;
    }
  },

  updatePlay(dt) {
    const p = this.player;
    if (p.dead) {
      this.deathT += dt;
      if (this.deathT > 2.6 && (Input.hit('confirm') || Input.clicked())) { this.state = 'title'; return; }
    } else if (Input.hit('pause')) { this.openPause(); return; }

    if (this.fx.hitstop > 0) { this.fx.hitstop -= dt; this.fx.shake = Math.max(0, this.fx.shake - dt * 20); return; }
    this.fx.update(dt);
    if (!p.dead) this.run.time += dt;

    p.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);

    // separation (enemies vs enemies, enemies vs player)
    const live = this.enemies.filter(e => !e.dead && !e.airborne && e.state !== 'asleep');
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      for (let j = i + 1; j < live.length; j++) {
        const b = live[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d > 0 && d < min) {
          const push = (min - d) / 2, ux = dx / d, uy = dy / d;
          const wa = a.isBoss ? 0.1 : 1, wb = b.isBoss ? 0.1 : 1;
          a.x -= ux * push * wa; a.y -= uy * push * wa;
          b.x += ux * push * wb; b.y += uy * push * wb;
        }
      }
      if (!p.dead && p.state !== 'dodge') {
        const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy), min = a.r + p.r;
        if (d > 0 && d < min) {
          const push = min - d, ux = dx / d, uy = dy / d;
          const share = a.isBoss || a.isHyper() ? 1 : 0.7;
          p.x += ux * push * share; p.y += uy * push * share;
          a.x -= ux * push * (1 - share); a.y -= uy * push * (1 - share);
        }
      }
    }
    for (const e of live) this.map.collideCircle(e);
    this.map.collideCircle(p);

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    for (const s of this.shockwaves) s.update(dt, this);
    this.shockwaves = this.shockwaves.filter(s => !s.dead);
    this.enemies = this.enemies.filter(e => !e.dead || e.deathT < 0.8);

    // embers
    for (const o of this.pickups) {
      o.t += dt;
      const d = dist(o.x, o.y, p.x, p.y);
      if (o.t > 0.5 && !p.dead && d < 280) {
        const k = 700 / Math.max(d, 20);
        o.vx += (p.x - o.x) / d * k * 60 * dt; o.vy += (p.y - o.y) / d * k * 60 * dt;
      }
      const f = Math.exp(-3 * dt); o.vx *= f; o.vy *= f;
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (d < p.r + 6 && o.t > 0.3) {
        o.dead = true;
        this.run.embers += o.value * p.mods.emberGain;
        Sfx.play('pickup');
      }
    }
    this.pickups = this.pickups.filter(o => !o.dead);
    this.run.embers = Math.round(this.run.embers * 100) / 100;

    // rooms
    const rid = this.map.roomAt(p.x, p.y);
    if (rid >= 0) {
      const room = this.map.rooms[rid];
      if (!room.visited) { room.visited = true; this.map.revealRect(room.x - 1, room.y - 1, room.x + room.w, room.y + room.h); }
      if (!room.cleared && !room.active && !p.dead && this.fullyInside(p, room)) this.activateRoom(room);
    }
    for (const room of this.map.rooms) {
      if (room.active && room.enemies.every(e => e.dead)) this.clearRoom(room);
    }
    if (this.bossActive && this.bossActive.dead && this.bossActive.deathT > 0.8) this.bossActive = null;

    // interactables
    this.prompt = null;
    if (!p.dead) {
      let best = null, bd = 52;
      for (const it of this.interactables) {
        if (it.used && it.type !== 'shrine') continue;
        const d = dist(it.x, it.y, p.x, p.y);
        if (d < bd) { bd = d; best = it; }
      }
      this.prompt = best;
      if (best && Input.hit('interact') && (p.state === 'idle')) this.interact(best);
    }

    // camera
    const mw = this.mouseWorld();
    const lx = clamp((mw.x - p.x) * 0.15, -90, 90), ly = clamp((mw.y - p.y) * 0.15, -70, 70);
    const k = 1 - Math.exp(-7 * dt);
    this.cam.x += (p.x + lx - this.cam.x) * k;
    this.cam.y += (p.y + ly - this.cam.y) * k;

    this.map.revealAround(p.x, p.y, 6);
    this.minimap.update(dt);
  },

  // ---------------- render ----------------
  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07060a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'title') { renderTitle(this, ctx); return; }
    if (!this.map) return;

    this.renderWorld(ctx);
    ctx.setTransform(this.dpr * this.ui, 0, 0, this.dpr * this.ui, 0, 0);
    renderHUD(this, ctx);
    if (this.state === 'menu') renderMenu(this, ctx);
    if (this.state === 'victory') renderVictory(this, ctx);
    if (this.player.dead) renderDeath(this, ctx);
  },

  renderWorld(ctx) {
    const z = this.zoom * this.dpr;
    const sh = this.fx.shake;
    const camX = this.cam.x - this.viewW / 2 + (sh ? rand(-sh, sh) : 0);
    const camY = this.cam.y - this.viewH / 2 + (sh ? rand(-sh, sh) : 0);
    ctx.setTransform(z, 0, 0, z, -camX * z, -camY * z);
    const pal = this.floorCfg.palette;
    const m = this.map;

    // map
    const sx = clamp(Math.floor(camX), 0, this.mapCanvas.width - 1);
    const sy = clamp(Math.floor(camY), 0, this.mapCanvas.height - 1);
    const sw = clamp(Math.ceil(this.viewW) + 2, 1, this.mapCanvas.width - sx);
    const shh = clamp(Math.ceil(this.viewH) + 2, 1, this.mapCanvas.height - sy);
    ctx.drawImage(this.mapCanvas, sx, sy, sw, shh, sx, sy, sw, shh);

    this.fx.renderDecals(ctx);

    // locked doors (fog gates)
    const tx0 = Math.max(0, Math.floor(camX / TILE)), ty0 = Math.max(0, Math.floor(camY / TILE));
    const tx1 = Math.min(m.w - 1, Math.ceil((camX + this.viewW) / TILE)), ty1 = Math.min(m.h - 1, Math.ceil((camY + this.viewH) / TILE));
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const i = m.idx(x, y);
      if (!m.locked[i]) continue;
      const px = x * TILE, py = y * TILE;
      const fl = 0.55 + 0.25 * Math.sin(this.time * 6 + x * 1.3 + y * 0.7);
      ctx.fillStyle = `rgba(30,20,30,0.9)`;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = rgba(pal.accent, fl * 0.55);
      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = `rgba(255,230,180,${fl * 0.5})`;
      for (let k = 0; k < 3; k++) ctx.fillRect(px + 6 + k * 9, py + 4, 2, TILE - 8);
    }

    // interactables
    for (const it of this.interactables) renderInteractable(this, ctx, it);

    // embers on floor
    for (const o of this.pickups) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,150,50,0.35)';
      ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath(); ctx.arc(o.x, o.y, 2.2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    for (const e of this.enemies) e.renderTelegraph(ctx);
    for (const s of this.shockwaves) s.render(ctx);

    const ents = [...this.enemies.filter(e => !e.airborne), this.player].sort((a, b) => a.y - b.y);
    for (const e of ents) e.render(ctx, this);
    for (const e of this.enemies) if (e.airborne) e.render(ctx, this);
    for (const pr of this.projectiles) pr.render(ctx);
    this.fx.renderParticles(ctx);

    // fog of war
    ctx.fillStyle = pal.void;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++)
      if (!m.seen[m.idx(x, y)]) ctx.fillRect(x * TILE - 0.5, y * TILE - 0.5, TILE + 1, TILE + 1);

    // darkness + light
    const p = this.player;
    const g = ctx.createRadialGradient(p.x, p.y, 90, p.x, p.y, Math.max(this.viewW, this.viewH) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(camX - 10, camY - 10, this.viewW + 20, this.viewH + 20);

    // torches
    ctx.globalCompositeOperation = 'lighter';
    for (const t of m.torches) {
      if (t.x < camX - 100 || t.x > camX + this.viewW + 100 || t.y < camY - 100 || t.y > camY + this.viewH + 100) continue;
      if (!m.seen[m.idx(Math.floor(t.x / TILE), Math.floor(t.y / TILE) + 1)]) continue;
      const fl = 0.8 + 0.2 * Math.sin(this.time * 9 + t.phase) + 0.1 * Math.sin(this.time * 23 + t.phase);
      const tg = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 90 * fl);
      tg.addColorStop(0, 'rgba(255,150,60,0.28)');
      tg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(t.x - 100, t.y - 100, 200, 200);
      ctx.fillStyle = `rgba(255,210,120,${0.8 * fl})`;
      ctx.fillRect(t.x - 2, t.y - 5 - fl * 2, 4, 6);
    }
    ctx.globalCompositeOperation = 'source-over';

    this.fx.renderTexts(ctx);

    // interact prompt
    if (this.prompt && this.state === 'play') {
      const it = this.prompt;
      const label = { chest: 'Open chest', shrine: 'Kneel at shrine', stairs: 'Ascend the spire' }[it.type];
      ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(`[E] ${label}`).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(it.x - w / 2, it.y - 46, w, 20);
      ctx.fillStyle = '#f0e2c0'; ctx.fillText(`[E] ${label}`, it.x, it.y - 36);
    }
  },
};

window.addEventListener('load', () => Game.init());
