// ---------- Meta-progression: Ashes, unlocks, the hub at the foot of the spire ----------
// Ashes are the persistent currency. A share of the embers you earn in a run (spent or not)
// turns to ash when the run ends, plus a bonus for every Warden felled.
// Unlocks widen your options (weapons, relic pool, starting boons); they are never flat stat boosts.
const ASH_SHARE = 0.4;
const ASH_PER_WARDEN = 150;

const UNLOCKS = [
  { id: 'w_greatsword', kind: 'weapon', weapon: 'greatsword', cost: 120 },
  { id: 'w_daggers', kind: 'weapon', weapon: 'daggers', cost: 120 },
  { id: 'w_spear', kind: 'weapon', weapon: 'spear', cost: 120 },
  { id: 'reliquary', kind: 'pool', name: 'Forbidden Reliquary', desc: 'Adds 5 stranger relics to the chest pool.', cost: 200, color: '#c07aff' },
  { id: 'b_purse', kind: 'boon', name: 'Ember Purse', desc: 'Boon: begin the climb with 120 embers.', cost: 100, color: '#ffc875' },
  { id: 'b_flask', kind: 'boon', name: 'Spare Flask', desc: 'Boon: begin with the Spare Flask relic (+1 flask).', cost: 140, color: '#e0913a' },
  { id: 'b_gift', kind: 'boon', name: "Pilgrim's Gift", desc: 'Boon: choose a relic before the first room.', cost: 180, color: '#e8c25a' },
];

const Meta = {
  has(game, id) { return game.meta.unlocks.includes(id); },
  ownedWeapons(game) {
    return Object.keys(WEAPONS).filter(w => w === DEFAULT_WEAPON || this.has(game, 'w_' + w));
  },
  ownedBoons(game) { return UNLOCKS.filter(u => u.kind === 'boon' && this.has(game, u.id)); },
  unlockName(u) { return u.kind === 'weapon' ? WEAPONS[u.weapon].name : u.name; },
  unlockDesc(u) { return u.kind === 'weapon' ? 'Weapon: ' + WEAPONS[u.weapon].blurb : u.desc; },
  unlockColor(u) { return u.kind === 'weapon' ? WEAPONS[u.weapon].color : u.color; },

  // Convert the run's embers to ashes once per run. Returns the amount awarded.
  award(game) {
    const run = game.run;
    if (!run || run.ashesAwarded != null) return run ? run.ashesAwarded : 0;
    const n = Math.round(run.embersEarned * ASH_SHARE + run.wardens * ASH_PER_WARDEN);
    run.ashesAwarded = n;
    game.meta.ashes += n;
    game.saveMeta();
    return n;
  },
};

// ---------- Hub menus ----------
function openHubMenu(game, sel = 0) {
  const m = game.meta;
  const w = WEAPONS[m.weapon] ? m.weapon : DEFAULT_WEAPON;
  const affordable = UNLOCKS.filter(u => !Meta.has(game, u.id) && m.ashes >= u.cost).length;
  openMenu(game, {
    hub: true, returnTo: 'title',
    title: 'The Foot of the Spire',
    subtitle: `${m.ashes} ashes  ·  ${m.runs} climbs  ·  ${m.wardens} Wardens felled`,
    items: [
      { label: 'Begin the climb', sub: `Wielding the ${WEAPONS[w].name}`, action: () => openWeaponMenu(game) },
      {
        label: 'The Ashen Smith', color: '#c9772f',
        sub: affordable ? `You can afford ${affordable} unlock${affordable > 1 ? 's' : ''}` : 'Spend ashes on new weapons, relics and boons',
        action: () => openSmithMenu(game),
      },
      { label: 'Back to the title', action: () => { game.menu = null; game.state = 'title'; } },
    ],
  });
  game.menu.sel = sel;
}

function openSmithMenu(game, sel = 0) {
  const m = game.meta;
  openMenu(game, {
    hub: true, onBack: () => openHubMenu(game, 1),
    title: 'The Ashen Smith',
    subtitle: `${m.ashes} ashes. Unlocks are permanent.`,
    items: [
      ...UNLOCKS.map(u => {
        const owned = Meta.has(game, u.id);
        return {
          label: `${Meta.unlockName(u)}${owned ? '  ✓' : ''}`,
          sub: Meta.unlockDesc(u),
          right: owned ? 'owned' : `${u.cost} ashes`,
          color: Meta.unlockColor(u),
          enabled: !owned && m.ashes >= u.cost,
          action: () => {
            m.ashes -= u.cost;
            m.unlocks.push(u.id);
            if (u.kind === 'weapon') m.weapon = u.weapon;
            game.saveMeta();
            Sfx.play('levelup');
            openSmithMenu(game, UNLOCKS.indexOf(u));
          },
        };
      }),
      { label: 'Back', action: () => openHubMenu(game, 1) },
    ],
  });
  const it = game.menu.items;
  game.menu.sel = it[sel] && it[sel].enabled !== false ? sel : it.length - 1;
}

function openWeaponMenu(game) {
  const owned = Meta.ownedWeapons(game);
  const pick = w => { game.meta.weapon = w; game.saveMeta(); openBoonMenu(game, w); };
  if (owned.length === 1) { pick(owned[0]); return; }
  openMenu(game, {
    hub: true, onBack: () => openHubMenu(game),
    title: 'Choose your weapon',
    subtitle: 'You carry it for the whole climb',
    items: owned.map(w => ({ label: WEAPONS[w].name, sub: WEAPONS[w].desc, color: WEAPONS[w].color, action: () => pick(w) })),
  });
  game.menu.sel = Math.max(0, owned.indexOf(game.meta.weapon));
}

function openBoonMenu(game, weapon) {
  const boons = Meta.ownedBoons(game);
  if (!boons.length) { game.menu = null; game.newRun(weapon, null); return; }
  openMenu(game, {
    hub: true, onBack: () => openWeaponMenu(game),
    title: 'Choose a boon',
    subtitle: 'One gift to carry up the first stair',
    items: [
      ...boons.map(b => ({ label: b.name, sub: b.desc.replace('Boon: ', ''), color: b.color, action: () => { game.menu = null; game.newRun(weapon, b.id); } })),
      { label: 'No boon', sub: 'Climb with nothing but your weapon', action: () => { game.menu = null; game.newRun(weapon, null); } },
    ],
  });
}
