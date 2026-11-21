# Ashen Spire — project notes

## Vision (keep in mind for all future work)
- Top-down roguelike dungeon crawler, **souls-like**: difficult, stamina-based, committed attacks, dodge roll with i-frames, parry/riposte, poise, limited flasks, permadeath.
- **It is a TOWER CLIMB.** Floor I is the only floor built so far, but every system must assume many floors stacked on top of each other:
  - Floors are data in `src/floors.js` (`FLOORS` array). Never hard-code floor-specific behaviour in the game loop.
  - The run state (`Game.run`: level, stats, embers, relics, hp, flasks) persists across floors; `Game.ascend()` moves to `FLOORS[run.floor + 1]` or shows the "spire climbs on" screen when none exists.
  - Difficulty should scale per floor (`hpMult`, `dmgMult`, enemy pools, new enemy types, a unique boss per floor).
- **Meta-progression** (`src/meta.js`): ashes persist in `localStorage` (`Game.meta`). Unlocks must widen options (weapons, relic pool, boons), not add flat power.
- **Weapons** (`src/weapons.js`): each is a data-driven moveset; new weapons need only a `WEAPONS` entry plus an unlock in `UNLOCKS`.
- Ideas for later floors: new biomes/palettes, new enemy archetypes, floor-specific hazards, more relics, meta-progression between runs.

## Tech
- Plain HTML5 canvas + vanilla JS, **no build step, no modules** (classic `<script>` tags share globals so `index.html` works from `file://`). Script order in `index.html` matters.
- Fixed 60 Hz update with accumulator in `Game.loop`; `Input.consume()` after each step.
- Enemy attacks are data-driven (`ENEMY_TYPES` in `src/enemies.js`).
- Headless check: Playwright is available; load `file://.../index.html`, press Enter, and drive `Game` via `page.evaluate`.
