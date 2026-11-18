// ---------- HUD, minimap, menus, screens ----------
const FONT = 'Georgia, "Times New Roman", serif';

class Minimap {
  constructor(map) {
    this.map = map;
    this.scale = 2;
    this.c = document.createElement('canvas');
    this.c.width = map.w * this.scale; this.c.height = map.h * this.scale;
    this.g = this.c.getContext('2d');
    this.timer = 0;
    this.redraw();
  }
  update(dt) { this.timer -= dt; if (this.timer <= 0) { this.timer = 0.25; this.redraw(); } }
  redraw() {
    const m = this.map, g = this.g, s = this.scale;
    const img = g.createImageData(this.c.width, this.c.height);
    const d = img.data;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = m.idx(x, y);
      if (!m.seen[i] || m.tiles[i] !== T_FLOOR) continue;
      const rid = m.room[i];
      let c = [90, 84, 96];
      if (rid >= 0) {
        const r = m.rooms[rid];
        c = r.type === 'boss' ? [140, 50, 60] : r.type === 'shrine' ? [200, 150, 80] : r.cleared ? [120, 112, 128] : [150, 110, 110];
      }
      if (m.locked[i]) c = [230, 140, 60];
      for (let oy = 0; oy < s; oy++) for (let ox = 0; ox < s; ox++) {
        const p = ((y * s + oy) * this.c.width + (x * s + ox)) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 230;
      }
    }
    g.putImageData(img, 0, 0);
  }
}

// ---------- HUD ----------
function bar(ctx, x, y, w, h, frac, color, trail = null, trailColor = '#e8dcc0') {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#1a1418';
  ctx.fillRect(x, y, w, h);
  if (trail != null) { ctx.fillStyle = trailColor; ctx.fillRect(x, y, w * clamp(trail, 0, 1), h); }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), Math.max(1, h * 0.3));
}

function renderHUD(game, ctx) {
  const p = game.player, run = game.run;
  const VW = game.W / game.ui, VH = game.H / game.ui;

  // damage flash & low-HP vignette
  const low = p.hp / p.maxHp < 0.3 && !p.dead ? 0.25 + 0.15 * Math.sin(game.time * 6) : 0;
  const fl = Math.max(game.fx.flash * 0.5, low);
  if (fl > 0) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.85);
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(1, `rgba(140,0,10,${fl})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  // HP / stamina
  const x = 28, y = 26;
  bar(ctx, x, y, Math.min(520, p.maxHp * 2.4), 14, p.hp / p.maxHp, '#a3192b', p.hpTrail / p.maxHp);
  bar(ctx, x, y + 22, Math.min(480, p.maxStamina * 2.2), 9, p.stamina / p.maxStamina, p.exhausted ? '#6a7a40' : '#4f9a4a');
  ctx.font = `11px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(240,230,210,0.85)';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, x + 4, y + 11);

  // flasks
  for (let i = 0; i < p.maxFlasks; i++) {
    const fx = x + i * 22, fy = y + 42, full = i < p.flasks;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(fx - 1, fy - 1, 16, 22);
    ctx.fillStyle = full ? '#e0913a' : '#3a2e26';
    ctx.fillRect(fx + 2, fy + 7, 12, 12);
    ctx.fillRect(fx + 5, fy + 2, 6, 6);
    if (full) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(fx + 4, fy + 9, 3, 6); }
  }
  ctx.fillStyle = '#d8c8a8'; ctx.font = `11px ${FONT}`;
  ctx.fillText('[R]', x + p.maxFlasks * 22 + 4, y + 58);

  // relics
  run.relics.forEach((id, i) => {
    const r = RELICS.find(z => z.id === id);
    const rx = x + i * 22, ry = y + 72;
    ctx.save(); ctx.translate(rx + 8, ry + 8); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = r.color; ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  });
  if (p.vengeanceReady) { ctx.fillStyle = '#ff6060'; ctx.fillText('Grudge ready', x, y + 104); }

  // embers / level
  ctx.textAlign = 'right';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#000'; ctx.fillText(`${Math.floor(run.embers)}`, VW - 27, VH - 25);
  ctx.fillStyle = '#ffc875'; ctx.fillText(`${Math.floor(run.embers)}`, VW - 28, VH - 26);
  ctx.font = `12px ${FONT}`; ctx.fillStyle = '#b8a890';
  ctx.fillText(`embers  ·  level ${run.level}`, VW - 28, VH - 48);

  // minimap
  const mm = game.minimap, ms = Math.min(170, 170);
  const mx = VW - ms - 24, my = 24;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(mx - 4, my - 4, ms + 8, ms + 8);
  ctx.strokeStyle = 'rgba(200,170,120,0.35)'; ctx.strokeRect(mx - 4, my - 4, ms + 8, ms + 8);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mm.c, mx, my, ms, ms);
  ctx.imageSmoothingEnabled = true;
  const k = ms / (game.map.w * TILE);
  ctx.fillStyle = '#fff';
  ctx.fillRect(mx + p.x * k - 2, my + p.y * k - 2, 4, 4);
  for (const it of game.interactables) {
    const ix = Math.floor(it.x / TILE), iy = Math.floor(it.y / TILE);
    if (!game.map.seen[game.map.idx(ix, iy)]) continue;
    ctx.fillStyle = it.type === 'chest' ? (it.used ? '#666' : '#ffd24a') : it.type === 'stairs' ? '#7fe0ff' : '#ff9a3c';
    ctx.fillRect(mx + it.x * k - 2, my + it.y * k - 2, 4, 4);
  }
  ctx.textAlign = 'right'; ctx.font = `13px ${FONT}`; ctx.fillStyle = '#d8c8a8';
  ctx.fillText(`${game.floorCfg.name} — ${game.floorCfg.title}`, VW - 24, my + ms + 22);
  ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8a8070';
  ctx.fillText(`${fmtTime(run.time)}  ·  ${run.kills} slain`, VW - 24, my + ms + 38);

  // boss bar
  const b = game.bossActive;
  if (b) {
    const bw = Math.min(680, VW - 120), bx = (VW - bw) / 2, by = VH - 56;
    ctx.textAlign = 'left'; ctx.font = `15px ${FONT}`; ctx.fillStyle = '#e8dcc8';
    ctx.fillText(b.def.name, bx, by - 10);
    bar(ctx, bx, by, bw, 12, b.hp / b.maxHp, b.phase === 2 ? '#7a2a9a' : '#8a1a22', b.hpShown / b.maxHp);
    // posture
    const post = 1 - b.poise / b.def.poise;
    if (post > 0.02) bar(ctx, bx + bw * 0.3, by + 18, bw * 0.4, 4, post, '#e8c25a');
  }

  // toasts
  for (const t of game.toasts) {
    const a = Math.min(1, t.t / 0.4, (t.dur - t.t) / 0.6);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = 'center';
    if (t.style === 'title' || t.style === 'victory') {
      const cy = VH * 0.3;
      const gold = t.style === 'victory';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, cy - 46, VW, 84);
      ctx.font = `${gold ? 46 : 38}px ${FONT}`;
      ctx.fillStyle = gold ? '#ffd27a' : '#e8dcc8';
      ctx.fillText(t.text, VW / 2, cy);
      ctx.font = `italic 17px ${FONT}`; ctx.fillStyle = '#b8a890';
      ctx.fillText(t.sub, VW / 2, cy + 28);
    } else if (t.style === 'boss') {
      ctx.font = `30px ${FONT}`; ctx.fillStyle = '#e8c8b8';
      ctx.fillText(t.text, VW / 2, VH * 0.22);
    } else {
      ctx.font = `italic 18px ${FONT}`; ctx.fillStyle = '#e8dcc8';
      ctx.fillText(t.text, VW / 2, VH * 0.18);
      if (t.sub) { ctx.font = `14px ${FONT}`; ctx.fillText(t.sub, VW / 2, VH * 0.18 + 22); }
    }
    ctx.globalAlpha = 1;
  }

  // first-floor control hint
  if (run.floor === 0 && run.time < 20 && game.state === 'play') {
    ctx.globalAlpha = clamp((20 - run.time) / 3, 0, 1) * 0.85;
    ctx.textAlign = 'left'; ctx.font = `12px ${FONT}`; ctx.fillStyle = '#c8b898';
    const lines = ['WASD move · Mouse aim · Shift sprint', 'LMB light (combo) · RMB heavy', 'Space roll (i-frames) · Q parry · R flask · E interact'];
    lines.forEach((l, i) => ctx.fillText(l, 28, VH - 64 + i * 18));
    ctx.globalAlpha = 1;
  }
}

function renderInteractable(game, ctx, it) {
  const t = game.time;
  if (it.type === 'chest') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(it.x - 14, it.y + 6, 28, 6);
    ctx.fillStyle = it.used ? '#3a2a1e' : '#6a4424';
    ctx.fillRect(it.x - 13, it.y - 10, 26, 18);
    ctx.fillStyle = it.used ? '#2a1e16' : (it.elite ? '#d8b04a' : '#a8803a');
    ctx.fillRect(it.x - 13, it.y - 10, 26, 4);
    ctx.fillRect(it.x - 2, it.y - 6, 4, 6);
    if (!it.used) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,200,90,${0.12 + 0.06 * Math.sin(t * 3)})`;
      ctx.beginPath(); ctx.arc(it.x, it.y, 30, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  } else if (it.type === 'shrine') {
    // a sword planted in ash, with a flame
    ctx.fillStyle = 'rgba(40,30,30,0.9)';
    ctx.beginPath(); ctx.ellipse(it.x, it.y + 6, 20, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9a9488'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(it.x, it.y + 4); ctx.lineTo(it.x, it.y - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(it.x - 7, it.y - 14); ctx.lineTo(it.x + 7, it.y - 14); ctx.stroke();
    const lit = !it.used;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, lit ? 120 : 60);
    g.addColorStop(0, lit ? 'rgba(255,160,60,0.45)' : 'rgba(140,90,50,0.25)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(it.x - 130, it.y - 130, 260, 260);
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < (lit ? 0.5 : 0.15)) game.fx.embers(it.x, it.y, 1);
  } else if (it.type === 'stairs') {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = shade('#6a6070', 0.6 + i * 0.12);
      ctx.fillRect(it.x - 26 + i * 3, it.y + 14 - i * 8, 52 - i * 6, 8);
    }
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(it.x, it.y - 10, 0, it.x, it.y - 10, 90);
    g.addColorStop(0, `rgba(140,220,255,${0.35 + 0.1 * Math.sin(t * 2)})`);
    g.addColorStop(1, 'rgba(100,180,255,0)');
    ctx.fillStyle = g; ctx.fillRect(it.x - 100, it.y - 110, 200, 200);
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.4) game.fx.embers(it.x + rand(-20, 20), it.y, 1, '#9fe0ff');
  }
}

// ---------- Menus ----------
function openMenu(game, menu) {
  game.menu = { sel: 0, closable: true, ...menu };
  game.menu.sel = Math.max(0, game.menu.items.findIndex(i => i.enabled !== false));
  game.state = 'menu';
}
function closeMenu(game) { game.menu = null; game.state = 'play'; }

function openShrineMenu(game, shrine) {
  const p = game.player, run = game.run;
  const cost = () => Math.round(40 + (run.level - 1) * 24);
  const level = (stat, msg) => () => {
    if (run.embers < cost()) { Sfx.play('tired'); return; }
    run.embers -= cost(); run.level++; run[stat]++;
    p.recompute();
    if (stat === 'vigor') p.hp = Math.min(p.maxHp, p.hp + 10);
    Sfx.play('levelup');
    game.fx.embers(p.x, p.y, 20, '#ffd27a');
    openShrineMenu(game, shrine);
    game.menu.sel = game.menu.items.findIndex(i => i.stat === stat);
    game.menu.flash = msg;
  };
  const c = cost();
  const afford = run.embers >= c;
  openMenu(game, {
    title: 'Ember Shrine',
    subtitle: `Level ${run.level}  ·  ${Math.floor(run.embers)} embers  ·  next level costs ${c}`,
    items: [
      shrine.used
        ? { label: 'The flame is spent', sub: 'You may rest only once per floor', enabled: false }
        : {
          label: 'Rest', sub: 'Restore all HP and flasks. Once per floor.', action: () => {
            shrine.used = true; p.hp = p.maxHp; p.flasks = p.maxFlasks; p.stamina = p.maxStamina;
            Sfx.play('heal'); game.fx.embers(p.x, p.y, 40, '#ffd27a');
            openShrineMenu(game, shrine);
          },
        },
      { label: `Vigor  ${run.vigor}`, sub: '+10 max HP', stat: 'vigor', enabled: afford, action: level('vigor') },
      { label: `Endurance  ${run.endurance}`, sub: '+8 max stamina', stat: 'endurance', enabled: afford, action: level('endurance') },
      { label: `Strength  ${run.strength}`, sub: '+7% damage', stat: 'strength', enabled: afford, action: level('strength') },
      { label: 'Leave', action: () => closeMenu(game) },
    ],
  });
}

function openRelicMenu(game, choices) {
  openMenu(game, {
    title: 'Choose a Relic',
    subtitle: 'Relics last for the whole climb',
    closable: false,
    items: choices.map(r => ({
      label: r.name, sub: r.desc, color: r.color, action: () => {
        game.run.relics.push(r.id);
        game.player.recompute();
        Sfx.play('levelup');
        game.toast(r.name, r.desc, 2.6, 'small');
        closeMenu(game);
      },
    })),
  });
}

function openPauseMenu(game) {
  openMenu(game, {
    title: 'Paused',
    subtitle: `${game.floorCfg.name} — ${game.floorCfg.title}  ·  seed ${game.run.seed}`,
    pause: true,
    items: [
      { label: 'Resume', action: () => closeMenu(game) },
      { label: 'Abandon run', sub: 'Return to the title screen', action: () => { game.menu = null; game.state = 'title'; } },
    ],
  });
}

function menuLayout(game) {
  const VW = game.W / game.ui, VH = game.H / game.ui;
  const m = game.menu;
  const w = 520, ih = 50;
  const h = 110 + m.items.length * ih;
  const x = (VW - w) / 2, y = Math.max(20, (VH - h) / 2);
  return { VW, VH, w, h, x, y, ih, itemY: i => y + 92 + i * ih };
}

function updateMenu(game, dt) {
  const m = game.menu;
  if (!m) { game.state = 'play'; return; }
  const L = menuLayout(game);
  const step = d => {
    let s = m.sel;
    for (let k = 0; k < m.items.length; k++) {
      s = (s + d + m.items.length) % m.items.length;
      if (m.items[s].enabled !== false) { m.sel = s; Sfx.play('ui'); return; }
    }
  };
  if (Input.hit('menuUp')) step(-1);
  if (Input.hit('menuDown')) step(1);
  // mouse hover / click
  const mx = Input.mouse.x / game.ui, my = Input.mouse.y / game.ui;
  let hover = -1;
  m.items.forEach((it, i) => {
    const iy = L.itemY(i);
    if (mx >= L.x + 20 && mx <= L.x + L.w - 20 && my >= iy && my <= iy + L.ih - 6) hover = i;
  });
  if (hover >= 0 && m.items[hover].enabled !== false && (m.lastMx !== mx || m.lastMy !== my)) m.sel = hover;
  m.lastMx = mx; m.lastMy = my;
  // number keys
  for (let i = 0; i < Math.min(9, m.items.length); i++)
    if (Input.pressed.has('Digit' + (i + 1)) && m.items[i].enabled !== false) { m.sel = i; activate(game, m.items[i]); return; }
  if ((Input.hit('confirm') && !Input.pressed.has('Space')) || (Input.clicked() && hover >= 0 && hover === m.sel)) {
    const it = m.items[m.sel];
    if (it && it.enabled !== false) activate(game, it);
    return;
  }
  if ((Input.hit('back') || (m.pause && Input.hit('pause'))) && m.closable) closeMenu(game);
}

function activate(game, it) { Sfx.play('ui'); it.action && it.action(); }

function renderMenu(game, ctx) {
  const m = game.menu; if (!m) return;
  const L = menuLayout(game);
  ctx.fillStyle = 'rgba(5,3,8,0.72)'; ctx.fillRect(0, 0, L.VW, L.VH);
  ctx.fillStyle = 'rgba(20,15,22,0.96)'; ctx.fillRect(L.x, L.y, L.w, L.h);
  ctx.strokeStyle = 'rgba(210,160,90,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(L.x + 0.5, L.y + 0.5, L.w - 1, L.h - 1);
  ctx.strokeRect(L.x + 5.5, L.y + 5.5, L.w - 11, L.h - 11);
  ctx.textAlign = 'center';
  ctx.font = `28px ${FONT}`; ctx.fillStyle = '#ecdcbc';
  ctx.fillText(m.title, L.VW / 2, L.y + 46);
  ctx.font = `italic 13px ${FONT}`; ctx.fillStyle = '#a89880';
  ctx.fillText(m.subtitle || '', L.VW / 2, L.y + 70);
  m.items.forEach((it, i) => {
    const iy = L.itemY(i), sel = i === m.sel, en = it.enabled !== false;
    if (sel) {
      ctx.fillStyle = 'rgba(210,140,60,0.16)'; ctx.fillRect(L.x + 20, iy, L.w - 40, L.ih - 6);
      ctx.fillStyle = '#d28a3a'; ctx.fillRect(L.x + 20, iy, 3, L.ih - 6);
    }
    ctx.textAlign = 'left';
    if (it.color) {
      ctx.save(); ctx.translate(L.x + 44, iy + 22); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = it.color; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
    }
    const tx = L.x + (it.color ? 66 : 40);
    ctx.font = `17px ${FONT}`;
    ctx.fillStyle = en ? (sel ? '#fff0d0' : '#d8c8a8') : '#6a6058';
    ctx.fillText(it.label, tx, iy + 20);
    if (it.sub) { ctx.font = `12px ${FONT}`; ctx.fillStyle = en ? '#a09078' : '#5a5048'; ctx.fillText(it.sub, tx, iy + 37); }
    ctx.textAlign = 'right'; ctx.font = `11px ${FONT}`; ctx.fillStyle = '#6a6058';
    if (i < 9) ctx.fillText(String(i + 1), L.x + L.w - 32, iy + 20);
  });
  if (m.pause) {
    // controls + relic list
    ctx.textAlign = 'left'; ctx.font = `12px ${FONT}`;
    const lines = [
      ['WASD / Arrows', 'move'], ['Shift', 'sprint'], ['Mouse', 'aim'],
      ['LMB / J', 'light attack (3-hit combo)'], ['RMB / K', 'heavy attack'],
      ['Space', 'dodge roll (invincible early)'], ['Q / F', 'parry (orange telegraphs only)'],
      ['R', 'drink flask'], ['E', 'interact'],
    ];
    let y = L.y + L.h + 26;
    lines.forEach(([k, v], i) => {
      const cx = L.x + (i % 2) * 270, cy = y + Math.floor(i / 2) * 17;
      ctx.fillStyle = '#ecdcbc'; ctx.fillText(k, cx, cy);
      ctx.fillStyle = '#a89880'; ctx.fillText(v, cx + 92, cy);
    });
    y += Math.ceil(lines.length / 2) * 17;
    if (game.run.relics.length) {
      y += 8; ctx.fillStyle = '#ecdcbc'; ctx.fillText('Relics:', L.x, y); y += 17;
      for (const id of game.run.relics) {
        const r = RELICS.find(z => z.id === id);
        ctx.fillStyle = r.color; ctx.fillText(`◆ ${r.name}`, L.x, y);
        ctx.fillStyle = '#8a7e6a'; ctx.fillText(r.desc, L.x + 170, y); y += 16;
      }
    }
  }
}

// ---------- Screens ----------
function renderTitle(game, ctx) {
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  const W = game.W, H = game.H;
  const g = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, H);
  g.addColorStop(0, '#2a1a14'); g.addColorStop(1, '#07060a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the spire silhouette
  ctx.fillStyle = '#0d0a0e';
  ctx.beginPath();
  const cx = W / 2, base = H;
  ctx.moveTo(cx - 120, base); ctx.lineTo(cx - 70, H * 0.35); ctx.lineTo(cx - 40, H * 0.33); ctx.lineTo(cx - 18, H * 0.08);
  ctx.lineTo(cx, H * 0.02); ctx.lineTo(cx + 18, H * 0.08); ctx.lineTo(cx + 40, H * 0.33); ctx.lineTo(cx + 70, H * 0.35); ctx.lineTo(cx + 120, base);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const wy = H * (0.4 + i * 0.065);
    ctx.fillStyle = `rgba(255,140,60,${0.25 + 0.15 * Math.sin(game.time * 2 + i)})`;
    ctx.fillRect(cx - 4 + ((i % 2) ? 22 : -22), wy, 6, 10);
  }
  game.titleFx.renderParticles(ctx);

  const s = game.ui;
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(78 * s)}px ${FONT}`;
  ctx.fillStyle = '#000'; ctx.fillText('ASHEN SPIRE', W / 2 + 3, H * 0.3 + 3);
  ctx.fillStyle = '#ecdcbc'; ctx.fillText('ASHEN SPIRE', W / 2, H * 0.3);
  ctx.font = `italic ${Math.round(18 * s)}px ${FONT}`; ctx.fillStyle = '#b8a890';
  ctx.fillText('A tower without end. Few climb past the first floor.', W / 2, H * 0.3 + 40 * s);

  const blink = 0.6 + 0.4 * Math.sin(game.time * 3);
  ctx.globalAlpha = blink;
  ctx.font = `${Math.round(20 * s)}px ${FONT}`; ctx.fillStyle = '#ffc875';
  ctx.fillText('Press Enter or click to begin the climb', W / 2, H * 0.62);
  ctx.globalAlpha = 1;

  ctx.font = `${Math.round(13 * s)}px ${FONT}`; ctx.fillStyle = '#8a7e6a';
  const lines = [
    'WASD move  ·  Mouse aim  ·  Shift sprint  ·  LMB light / RMB heavy',
    'Space roll  ·  Q parry  ·  R flask  ·  E interact  ·  Esc pause',
    'Orange telegraphs can be parried. Red ones must be dodged.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.72 + i * 22 * s));
  const m = game.meta;
  ctx.fillStyle = '#5e5448';
  ctx.fillText(`Climbs ${m.runs}  ·  Deaths ${m.deaths}  ·  Wardens felled ${m.wardens}`, W / 2, H - 28 * s);
}

function renderDeath(game, ctx) {
  const VW = game.W / game.ui, VH = game.H / game.ui;
  const t = game.deathT;
  const a = clamp((t - 0.4) / 1.2, 0, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = `rgba(0,0,0,${0.7 * a})`; ctx.fillRect(0, VH / 2 - 60, VW, 120);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(64 + t * 3)}px ${FONT}`;
  ctx.fillStyle = '#9a1a1a';
  ctx.fillText('YOU DIED', VW / 2, VH / 2 + 20);
  ctx.globalAlpha = clamp((t - 2.2) / 0.8, 0, 1);
  const run = game.run;
  ctx.font = `14px ${FONT}`; ctx.fillStyle = '#b8a890';
  ctx.fillText(`${game.floorCfg.name} — ${game.floorCfg.title}  ·  Level ${run.level}  ·  ${run.kills} slain  ·  ${fmtTime(run.time)}`, VW / 2, VH / 2 + 90);
  ctx.fillStyle = '#ffc875';
  ctx.fillText('Press Enter to return to the foot of the spire', VW / 2, VH / 2 + 116);
  ctx.globalAlpha = 1;
}

function renderVictory(game, ctx) {
  const VW = game.W / game.ui, VH = game.H / game.ui;
  const a = clamp(game.stateT / 1.2, 0, 1);
  ctx.fillStyle = `rgba(4,3,8,${0.9 * a})`; ctx.fillRect(0, 0, VW, VH);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `46px ${FONT}`; ctx.fillStyle = '#ffd27a';
  ctx.fillText('The Spire Climbs On', VW / 2, VH * 0.34);
  ctx.font = `italic 17px ${FONT}`; ctx.fillStyle = '#b8a890';
  ctx.fillText(`The stair above ${game.floorCfg.name} vanishes into darkness. The floors beyond are not yet built.`, VW / 2, VH * 0.34 + 36);
  const run = game.run;
  ctx.font = `15px ${FONT}`; ctx.fillStyle = '#d8c8a8';
  const lines = [
    `Floors cleared: ${run.floor + 1}`,
    `Level ${run.level}  ·  ${run.kills} slain  ·  ${Math.round(run.dmgDealt)} damage dealt`,
    `Time: ${fmtTime(run.time)}  ·  Relics: ${run.relics.length}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, VH * 0.5 + i * 24));
  if (game.stateT > 2) { ctx.fillStyle = '#ffc875'; ctx.fillText('Press Enter to return to the title', VW / 2, VH * 0.5 + 100); }
  ctx.globalAlpha = 1;
}
