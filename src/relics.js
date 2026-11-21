// ---------- Relics: run-long passive modifiers ----------
const RELICS = [
  { id: 'whetstone', name: 'Cracked Whetstone', desc: '+15% damage.', color: '#d8d0c0', apply: m => { m.dmg *= 1.15; } },
  { id: 'emberheart', name: 'Ember Heart', desc: '+25 max HP.', color: '#e05a3a', apply: m => { m.maxHp += 25; } },
  { id: 'feather', name: 'Ashen Feather', desc: 'Dodging costs 35% less stamina.', color: '#b9c7d6', apply: m => { m.dodgeCost *= 0.65; } },
  { id: 'fang', name: 'Leech Fang', desc: 'Heal 2 HP for every hit you land.', color: '#a3243a', apply: m => { m.lifesteal += 2; } },
  { id: 'duelist', name: "Duelist's Ring", desc: 'Parry window +60%. Ripostes deal +50% damage.', color: '#e8c25a', apply: m => { m.parryWindow *= 1.6; m.riposte *= 1.5; } },
  { id: 'shell', name: 'Gaolstone Shell', desc: 'Take 15% less damage. Move 6% slower.', color: '#7f8a7a', apply: m => { m.dmgTaken *= 0.85; m.speed *= 0.94; } },
  { id: 'lung', name: 'Second Lung', desc: 'Stamina regenerates 30% faster.', color: '#7fc98a', apply: m => { m.staminaRegen *= 1.3; } },
  { id: 'flask', name: 'Spare Flask', desc: '+1 healing flask.', color: '#e0913a', apply: m => { m.flasks += 1; } },
  { id: 'glass', name: 'Glass Edge', desc: '+35% damage, but -30 max HP.', color: '#9fe3f0', apply: m => { m.dmg *= 1.35; m.maxHp -= 30; } },
  { id: 'shadow', name: 'Shadowstep Wraps', desc: 'Dodge travels 25% further with longer invincibility.', color: '#8c76b4', apply: m => { m.dodgeDist *= 1.25; m.iframes *= 1.3; } },
  { id: 'censer', name: 'Ember Censer', desc: '+50% embers gained.', color: '#f0a040', apply: m => { m.emberGain *= 1.5; } },
  { id: 'grudge', name: 'Grudge Brand', desc: 'After taking damage, your next hit deals +60%.', color: '#c04040', apply: m => { m.vengeance = true; } },
  { id: 'ironlung', name: 'Iron Lungs', desc: '+25 max stamina.', color: '#8fbf6a', apply: m => { m.stamina += 25; } },
  { id: 'draught', name: 'Potent Draught', desc: 'Flasks heal 35% more.', color: '#f2c14e', apply: m => { m.healPower *= 1.35; } },
  { id: 'grip', name: "Executioner's Grip", desc: 'Heavy attacks deal +30% damage and +50% poise damage.', color: '#b07050', apply: m => { m.heavyDmg *= 1.3; m.heavyPoise *= 1.5; } },
  // ---- Forbidden Reliquary (unlocked at the Ashen Smith) ----
  { id: 'bell', requires: 'reliquary', name: 'Echoing Bell', desc: 'A successful parry releases a shockwave that hurts nearby enemies.', color: '#f0e0a0', apply: m => { m.parryWave = true; } },
  { id: 'serrated', requires: 'reliquary', name: 'Serrated Edge', desc: 'Hits make enemies bleed for 15 damage over 3 seconds.', color: '#d0304a', apply: m => { m.bleed = true; } },
  { id: 'sigil', requires: 'reliquary', name: 'Wind Sigil', desc: 'Attacks within 0.6 s of finishing a roll deal +40% damage.', color: '#a8e0d0', apply: m => { m.rollStrike = true; } },
  { id: 'pact', requires: 'reliquary', name: 'Pact of Ash', desc: 'Cursed: +50% damage, but flasks heal 40% less.', color: '#7a5a8a', apply: m => { m.dmg *= 1.5; m.healPower *= 0.6; } },
  { id: 'phylactery', requires: 'reliquary', name: 'Ember Phylactery', desc: 'Once per climb, survive a killing blow with 1 HP.', color: '#ff8a4a', apply: m => { m.phylactery = true; } },
];

function computeMods(run) {
  const m = {
    dmg: 1, maxHp: 0, stamina: 0, dodgeCost: 1, lifesteal: 0, parryWindow: 1, riposte: 1,
    dmgTaken: 1, speed: 1, staminaRegen: 1, flasks: 0, dodgeDist: 1, iframes: 1,
    emberGain: 1, vengeance: false, healPower: 1, heavyDmg: 1, heavyPoise: 1,
    parryWave: false, bleed: false, rollStrike: false, phylactery: false,
  };
  const w = WEAPONS[run.weapon] || WEAPONS[DEFAULT_WEAPON];
  if (w.mods) w.mods(m);
  for (const id of run.relics) {
    const r = RELICS.find(x => x.id === id);
    if (r) r.apply(m);
  }
  return m;
}

function rollRelics(run, n = 3) {
  const unlocked = (typeof Game !== 'undefined' && Game.meta && Game.meta.unlocks) || [];
  const avail = RELICS.filter(r => !run.relics.includes(r.id) && (!r.requires || unlocked.includes(r.requires)));
  const out = [];
  while (out.length < n && avail.length) out.push(avail.splice(Math.floor(Math.random() * avail.length), 1)[0]);
  return out;
}
