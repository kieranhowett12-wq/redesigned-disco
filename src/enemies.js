// ---------- Enemies (data-driven) ----------
// Attack shapes: arc | circle | lunge | charge | projectile | burst | leap
// Fields: range [min,max] to pick, windup/active/recover seconds, dmg, track (turn
// rate during windup), trackUntil (fraction of windup after which aim locks),
// parryable, hyper (hyper-armour), next/nextChance (combo chains), weight (only
// weighted attacks are chosen directly), phase (boss phase required).
const ENEMY_TYPES = {
  hollow: {
    name: 'Hollow', hp: 60, speed: 82, radius: 12, poise: 28, turn: 5, engage: 46,
    color: '#7d8270', dark: '#3f4337', embers: 12, cost: 1, cooldown: [0.5, 1.3], weapon: 'sword',
    attacks: {
      slash: { shape: 'arc', range: [0, 60], windup: 0.6, active: 0.12, recover: 0.55, dmg: 18, reach: 50, arc: 1.7, track: 5, trackUntil: 0.8, moveDuring: 120, parryable: true, knock: 170, weight: 3, next: 'slash2', nextChance: 0.4 },
      slash2: { shape: 'arc', windup: 0.42, active: 0.12, recover: 0.75, dmg: 18, reach: 50, arc: 1.7, track: 4, trackUntil: 0.7, moveDuring: 120, parryable: true, knock: 170 },
      thrust: { shape: 'arc', range: [45, 95], windup: 0.85, active: 0.14, recover: 0.7, dmg: 22, reach: 82, arc: 0.5, track: 3.5, trackUntil: 0.8, moveDuring: 240, parryable: true, knock: 220, weight: 1 },
    },
  },
  ghoul: {
    name: 'Ghoul', hp: 42, speed: 120, radius: 11, poise: 12, turn: 7, engage: 120,
    color: '#8d6b7b', dark: '#4e3843', embers: 14, cost: 2, cooldown: [0.8, 1.6], weapon: 'claws',
    attacks: {
      pounce: { shape: 'lunge', range: [65, 175], windup: 0.55, active: 0.3, recover: 0.9, dmg: 22, speed: 520, track: 6, trackUntil: 0.85, parryable: true, knock: 230, weight: 3 },
      claw: { shape: 'arc', range: [0, 48], windup: 0.36, active: 0.1, recover: 0.45, dmg: 12, reach: 40, arc: 1.8, track: 7, trackUntil: 0.8, moveDuring: 90, parryable: true, knock: 110, weight: 2, next: 'claw2', nextChance: 0.5 },
      claw2: { shape: 'arc', windup: 0.22, active: 0.1, recover: 0.6, dmg: 12, reach: 40, arc: 1.8, track: 6, moveDuring: 90, parryable: true, knock: 110 },
    },
  },
  archer: {
    name: 'Bone Archer', hp: 38, speed: 74, radius: 11, poise: 14, turn: 6, ranged: true, keepMin: 150, keepMax: 290,
    color: '#cfc6a8', dark: '#7d7660', embers: 15, cost: 2, cooldown: [1.0, 1.9], weapon: 'bow',
    attacks: {
      shot: { shape: 'projectile', range: [90, 560], windup: 0.9, active: 0.05, recover: 0.8, dmg: 17, projSpeed: 440, count: 1, spread: 0, track: 6, trackUntil: 0.75, weight: 3, los: true },
      volley: { shape: 'projectile', range: [120, 420], windup: 1.2, active: 0.05, recover: 1.1, dmg: 13, projSpeed: 380, count: 3, spread: 0.22, track: 5, trackUntil: 0.7, weight: 1, los: true },
      shove: { shape: 'arc', range: [0, 50], windup: 0.4, active: 0.1, recover: 0.5, dmg: 8, reach: 44, arc: 1.6, track: 6, knock: 420, parryable: true, weight: 5 },
    },
  },
  brute: {
    name: 'Gaol Brute', hp: 170, speed: 58, radius: 18, poise: 90, turn: 2.6, engage: 72,
    color: '#6f5c4a', dark: '#3a2f25', embers: 40, cost: 4, cooldown: [0.9, 1.8], staggerTime: 1.1, weapon: 'club',
    attacks: {
      smash: { shape: 'circle', range: [0, 100], windup: 1.05, active: 0.12, recover: 1.0, dmg: 36, radius: 56, offset: 50, track: 3, trackUntil: 0.7, knock: 340, hyper: true, weight: 2, shake: 8 },
      sweep: { shape: 'arc', range: [0, 82], windup: 0.85, active: 0.16, recover: 0.85, dmg: 26, reach: 80, arc: 3.2, track: 2.5, trackUntil: 0.75, moveDuring: 60, knock: 270, hyper: true, parryable: true, weight: 2, next: 'smash', nextChance: 0.35 },
    },
  },

  // ---- Floor I boss ----
  gatekeeper: {
    name: 'Varkoth, Warden of the Gaol', hp: 1350, speed: 100, radius: 26, poise: 230, turn: 3.2, engage: 84,
    color: '#5b4f66', dark: '#241d2b', embers: 500, cooldown: [0.35, 0.9], staggerTime: 1.6, boss: true, weapon: 'axe',
    attacks: {
      cleave1: { shape: 'arc', range: [0, 110], windup: 0.7, active: 0.15, recover: 0.35, dmg: 30, reach: 94, arc: 2.3, track: 4, trackUntil: 0.8, moveDuring: 190, parryable: true, knock: 270, hyper: true, weight: 3, next: 'cleave2', nextChance: 0.75 },
      cleave2: { shape: 'arc', windup: 0.5, active: 0.15, recover: 0.35, dmg: 30, reach: 94, arc: 2.3, track: 4.5, trackUntil: 0.8, moveDuring: 190, parryable: true, knock: 270, hyper: true, next: 'cleave3', nextChance: 0.55 },
      cleave3: { shape: 'circle', windup: 0.8, active: 0.14, recover: 1.05, dmg: 42, radius: 68, offset: 62, track: 3.5, trackUntil: 0.7, knock: 380, hyper: true, shake: 10 },
      delayed: { shape: 'circle', range: [0, 125], windup: 1.5, active: 0.14, recover: 0.95, dmg: 46, radius: 72, offset: 60, track: 5, trackUntil: 0.88, knock: 400, hyper: true, weight: 1.5, shake: 12 },
      leap: { shape: 'leap', range: [170, 650], windup: 0.75, active: 0.65, recover: 1.0, dmg: 38, radius: 98, track: 3, trackUntil: 0.85, knock: 440, hyper: true, weight: 2, shake: 15 },
      charge: { shape: 'charge', range: [140, 650], windup: 0.95, active: 0.75, recover: 1.2, dmg: 32, speed: 560, track: 4, trackUntil: 0.8, knock: 460, hyper: true, weight: 1.6 },
      stomp: { shape: 'circle', range: [0, 150], windup: 0.9, active: 0.14, recover: 0.8, dmg: 28, radius: 112, offset: 0, knock: 430, hyper: true, weight: 1.6, phase: 2, ring: { speed: 300, maxR: 560, width: 18, dmg: 24 }, shake: 12 },
      burst: { shape: 'burst', range: [0, 800], windup: 1.0, active: 0.05, recover: 0.35, dmg: 18, count: 16, projSpeed: 250, weight: 1.3, phase: 2, hyper: true, next: 'burst2', nextChance: 1 },
      burst2: { shape: 'burst', windup: 0.45, active: 0.05, recover: 0.9, dmg: 18, count: 16, projSpeed: 250, offsetAngle: true, hyper: true },
    },
  },
};

class Enemy {
  constructor(type, x, y, cfg) {
    const d = ENEMY_TYPES[type];
    this.def = d; this.type = type;
    this.x = x; this.y = y; this.r = d.radius;
    this.maxHp = Math.round(d.hp * (cfg.hpMult || 1));
    this.hp = this.maxHp; this.hpShown = this.hp;
    this.dmgMult = cfg.dmgMult || 1;
    this.poise = d.poise;
    this.facing = Math.random() * TAU;
    this.state = 'asleep'; this.t = 0; this.dur = 0;
    this.atk = null; this.atkName = null;
    this.vx = 0; this.vy = 0; this.mx = 0; this.my = 0;
    this.flash = 0;
    this.cooldown = rand(0.4, 1.0);
    this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rand(1, 2.5);
    this.tempo = 1; this.phase = 1;
    this.sinceHit = 99;
    this.dead = false; this.deathT = 0;
    this.airborne = false; this.z = 0;
    this.hitWall = false;
    this.burstBase = 0;
  }
  get isBoss() { return !!this.def.boss; }

  wake(delay) { if (this.state === 'asleep') { this.state = 'waking'; this.t = 0; this.dur = delay; } }

  setState(s, dur = 0) {
    this.state = s; this.t = 0; this.dur = dur;
    if (s !== 'windup' && s !== 'active' && s !== 'recover') { this.atk = null; this.airborne = false; this.z = 0; }
  }

  isHyper() {
    return this.state === 'roar' || (!!this.atk && this.atk.hyper && (this.state === 'windup' || this.state === 'active'));
  }

  isAttacking() { return this.state === 'windup' || this.state === 'active'; }

  startAttack(name, game) {
    const a = this.def.attacks[name];
    this.atk = a; this.atkName = name;
    this.state = 'windup'; this.t = 0;
    this.hasHit = false;
    if (a.shape === 'leap') this.leapTarget = { x: game.player.x, y: game.player.y };
    if (a.shape === 'burst' && !a.offsetAngle) this.burstBase = Math.random() * TAU;
  }

  update(dt, game) {
    if (this.dead) { this.deathT += dt; return; }
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.sinceHit += dt;
    if (this.sinceHit > 2.5) this.poise = Math.min(this.def.poise, this.poise + this.def.poise * 0.5 * dt);
    if (this.hpShown > this.hp) this.hpShown = Math.max(this.hp, this.hpShown - this.maxHp * 0.6 * dt);
    if (this.tickBleed(dt, game)) return;

    switch (this.state) {
      case 'asleep': break;
      case 'waking': if (this.t >= this.dur) this.setState('chase'); break;
      case 'chase': this.updateChase(dt, game); break;
      case 'windup': this.updateWindup(dt, game); break;
      case 'active': this.updateActive(dt, game); break;
      case 'recover': {
        this.decay(dt, 8);
        if (this.t >= this.atk.recover * this.tempo) {
          const a = this.atk;
          if (a.next && Math.random() < this.chainChance(a)) this.startAttack(a.next, game);
          else { this.setState('chase'); this.cooldown = rand(...this.def.cooldown) * (this.phase === 2 ? 0.65 : 1); }
        }
        break;
      }
      case 'stagger': case 'riposte':
        this.decay(dt, 6);
        if (this.t >= this.dur) { this.setState('chase'); this.cooldown = rand(0.1, 0.4); }
        break;
    }

    if (!this.airborne) {
      this.x += (this.mx + this.vx) * dt; this.y += (this.my + this.vy) * dt;
      const fr = Math.exp(-9 * dt); this.vx *= fr; this.vy *= fr;
      this.hitWall = game.map.collideCircle(this);
    }
  }

  // Serrated Edge relic: 5 dmg/s for 3 s. Returns true if the bleed killed us.
  tickBleed(dt, game) {
    if (!this.bleed || this.bleed <= 0) return false;
    this.bleed -= dt;
    this.hp -= 5 * dt;
    game.run.dmgDealt += 5 * dt;
    if (Math.random() < 0.25) game.fx.burst(this.x, this.y, 1, '#b0182a', 40, 0.4, 2);
    if (this.hp <= 0) { this.hp = 0; this.die(game); return true; }
    return false;
  }

  chainChance(a) { return this.phase === 2 ? Math.min(1, a.nextChance + 0.25) : a.nextChance; }

  decay(dt, k) { const f = Math.exp(-k * dt); this.mx *= f; this.my *= f; }

  updateChase(dt, game) {
    const p = game.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    this.facing = turnToward(this.facing, ang, this.def.turn * dt);
    this.cooldown -= dt;

    if (this.cooldown <= 0 && !p.dead) {
      const limit = this.isBoss ? 99 : 2; // attack tokens: only a couple of enemies commit at once
      if (game.countAttackers(this) >= limit) this.cooldown = rand(0.15, 0.4);
      else {
        const n = this.chooseAttack(d, game);
        if (n) { this.startAttack(n, game); return; }
      }
    }

    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafe *= -1; this.strafeT = rand(1, 2.5); }
    let tx = 0, ty = 0;
    const ux = dx / d, uy = dy / d, sp = this.def.speed * (this.phase === 2 ? 1.15 : 1);
    if (p.dead) { tx = ty = 0; }
    else if (this.def.ranged) {
      const los = game.map.los(this.x, this.y, p.x, p.y);
      if (d < this.def.keepMin) { tx = -ux * sp; ty = -uy * sp; }
      else if (d > this.def.keepMax || !los) { tx = ux * sp; ty = uy * sp; }
      else { tx = -uy * this.strafe * sp * 0.6; ty = ux * this.strafe * sp * 0.6; }
      if (this.hitWall) this.strafe *= -1;
    } else {
      if (d > this.def.engage) { tx = ux * sp; ty = uy * sp; }
      else {
        tx = -uy * this.strafe * sp * 0.45 + ux * sp * 0.08;
        ty = ux * this.strafe * sp * 0.45 + uy * sp * 0.08;
      }
    }
    const k = 1 - Math.exp(-8 * dt);
    this.mx += (tx - this.mx) * k; this.my += (ty - this.my) * k;
  }

  chooseAttack(d, game) {
    const c = [];
    for (const [name, a] of Object.entries(this.def.attacks)) {
      if (!a.weight) continue;
      if ((a.phase || 1) > this.phase) continue;
      if (d < a.range[0] || d > a.range[1]) continue;
      if (a.los && !game.map.los(this.x, this.y, game.player.x, game.player.y)) continue;
      c.push([name, a.weight]);
    }
    return c.length ? weightedPick(c) : null;
  }

  updateWindup(dt, game) {
    const a = this.atk, p = game.player;
    const W = a.windup * this.tempo, frac = this.t / W;
    this.decay(dt, 10);
    if (a.track && frac < (a.trackUntil ?? 1)) {
      this.facing = turnToward(this.facing, Math.atan2(p.y - this.y, p.x - this.x), a.track * dt);
    }
    if (a.shape === 'leap' && frac < (a.trackUntil ?? 0.85)) { this.leapTarget.x = p.x; this.leapTarget.y = p.y; }
    if (this.t >= W) { this.state = 'active'; this.t = 0; this.beginActive(game); }
  }

  attackCenter() {
    const a = this.atk;
    if (a.shape === 'leap') return this.leapTarget;
    const o = a.offset || 0;
    return { x: this.x + Math.cos(this.facing) * o, y: this.y + Math.sin(this.facing) * o };
  }

  beginActive(game) {
    const a = this.atk, f = this.facing;
    this.hasHit = false;
    switch (a.shape) {
      case 'arc':
        if (a.moveDuring) { this.mx = Math.cos(f) * a.moveDuring; this.my = Math.sin(f) * a.moveDuring; }
        Sfx.play(this.isBoss || this.type === 'brute' ? 'heavyswing' : 'swing');
        break;
      case 'lunge': case 'charge':
        this.dashDir = f;
        Sfx.play('dodge');
        break;
      case 'projectile':
        for (let i = 0; i < a.count; i++) {
          const ang = f + (i - (a.count - 1) / 2) * a.spread;
          game.projectiles.push(new Projectile(this.x + Math.cos(ang) * 14, this.y + Math.sin(ang) * 14, ang, a.projSpeed, a.dmg * this.dmgMult, {}));
        }
        Sfx.play('arrow');
        break;
      case 'burst': {
        const off = a.offsetAngle ? Math.PI / a.count : 0;
        for (let i = 0; i < a.count; i++) {
          const ang = this.burstBase + off + i * TAU / a.count;
          game.projectiles.push(new Projectile(this.x + Math.cos(ang) * 30, this.y + Math.sin(ang) * 30, ang, a.projSpeed, a.dmg * this.dmgMult,
            { r: 7, color: '#c07aff', kind: 'orb', life: 3.5 }));
        }
        game.fx.burst(this.x, this.y, 20, '#c07aff', 200, 0.5, 3);
        Sfx.play('boom');
        break;
      }
      case 'leap':
        this.airborne = true;
        this.leapFrom = { x: this.x, y: this.y };
        Sfx.play('heavyswing');
        break;
      case 'circle': {
        const c = this.attackCenter();
        game.fx.addShake(a.shake || 4);
        game.fx.burst(c.x, c.y, 18, 'rgba(150,130,110,0.8)', 160, 0.6, 4);
        game.fx.decal(c.x, c.y, a.radius * 0.5, 'rgba(0,0,0,0.25)');
        Sfx.play('thud');
        if (a.ring) game.shockwaves.push(new Shockwave(this.x, this.y, { ...a.ring, dmg: a.ring.dmg * this.dmgMult }));
        break;
      }
    }
  }

  updateActive(dt, game) {
    const a = this.atk, A = a.active;
    switch (a.shape) {
      case 'arc': this.decay(dt, 9); this.checkHit(game); break;
      case 'circle': this.checkHit(game); break;
      case 'lunge': case 'charge': {
        const sp = a.speed * (a.shape === 'lunge' ? 1 - (this.t / A) * 0.6 : 1);
        this.mx = Math.cos(this.dashDir) * sp; this.my = Math.sin(this.dashDir) * sp;
        this.checkHit(game);
        if (Math.random() < 0.6) game.fx.burst(this.x, this.y + this.r * 0.6, 1, 'rgba(120,110,100,0.6)', 30, 0.4, 4);
        if (a.shape === 'charge' && this.hitWall && this.t > 0.08) {
          game.fx.addShake(10); Sfx.play('thud');
          game.fx.burst(this.x + Math.cos(this.dashDir) * this.r, this.y + Math.sin(this.dashDir) * this.r, 20, '#9a8f84', 200, 0.6, 4);
          this.state = 'recover'; this.t = -0.4; this.mx = this.my = 0; // dazed: longer punish window
          return;
        }
        break;
      }
      case 'leap': {
        const k = clamp(this.t / A, 0, 1);
        this.x = lerp(this.leapFrom.x, this.leapTarget.x, easeInOut(k));
        this.y = lerp(this.leapFrom.y, this.leapTarget.y, easeInOut(k));
        this.z = Math.sin(k * Math.PI) * 70;
        break;
      }
    }
    if (this.t >= A) {
      if (a.shape === 'leap') {
        this.airborne = false; this.z = 0;
        this.checkHit(game);
        game.fx.addShake(a.shake || 12);
        game.fx.burst(this.x, this.y, 36, 'rgba(160,140,120,0.85)', 260, 0.7, 5);
        game.fx.decal(this.x, this.y, a.radius * 0.6, 'rgba(0,0,0,0.3)');
        Sfx.play('boom');
      }
      if (a.shape === 'lunge' || a.shape === 'charge') { this.mx *= 0.3; this.my *= 0.3; }
      this.state = 'recover'; this.t = 0;
    }
  }

  checkHit(game) {
    if (this.hasHit) return;
    const p = game.player, a = this.atk;
    if (p.dead) return;
    let inside = false;
    const d = dist(this.x, this.y, p.x, p.y);
    if (a.shape === 'arc') {
      if (d <= a.reach + p.r) {
        const ad = Math.abs(angleDiff(this.facing, Math.atan2(p.y - this.y, p.x - this.x)));
        inside = ad <= a.arc / 2 + Math.atan2(p.r, Math.max(d, 1));
      }
    } else if (a.shape === 'circle' || a.shape === 'leap') {
      const c = this.attackCenter();
      inside = dist(c.x, c.y, p.x, p.y) <= a.radius + p.r * 0.5;
    } else if (a.shape === 'lunge' || a.shape === 'charge') {
      inside = d <= this.r + p.r + 4;
    }
    if (!inside) return;
    const res = p.receiveHit({ dmg: a.dmg * this.dmgMult, x: this.x, y: this.y, parryable: !!a.parryable, knock: a.knock || 200, src: this }, game);
    if (res === 'hit') this.hasHit = true;
    else if (res === 'parried') { this.hasHit = true; if (!this.dead) this.getParried(game); }
  }

  getParried(game) {
    this.setState('riposte', this.isBoss ? 1.7 : 2.0);
    this.mx = this.my = 0;
    game.fx.text(this.x, this.y - this.r - 14, 'OPEN!', '#ffe28a', 14);
  }

  // Player hits this enemy. Returns { dmg, crit }.
  takeHit(dmg, poiseDmg, src, game, heavy) {
    let crit = false;
    if (this.state === 'riposte') { dmg *= 2.6 * src.mods.riposte; crit = true; }
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.flash = 0.12;
    this.sinceHit = 0;
    const ang = Math.atan2(this.y - src.y, this.x - src.x);
    game.fx.burst(this.x, this.y, crit ? 26 : 10, crit ? '#ffcf6a' : '#d8d0c0', crit ? 260 : 170, 0.45, 3, ang, 1.2);
    game.fx.burst(this.x, this.y, 6, '#5a0f18', 140, 0.5, 3, ang, 1.0);
    game.fx.decal(this.x + rand(-8, 8), this.y + rand(-8, 8), rand(3, 7), 'rgba(80,10,15,0.35)');
    game.fx.text(this.x, this.y - this.r - 10, crit ? `${dmg}!` : String(dmg), crit ? '#ffcf6a' : '#f2ece0', crit ? 20 : 13);

    if (!this.isHyper() && !this.isBoss) {
      const kb = (heavy ? 220 : 120) * (this.type === 'brute' ? 0.35 : 1);
      this.vx += Math.cos(ang) * kb; this.vy += Math.sin(ang) * kb;
    }

    if (this.hp <= 0) { this.hp = 0; this.die(game); return { dmg, crit }; }
    if (crit) { this.setState('stagger', 0.45); this.poise = this.def.poise; return { dmg, crit }; }

    this.poise -= poiseDmg;
    if (this.poise <= 0) {
      if (this.isBoss) {
        // posture broken: boss becomes open for a critical
        this.poise = this.def.poise;
        this.setState('riposte', 2.0);
        game.fx.text(this.x, this.y - this.r - 24, 'POSTURE BROKEN', '#ffcf6a', 16);
        Sfx.play('stagger');
      } else if (this.isHyper()) {
        this.poise = 1; // hyper-armour holds; it breaks on the next hit after the attack
      } else {
        this.poise = this.def.poise;
        this.setState('stagger', this.def.staggerTime || 0.7);
        game.fx.text(this.x, this.y - this.r - 22, 'STAGGERED', '#c9c0ff', 12);
        Sfx.play('stagger');
      }
    }
    return { dmg, crit };
  }

  die(game) {
    this.dead = true; this.state = 'dead'; this.deathT = 0;
    this.airborne = false; this.z = 0; this.atk = null;
    game.onEnemyKilled(this);
  }

  // ---- rendering ----
  renderTelegraph(ctx) {
    if (this.dead || !this.atk || (this.state !== 'windup' && this.state !== 'active')) return;
    const a = this.atk;
    const W = a.windup * this.tempo;
    const frac = this.state === 'windup' ? clamp(this.t / W, 0, 1) : 1;
    const col = a.parryable ? '255,170,60' : '235,50,40';
    const alpha = this.state === 'active' ? 0.45 : 0.06 + 0.22 * frac;
    ctx.fillStyle = `rgba(${col},${alpha})`;
    ctx.strokeStyle = `rgba(${col},${0.25 + 0.5 * frac})`;
    ctx.lineWidth = 1.5;
    const f = this.facing;
    switch (a.shape) {
      case 'arc': {
        ctx.beginPath(); ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, a.reach * (0.4 + 0.6 * frac), f - a.arc / 2, f + a.arc / 2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, this.y, a.reach, f - a.arc / 2, f + a.arc / 2); ctx.stroke();
        break;
      }
      case 'circle': case 'leap': {
        const c = this.attackCenter();
        ctx.beginPath(); ctx.arc(c.x, c.y, a.radius * frac, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x, c.y, a.radius, 0, TAU); ctx.stroke();
        break;
      }
      case 'lunge': case 'charge': {
        if (this.state !== 'windup') break;
        const len = a.shape === 'charge' ? 380 : a.speed * a.active * 0.75;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(f);
        ctx.fillRect(0, -this.r, len * frac, this.r * 2);
        ctx.strokeRect(0, -this.r, len, this.r * 2);
        ctx.restore();
        break;
      }
      case 'projectile': {
        if (this.state !== 'windup') break;
        ctx.strokeStyle = `rgba(255,90,70,${0.15 + 0.5 * frac})`;
        ctx.setLineDash([6, 6]);
        for (let i = 0; i < a.count; i++) {
          const ang = f + (i - (a.count - 1) / 2) * a.spread;
          ctx.beginPath(); ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(ang) * 420, this.y + Math.sin(ang) * 420); ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }
      case 'burst': {
        if (this.state !== 'windup') break;
        const off = a.offsetAngle ? Math.PI / a.count : 0;
        ctx.strokeStyle = `rgba(190,120,255,${0.2 + 0.5 * frac})`;
        for (let i = 0; i < a.count; i++) {
          const ang = this.burstBase + off + i * TAU / a.count;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(ang) * 30, this.y + Math.sin(ang) * 30);
          ctx.lineTo(this.x + Math.cos(ang) * (30 + 90 * frac), this.y + Math.sin(ang) * (30 + 90 * frac));
          ctx.stroke();
        }
        break;
      }
    }
  }

  weaponAngle() {
    const f = this.facing, a = this.atk;
    if (a && a.shape === 'arc') {
      const half = a.arc / 2;
      if (this.state === 'windup') return f - (half + 0.3) * easeOut(clamp(this.t / (a.windup * this.tempo), 0, 1));
      if (this.state === 'active') return f + lerp(-half - 0.3, half, easeOut(this.t / a.active));
      if (this.state === 'recover') return f + half;
    }
    if (a && (a.shape === 'circle' || a.shape === 'leap') && this.state === 'windup') return f + Math.PI * 0.85 * easeOut(clamp(this.t / (a.windup * this.tempo), 0, 1));
    return f + 0.8;
  }

  render(ctx, game) {
    const d = this.def;
    let alpha = 1;
    if (this.dead) alpha = clamp(1 - this.deathT / 0.7, 0, 1);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const y = this.y - this.z;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    const ss = 1 - this.z / 140;
    ctx.beginPath(); ctx.ellipse(this.x, this.y + this.r * 0.7, this.r * ss, this.r * 0.45 * ss, 0, 0, TAU); ctx.fill();

    // weapon
    const wa = this.weaponAngle();
    const wx = this.x + Math.cos(wa) * this.r * 0.6, wy = y + Math.sin(wa) * this.r * 0.6;
    const wl = (this.atk && this.atk.reach ? this.atk.reach - this.r * 0.4 : this.r * 1.6);
    ctx.lineCap = 'round';
    switch (d.weapon) {
      case 'sword':
        ctx.strokeStyle = '#a9a69a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(wa) * Math.min(wl, 34), wy + Math.sin(wa) * Math.min(wl, 34)); ctx.stroke();
        break;
      case 'claws':
        ctx.strokeStyle = '#e0d0d8'; ctx.lineWidth = 2;
        for (const o of [-0.35, 0, 0.35]) {
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(wa + o) * 12, wy + Math.sin(wa + o) * 12); ctx.stroke();
        }
        break;
      case 'bow': {
        const f = this.facing;
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(this.x + Math.cos(f) * 6, y + Math.sin(f) * 6, 13, f - 1.2, f + 1.2); ctx.stroke();
        if (this.state === 'windup') {
          const pull = 6 * clamp(this.t / (this.atk.windup * this.tempo), 0, 1);
          ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
          const bx = this.x + Math.cos(f) * 6, by = y + Math.sin(f) * 6;
          const e1 = [bx + Math.cos(f - 1.2) * 13, by + Math.sin(f - 1.2) * 13], e2 = [bx + Math.cos(f + 1.2) * 13, by + Math.sin(f + 1.2) * 13];
          const m = [bx + Math.cos(f) * (5 - pull), by + Math.sin(f) * (5 - pull)];
          ctx.beginPath(); ctx.moveTo(...e1); ctx.lineTo(...m); ctx.lineTo(...e2); ctx.stroke();
        }
        break;
      }
      case 'club':
        ctx.strokeStyle = '#5a4430'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(wa) * 40, wy + Math.sin(wa) * 40); ctx.stroke();
        ctx.fillStyle = '#4a3828';
        ctx.beginPath(); ctx.arc(wx + Math.cos(wa) * 42, wy + Math.sin(wa) * 42, 8, 0, TAU); ctx.fill();
        break;
      case 'axe': {
        const L = 70;
        ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(wa) * L, wy + Math.sin(wa) * L); ctx.stroke();
        const hx = wx + Math.cos(wa) * (L - 8), hy = wy + Math.sin(wa) * (L - 8);
        ctx.fillStyle = '#9c9aa8';
        ctx.beginPath();
        ctx.arc(hx, hy, 20, wa + Math.PI / 2 - 1.1, wa + Math.PI / 2 + 1.1);
        ctx.lineTo(hx, hy); ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy, 14, wa - Math.PI / 2 - 0.9, wa - Math.PI / 2 + 0.9);
        ctx.lineTo(hx, hy); ctx.fill();
        break;
      }
    }

    // body
    const windGlow = this.state === 'windup' && this.atk && this.t / (this.atk.windup * this.tempo) > 0.78;
    ctx.fillStyle = d.dark;
    ctx.beginPath(); ctx.arc(this.x, y, this.r + 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : d.color;
    ctx.beginPath(); ctx.arc(this.x, y, this.r - 1.5, 0, TAU); ctx.fill();
    if (this.isBoss) {
      // horns + mantle
      ctx.fillStyle = '#d8cfc0';
      for (const s of [-1, 1]) {
        const ha = this.facing + s * 1.1;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(ha) * this.r * 0.7, y + Math.sin(ha) * this.r * 0.7);
        ctx.lineTo(this.x + Math.cos(ha + s * 0.35) * (this.r + 16), y + Math.sin(ha + s * 0.35) * (this.r + 16));
        ctx.lineTo(this.x + Math.cos(ha - s * 0.3) * this.r * 0.9, y + Math.sin(ha - s * 0.3) * this.r * 0.9);
        ctx.fill();
      }
      ctx.strokeStyle = this.phase === 2 ? '#c07aff' : '#3a3044'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, y, this.r - 6, 0, TAU); ctx.stroke();
    }
    // eyes
    const f = this.facing;
    ctx.fillStyle = this.isBoss ? (this.phase === 2 ? '#d9a0ff' : '#ff6a3a') : (this.type === 'archer' ? '#6ad0ff' : '#ff4a3a');
    for (const s of [-0.45, 0.45]) {
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(f + s) * this.r * 0.6, y + Math.sin(f + s) * this.r * 0.6, this.isBoss ? 3 : 1.8, 0, TAU);
      ctx.fill();
    }
    if (windGlow) {
      ctx.strokeStyle = this.atk.parryable ? 'rgba(255,200,90,0.9)' : 'rgba(255,60,50,0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, y, this.r + 5, 0, TAU); ctx.stroke();
    }
    if (this.state === 'riposte') {
      ctx.strokeStyle = `rgba(255,220,120,${0.6 + 0.4 * Math.sin(this.t * 18)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(this.x, y, this.r + 7, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    } else if (this.state === 'stagger') {
      ctx.fillStyle = '#c9c0ff';
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + i * TAU / 3;
        ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * 10, y - this.r - 6 + Math.sin(a) * 3, 2, 0, TAU); ctx.fill();
      }
    }

    // health bar (non-boss)
    if (!this.isBoss && !this.dead && this.hp < this.maxHp) {
      const w = this.r * 2.6, bx = this.x - w / 2, by = y - this.r - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, by - 1, w + 2, 5);
      ctx.fillStyle = '#d8c8a0'; ctx.fillRect(bx, by, w * this.hpShown / this.maxHp, 3);
      ctx.fillStyle = '#b0202a'; ctx.fillRect(bx, by, w * this.hp / this.maxHp, 3);
    }
    ctx.globalAlpha = 1;
  }
}

class Boss extends Enemy {
  constructor(type, x, y, cfg) {
    super(type, x, y, cfg);
    this.roared = false;
  }
  update(dt, game) {
    if (!this.dead && this.phase === 1 && this.hp <= this.maxHp * 0.5 && ['chase', 'recover', 'stagger', 'riposte'].includes(this.state)) {
      this.phase = 2; this.tempo = 0.8;
      this.setState('roar', 1.8); this.roared = false;
      game.toast(`${this.def.name.split(',')[0]} is consumed by the void`, '', 2.5, 'small');
      Sfx.play('roar');
    }
    if (this.state === 'roar') {
      if (this.tickBleed(dt, game)) return;
      this.t += dt;
      this.decay(dt, 8);
      if (this.hpShown > this.hp) this.hpShown = Math.max(this.hp, this.hpShown - this.maxHp * 0.6 * dt);
      if (Math.random() < 0.6) game.fx.embers(this.x, this.y, 2, '#c07aff');
      if (!this.roared && this.t > 0.6) {
        this.roared = true;
        game.shockwaves.push(new Shockwave(this.x, this.y, { speed: 440, maxR: 520, width: 22, dmg: 20 * this.dmgMult }));
        game.fx.addShake(16);
      }
      if (this.t >= this.dur) { this.setState('chase'); this.cooldown = 0.2; }
      this.x += this.mx * dt; this.y += this.my * dt;
      game.map.collideCircle(this);
      return;
    }
    super.update(dt, game);
  }
}

class Projectile {
  constructor(x, y, ang, speed, dmg, o) {
    this.x = x; this.y = y;
    this.vx = Math.cos(ang) * speed; this.vy = Math.sin(ang) * speed;
    this.ang = ang;
    this.r = o.r || 4; this.dmg = dmg; this.life = o.life || 3;
    this.color = o.color || '#e8dcb0'; this.kind = o.kind || 'arrow';
    this.dead = false;
  }
  update(dt, game) {
    this.life -= dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || game.map.solidAt(this.x, this.y)) {
      this.dead = true;
      game.fx.burst(this.x, this.y, 5, this.color, 90, 0.3, 2);
      return;
    }
    if (this.kind === 'orb' && Math.random() < 0.3) game.fx.embers(this.x, this.y, 1, '#a060ff');
    const p = game.player;
    if (!p.dead && dist(this.x, this.y, p.x, p.y) < this.r + p.r) {
      const res = p.receiveHit({ dmg: this.dmg, x: this.x - this.vx * 0.1, y: this.y - this.vy * 0.1, parryable: false, knock: 150 }, game);
      if (res === 'hit') this.dead = true;
    }
  }
  render(ctx) {
    if (this.kind === 'arrow') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - Math.cos(this.ang) * 16, this.y - Math.sin(this.ang) * 16);
      ctx.stroke();
      ctx.fillStyle = '#ff7a5a';
      ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, TAU); ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(160,90,255,0.35)';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#e8d0ff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.8, 0, TAU); ctx.fill();
    }
  }
}

class Shockwave {
  constructor(x, y, o) {
    this.x = x; this.y = y; this.r = 10;
    this.speed = o.speed; this.maxR = o.maxR; this.width = o.width; this.dmg = o.dmg;
    this.hit = false; this.dead = false;
  }
  update(dt, game) {
    this.r += this.speed * dt;
    if (this.r > this.maxR) { this.dead = true; return; }
    if (this.hit) return;
    const p = game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (Math.abs(d - this.r) < this.width / 2 + p.r * 0.6) {
      const res = p.receiveHit({ dmg: this.dmg, x: this.x, y: this.y, parryable: false, knock: 320 }, game);
      if (res === 'hit') this.hit = true;
    }
  }
  render(ctx) {
    const a = 1 - this.r / this.maxR;
    ctx.strokeStyle = `rgba(200,130,255,${0.7 * a})`;
    ctx.lineWidth = this.width;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,255,${0.8 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
  }
}
