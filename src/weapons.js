// ---------- Weapons: each one is a full moveset ----------
// Attack fields: windup/active/recover (s), dmg, poise, reach (px), arc (rad),
// stamina, lunge (px/s forward during active), next (combo link), dir (swing side),
// heavy, hyper (player can't be staggered during windup/active), thrust (stab, no sweep).
// Weapon fields: look (how it's drawn), mods (passive stat tweaks), backstab (dmg mult from behind).
const WEAPONS = {
  longsword: {
    name: 'Ashen Longsword', short: 'Longsword', color: '#dfe3ea',
    desc: 'Balanced. Three-hit combo and a solid heavy.',
    look: { kind: 'sword', len: 34, idle: 26, width: 3 },
    attacks: {
      light1: { windup: 0.13, active: 0.1, recover: 0.28, dmg: 16, poise: 10, reach: 52, arc: 1.9, stamina: 16, lunge: 110, next: 'light2', dir: 1 },
      light2: { windup: 0.11, active: 0.1, recover: 0.3, dmg: 16, poise: 10, reach: 52, arc: 1.9, stamina: 16, lunge: 110, next: 'light3', dir: -1 },
      light3: { windup: 0.22, active: 0.12, recover: 0.46, dmg: 26, poise: 20, reach: 58, arc: 2.5, stamina: 22, lunge: 170, next: null, dir: 1 },
      heavy: { windup: 0.48, active: 0.13, recover: 0.5, dmg: 42, poise: 38, reach: 66, arc: 2.6, stamina: 32, lunge: 190, next: null, dir: 1, heavy: true },
    },
  },
  greatsword: {
    name: 'Gaolbreaker Greatsword', short: 'Greatsword', blurb: 'Slow, poise-shattering swings. Heavy shrugs off hits.', color: '#b9c0cc',
    desc: 'Slow, crushing swings that shatter poise. You keep your footing while the heavy winds up.',
    look: { kind: 'great', len: 50, idle: 38, width: 6 },
    mods: m => { m.speed *= 0.94; },
    attacks: {
      light1: { windup: 0.3, active: 0.14, recover: 0.42, dmg: 30, poise: 30, reach: 66, arc: 2.6, stamina: 26, lunge: 120, next: 'light2', dir: 1 },
      light2: { windup: 0.28, active: 0.14, recover: 0.58, dmg: 34, poise: 34, reach: 66, arc: 2.6, stamina: 28, lunge: 130, next: null, dir: -1 },
      heavy: { windup: 0.78, active: 0.16, recover: 0.62, dmg: 70, poise: 80, reach: 74, arc: 2.4, stamina: 44, lunge: 150, next: null, dir: 1, heavy: true, hyper: true },
    },
  },
  daggers: {
    name: 'Twin Fangs', short: 'Daggers', blurb: 'Fast four-hit flurry. +70% damage from behind.', color: '#e2d6f0',
    desc: 'A fast four-hit flurry and a spinning heavy. Hits from behind deal +70%. Rolls cost less.',
    look: { kind: 'daggers', len: 20, idle: 16, width: 2.5 },
    backstab: 1.7,
    mods: m => { m.dodgeCost *= 0.8; m.speed *= 1.04; },
    attacks: {
      light1: { windup: 0.07, active: 0.08, recover: 0.17, dmg: 9, poise: 5, reach: 40, arc: 1.7, stamina: 9, lunge: 90, next: 'light2', dir: 1 },
      light2: { windup: 0.06, active: 0.08, recover: 0.17, dmg: 9, poise: 5, reach: 40, arc: 1.7, stamina: 9, lunge: 90, next: 'light3', dir: -1 },
      light3: { windup: 0.06, active: 0.08, recover: 0.19, dmg: 10, poise: 6, reach: 40, arc: 1.7, stamina: 9, lunge: 90, next: 'light4', dir: 1 },
      light4: { windup: 0.14, active: 0.1, recover: 0.38, dmg: 17, poise: 10, reach: 48, arc: 0.6, stamina: 12, lunge: 210, next: null, dir: 1, thrust: true },
      heavy: { windup: 0.3, active: 0.22, recover: 0.42, dmg: 24, poise: 14, reach: 54, arc: TAU, stamina: 24, lunge: 60, next: null, dir: 1, heavy: true },
    },
  },
  spear: {
    name: "Warden's Pike", short: 'Spear', blurb: 'Long-reach thrusts and a wide sweeping heavy.', color: '#d8d0c0',
    desc: 'Long-reach thrusts keep enemies at a distance. The heavy sweeps everything in front of you.',
    look: { kind: 'spear', len: 62, idle: 50, width: 2.5 },
    attacks: {
      light1: { windup: 0.17, active: 0.1, recover: 0.3, dmg: 15, poise: 9, reach: 90, arc: 0.5, stamina: 16, lunge: 120, next: 'light2', dir: 1, thrust: true },
      light2: { windup: 0.15, active: 0.1, recover: 0.32, dmg: 15, poise: 9, reach: 90, arc: 0.5, stamina: 16, lunge: 120, next: 'light3', dir: 1, thrust: true },
      light3: { windup: 0.26, active: 0.12, recover: 0.5, dmg: 25, poise: 18, reach: 102, arc: 0.45, stamina: 22, lunge: 200, next: null, dir: 1, thrust: true },
      heavy: { windup: 0.5, active: 0.15, recover: 0.52, dmg: 34, poise: 30, reach: 86, arc: 3.2, stamina: 32, lunge: 90, next: null, dir: 1, heavy: true },
    },
  },
};
const DEFAULT_WEAPON = 'longsword';
