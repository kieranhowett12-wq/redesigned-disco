// ---------- Player: souls-like moveset ----------
// Every action has commitment: windup -> active -> recovery. Inputs are buffered
// briefly so a press during recovery fires as soon as it's allowed.
const PLAYER_ATTACKS = {
  light1: { windup: 0.13, active: 0.1, recover: 0.28, dmg: 16, poise: 10, reach: 52, arc: 1.9, stamina: 16, lunge: 110, next: 'light2', dir: 1 },
  light2: { windup: 0.11, active: 0.1, recover: 0.3, dmg: 16, poise: 10, reach: 52, arc: 1.9, stamina: 16, lunge: 110, next: 'light3', dir: -1 },
  light3: { windup: 0.22, active: 0.12, recover: 0.46, dmg: 26, poise: 20, reach: 58, arc: 2.5, stamina: 22, lunge: 170, next: null, dir: 1 },
  heavy: { windup: 0.48, active: 0.13, recover: 0.5, dmg: 42, poise: 38, reach: 66, arc: 2.6, stamina: 32, lunge: 190, next: null, dir: 1, heavy: true },
};

const BASE = {
  hp: 100, stamina: 100, speed: 148, staminaRegen: 52, flasks: 3, healPct: 0.42,
  dodgeDur: 0.42, dodgeMove: 0.34, iframes: 0.27, dodgeDist: 125, dodgeCost: 22,
  parryCost: 14, parryStart: 0.04, parryWin: 0.16, parryDur: 0.55,
  healDur: 0.95, healAt: 0.55, hitstun: 0.32, sprintMult: 1.5, sprintDrain: 24,
};

class Player {
  constructor(x, y, run) {
    this.x = x; this.y = y; this.r = 11;
    this.run = run;
    this.facing = 0; this.aim = 0;
    this.vx = 0; this.vy = 0;
    this.state = 'idle'; this.t = 0;
    this.atk = null; this.atkName = null; this.atkAngle = 0;
    this.hitSet = new Set();
    this.invuln = 0;
    this.regenDelay = 0;
    this.buffer = null;
    this.dodgeDir = 0;
    this.healApplied = false;
    this.exhausted = false;
    this.vengeanceReady = false;
    this.sprinting = false;
    this.afterimages = [];
    this.dead = false;
    this.recompute();
    this.hp = run.hp != null ? Math.min(run.hp, this.maxHp) : this.maxHp;
    this.hpTrail = this.hp;
    this.stamina = this.maxStamina;
    this.flasks = run.flasks != null ? Math.min(run.flasks, this.maxFlasks) : this.maxFlasks;
  }

  recompute() {
    const r = this.run, m = computeMods(r);
    const oldMax = this.maxHp;
    this.mods = m;
    this.maxHp = Math.max(30, BASE.hp + r.vigor * 10 + m.maxHp);
    this.maxStamina = BASE.stamina + r.endurance * 8 + m.stamina;
    this.maxFlasks = BASE.flasks + m.flasks;
    this.dmgMult = (1 + r.strength * 0.07) * m.dmg;
    this.speed = BASE.speed * m.speed;
    if (oldMax != null && this.hp != null) {
      if (this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
      this.hp = Math.min(this.hp, this.maxHp);
    }
  }

  get iframeDur() { return BASE.iframes * this.mods.iframes; }
  get parryWin() { return BASE.parryWin * this.mods.parryWindow; }
  isInvulnerable() { return (this.state === 'dodge' && this.t < this.iframeDur) || this.invuln > 0; }

  phase() {
    if (this.state !== 'attack') return null;
    const a = this.atk;
    if (this.t < a.windup) return 'windup';
    if (this.t < a.windup + a.active) return 'active';
    return 'recover';
  }

  setState(s) { this.state = s; this.t = 0; }

  spendStamina(n) {
    this.stamina = Math.max(0, this.stamina - n);
    this.regenDelay = 0.55;
  }

  update(dt, game) {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.hpTrail > this.hp) this.hpTrail = Math.max(this.hp, this.hpTrail - dt * (this.invuln > 0 ? 0 : 60));
    else this.hpTrail = this.hp;

    const mw = game.mouseWorld();
    this.aim = Math.atan2(mw.y - this.y, mw.x - this.x);

    if (this.state === 'dead') {
      this.vx *= 0.9; this.vy *= 0.9;
      this.x += this.vx * dt; this.y += this.vy * dt;
      game.map.collideCircle(this);
      return;
    }

    // movement input
    let mx = 0, my = 0;
    if (Input.down('up')) my -= 1;
    if (Input.down('down')) my += 1;
    if (Input.down('left')) mx -= 1;
    if (Input.down('right')) mx += 1;
    const ml = Math.hypot(mx, my);
    if (ml) { mx /= ml; my /= ml; }

    // input buffer (~0.25 s)
    for (const a of ['light', 'heavy', 'dodge', 'parry', 'heal']) {
      if (Input.hit(a)) this.buffer = { a, t: 0.25, mx, my };
    }
    if (this.buffer) { this.buffer.t -= dt; if (this.buffer.t <= 0) this.buffer = null; }
    if (this.buffer && (mx || my)) { this.buffer.mx = mx; this.buffer.my = my; }
    this.tryAction(game, mx, my);

    // stamina regen
    const busy = this.state === 'attack' || this.state === 'dodge' || this.sprinting;
    if (this.regenDelay > 0) this.regenDelay -= dt;
    else if (!busy) {
      const rate = BASE.staminaRegen * this.mods.staminaRegen * (this.state === 'heal' ? 0.5 : 1);
      this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt);
    }
    if (this.exhausted && this.stamina > 25) this.exhausted = false;

    const accel = k => 1 - Math.exp(-k * dt);
    this.sprinting = false;

    switch (this.state) {
      case 'idle': {
        let spd = this.speed;
        if (Input.down('sprint') && ml && this.stamina > 0 && !this.exhausted) {
          spd *= BASE.sprintMult; this.sprinting = true;
          this.stamina = Math.max(0, this.stamina - BASE.sprintDrain * dt);
          this.regenDelay = 0.35;
          if (this.stamina <= 0) this.exhausted = true;
          if (Math.random() < 0.3) game.fx.burst(this.x, this.y + 8, 1, 'rgba(120,110,100,0.5)', 20, 0.4, 3);
        }
        const k = accel(16);
        this.vx += (mx * spd - this.vx) * k;
        this.vy += (my * spd - this.vy) * k;
        this.facing = this.aim;
        break;
      }
      case 'attack': {
        const a = this.atk, ph = this.phase();
        if (ph === 'windup') {
          this.atkAngle = turnToward(this.atkAngle, this.aim, 7 * dt); // slight steer during windup only
          const k = accel(14); this.vx -= this.vx * k; this.vy -= this.vy * k;
        } else if (ph === 'active') {
          const lt = (this.t - a.windup) / a.active;
          const sp = a.lunge * (1 - lt);
          this.vx = Math.cos(this.atkAngle) * sp; this.vy = Math.sin(this.atkAngle) * sp;
          this.checkHits(game);
        } else {
          const k = accel(12); this.vx -= this.vx * k; this.vy -= this.vy * k;
          if (this.t >= a.windup + a.active + a.recover) this.setState('idle');
        }
        this.facing = this.atkAngle;
        break;
      }
      case 'dodge': {
        const D = BASE.dodgeMove;
        if (this.t < D) {
          const v0 = 2 * BASE.dodgeDist * this.mods.dodgeDist / D;
          const sp = v0 * (1 - this.t / D);
          this.vx = Math.cos(this.dodgeDir) * sp; this.vy = Math.sin(this.dodgeDir) * sp;
          if (Math.random() < 0.5) this.afterimages.push({ x: this.x, y: this.y, life: 0.25 });
        } else { this.vx *= 0.6; this.vy *= 0.6; }
        if (this.t >= BASE.dodgeDur) this.setState('idle');
        break;
      }
      case 'parry': {
        const k = accel(14); this.vx -= this.vx * k; this.vy -= this.vy * k;
        if (this.t >= BASE.parryDur) this.setState('idle');
        break;
      }
      case 'heal': {
        const k = accel(14);
        this.vx += (mx * this.speed * 0.35 - this.vx) * k;
        this.vy += (my * this.speed * 0.35 - this.vy) * k;
        this.facing = this.aim;
        if (!this.healApplied && this.t >= BASE.healAt) {
          this.healApplied = true;
          const amt = Math.round(this.maxHp * BASE.healPct * this.mods.healPower);
          this.hp = Math.min(this.maxHp, this.hp + amt);
          game.fx.text(this.x, this.y - 20, '+' + amt, '#9be07a', 15);
          game.fx.embers(this.x, this.y, 14, '#ffd27a');
          Sfx.play('heal');
        }
        if (Math.random() < 0.4) game.fx.embers(this.x, this.y, 1, '#ffb347');
        if (this.t >= BASE.healDur) this.setState('idle');
        break;
      }
      case 'hitstun': {
        const k = accel(7); this.vx -= this.vx * k; this.vy -= this.vy * k;
        if (this.t >= BASE.hitstun) this.setState('idle');
        break;
      }
    }

    this.x += this.vx * dt; this.y += this.vy * dt;
    game.map.collideCircle(this);

    for (const a of this.afterimages) a.life -= dt;
    this.afterimages = this.afterimages.filter(a => a.life > 0);
  }

  tryAction(game, mx, my) {
    const b = this.buffer;
    if (!b) return;
    const a = b.a;
    let ok = false;
    if (this.state === 'idle') ok = true;
    else if (this.state === 'attack' && this.phase() === 'recover') {
      const rt = this.t - this.atk.windup - this.atk.active;
      if (a === 'light' && this.atk.next) ok = true;           // combo
      else if (rt > this.atk.recover * 0.45) ok = true;        // late cancel
    }
    if (!ok) return;

    if (a === 'heal') {
      this.buffer = null;
      if (this.flasks <= 0) { game.fx.text(this.x, this.y - 22, 'No flasks', '#aaa', 12); Sfx.play('tired'); return; }
      this.flasks--; this.healApplied = false; this.setState('heal');
      return;
    }
    if (this.stamina <= 0) return; // stays buffered until stamina returns (or expires)

    this.buffer = null;
    if (a === 'light' || a === 'heavy') {
      let name = 'heavy';
      if (a === 'light') name = (this.state === 'attack' && this.atk.next) ? this.atk.next : 'light1';
      this.startAttack(name);
    } else if (a === 'dodge') {
      this.dodgeDir = (b.mx || b.my) ? Math.atan2(b.my, b.mx) : this.aim;
      this.spendStamina(BASE.dodgeCost * this.mods.dodgeCost);
      this.setState('dodge');
      Sfx.play('dodge');
    } else if (a === 'parry') {
      this.spendStamina(BASE.parryCost);
      this.setState('parry');
      this.facing = this.aim;
    }
  }

  startAttack(name) {
    const a = PLAYER_ATTACKS[name];
    this.atk = a; this.atkName = name;
    this.atkAngle = this.aim;
    this.hitSet.clear();
    this.spendStamina(a.stamina);
    this.setState('attack');
    Sfx.play(a.heavy ? 'heavyswing' : 'swing');
  }

  checkHits(game) {
    const a = this.atk;
    for (const e of game.enemies) {
      if (e.dead || this.hitSet.has(e) || e.state === 'asleep' || e.airborne) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d > a.reach + e.r) continue;
      const ad = Math.abs(angleDiff(this.atkAngle, Math.atan2(e.y - this.y, e.x - this.x)));
      if (ad > a.arc / 2 + Math.atan2(e.r, Math.max(d, 1))) continue;
      if (!game.map.los(this.x, this.y, e.x, e.y)) continue;
      this.hitSet.add(e);
      let dmg = a.dmg * this.dmgMult, poise = a.poise;
      if (a.heavy) { dmg *= this.mods.heavyDmg; poise *= this.mods.heavyPoise; }
      if (this.vengeanceReady) { dmg *= 1.6; this.vengeanceReady = false; }
      const res = e.takeHit(dmg, poise, this, game, a.heavy);
      this.run.dmgDealt += res.dmg;
      if (this.mods.lifesteal) this.hp = Math.min(this.maxHp, this.hp + this.mods.lifesteal);
      game.fx.stop(res.crit ? 0.16 : a.heavy ? 0.09 : 0.055);
      game.fx.addShake(res.crit ? 9 : a.heavy ? 5 : 2.5);
      Sfx.play(res.crit ? 'crit' : a.heavy ? 'heavyhit' : 'hit');
    }
  }

  // Called by enemy attacks / projectiles. Returns 'hit' | 'dodged' | 'parried' | 'ignored'.
  receiveHit(h, game) {
    if (this.state === 'dead') return 'ignored';
    if (this.state === 'dodge' && this.t < this.iframeDur) return 'dodged';
    if (this.invuln > 0) return 'ignored';
    if (h.parryable && this.state === 'parry' && this.t >= BASE.parryStart && this.t <= BASE.parryStart + this.parryWin) {
      this.setState('idle');
      this.stamina = Math.min(this.maxStamina, this.stamina + BASE.parryCost);
      this.invuln = 0.25;
      const ang = Math.atan2(h.y - this.y, h.x - this.x);
      game.fx.burst(this.x + Math.cos(ang) * 14, this.y + Math.sin(ang) * 14, 22, '#ffe9a0', 260, 0.4, 3, ang, 1.6);
      game.fx.text(this.x, this.y - 26, 'PARRY', '#ffe28a', 16);
      game.fx.stop(0.14); game.fx.addShake(6);
      Sfx.play('parry');
      return 'parried';
    }
    const dmg = Math.round(h.dmg * this.mods.dmgTaken);
    this.hp -= dmg;
    this.invuln = 0.4;
    const ang = Math.atan2(this.y - h.y, this.x - h.x);
    this.vx = Math.cos(ang) * (h.knock || 200);
    this.vy = Math.sin(ang) * (h.knock || 200);
    game.fx.burst(this.x, this.y, 14, '#b0182a', 180, 0.5, 3, ang, 1.4);
    game.fx.decal(this.x + rand(-6, 6), this.y + rand(-6, 6), rand(4, 9), 'rgba(110,10,20,0.45)');
    game.fx.text(this.x, this.y - 22, String(dmg), '#ff5050', 15);
    game.fx.flash = 0.6; game.fx.addShake(7); game.fx.stop(0.07);
    Sfx.play('hurt');
    if (this.mods.vengeance) this.vengeanceReady = true;
    this.buffer = null;
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'dead'; this.t = 0; this.dead = true;
      game.onPlayerDeath();
    } else {
      this.setState('hitstun');
    }
    return 'hit';
  }

  weaponAngle() {
    const base = this.facing;
    if (this.state === 'attack') {
      const a = this.atk, s = a.dir, half = a.arc / 2;
      if (this.t < a.windup) return base - s * (half + 0.35) * easeOut(this.t / a.windup);
      if (this.t < a.windup + a.active) return base + s * lerp(-half - 0.35, half, easeOut((this.t - a.windup) / a.active));
      return base + s * lerp(half, 0.9 * s, easeInOut(clamp((this.t - a.windup - a.active) / a.recover, 0, 1)));
    }
    if (this.state === 'parry') return base - 0.4;
    return base + 0.9;
  }

  render(ctx, game) {
    for (const a of this.afterimages) {
      ctx.globalAlpha = a.life * 1.4;
      ctx.fillStyle = '#7f9cc0';
      ctx.beginPath(); ctx.arc(a.x, a.y, this.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 9, 12, 5, 0, 0, TAU); ctx.fill();

    const iframe = this.isInvulnerable();
    if (this.state === 'dead') ctx.globalAlpha = Math.max(0.25, 1 - this.t);
    else if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2) ctx.globalAlpha = 0.5;
    else if (this.state === 'dodge' && iframe) ctx.globalAlpha = 0.7;

    // attack trail
    if (this.state === 'attack' && this.phase() === 'active') {
      const a = this.atk, s = a.dir, half = a.arc / 2;
      const prog = easeOut((this.t - a.windup) / a.active);
      const a0 = this.atkAngle - s * half, a1 = this.atkAngle + s * lerp(-half, half, prog);
      ctx.fillStyle = a.heavy ? 'rgba(255,200,120,0.35)' : 'rgba(230,235,255,0.28)';
      ctx.beginPath(); ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, a.reach, Math.min(a0, a1), Math.max(a0, a1));
      ctx.closePath(); ctx.fill();
    }

    // sword
    const wa = this.weaponAngle();
    const sx = this.x + Math.cos(wa) * 8, sy = this.y + Math.sin(wa) * 8;
    const len = this.state === 'attack' ? (this.atk.heavy ? 40 : 34) : 26;
    ctx.strokeStyle = '#dfe3ea'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(wa) * len, sy + Math.sin(wa) * len); ctx.stroke();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(wa + Math.PI / 2) * 5, sy + Math.sin(wa + Math.PI / 2) * 5);
    ctx.lineTo(sx - Math.cos(wa + Math.PI / 2) * 5, sy - Math.sin(wa + Math.PI / 2) * 5);
    ctx.stroke();

    // body: cloak + armour
    ctx.fillStyle = '#2c3442';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 1, 0, TAU); ctx.fill();
    ctx.fillStyle = this.state === 'hitstun' ? '#d88' : '#9aa6b4';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r - 2, 0, TAU); ctx.fill();
    // helm visor
    const f = this.facing;
    ctx.fillStyle = '#1a1f28';
    ctx.beginPath();
    ctx.arc(this.x + Math.cos(f) * 4, this.y + Math.sin(f) * 4, 4, f - 1.1, f + 1.1);
    ctx.lineTo(this.x + Math.cos(f) * 4, this.y + Math.sin(f) * 4);
    ctx.fill();

    // parry shield flash
    if (this.state === 'parry') {
      const active = this.t >= BASE.parryStart && this.t <= BASE.parryStart + this.parryWin;
      ctx.strokeStyle = active ? 'rgba(255,230,140,0.95)' : 'rgba(160,160,170,0.6)';
      ctx.lineWidth = active ? 4 : 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 8, f - 1.0, f + 1.0); ctx.stroke();
    }
    if (this.state === 'heal') {
      ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.3 * Math.sin(this.t * 20)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 5 + this.t * 6, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
