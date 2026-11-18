// ---------- THE TOWER ----------
// Each entry is one floor of the spire. The run climbs from index 0 upward.
// To add a floor: append a config here (new palette, enemy pool, boss id) and,
// if needed, define new enemy/boss types in enemies.js. Nothing else in the
// game loop needs to change — player stats, embers and relics carry over.
const FLOORS = [
  {
    id: 'gaol',
    name: 'Floor I',
    title: 'The Sunken Gaol',
    // Map generation
    width: 76, height: 76,
    roomCount: [11, 14],      // normal rooms (boss room is extra)
    roomSize: [9, 15],        // tiles
    bossRoomSize: [24, 19],
    loopChance: 0.3,          // extra corridors -> loops
    treasureRooms: 2,         // relic chests, unguarded
    eliteRooms: 2,            // tougher fights that drop a relic chest
    // Enemies
    enemyPool: [['hollow', 5], ['ghoul', 3], ['archer', 3], ['brute', 1.2]],
    budget: [4, 8],           // enemy "cost" per room, scales with depth
    hpMult: 1, dmgMult: 1, emberMult: 1,
    boss: 'gatekeeper',
    palette: {
      void: '#09080b',
      floor: '#2b2730',
      corridor: '#242128',
      wall: '#463f4d',
      wallFace: '#5a5263',
      wallTop: '#2c2731',
      accent: '#d28a3a',
      fog: 'rgba(5,4,8,0.88)',
    },
  },
  // Floor II goes here — e.g.
  // { id: 'foundry', name: 'Floor II', title: 'The Cinder Foundry', ..., hpMult: 1.35, dmgMult: 1.2, boss: '...' },
];
