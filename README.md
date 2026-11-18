# Ashen Spire

A top-down roguelike dungeon crawler with souls-like combat. You climb a tower one floor at a time; for now **Floor I — The Sunken Gaol** is built.

## Play

Open `index.html` in a browser. It has no build step and no dependencies.
(Or serve the folder: `python3 -m http.server` → http://localhost:8000)

## Controls

| Input | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Aim |
| Shift | Sprint (drains stamina) |
| LMB / J | Light attack (3-hit combo) |
| RMB / K | Heavy attack (big poise damage) |
| Space | Dodge roll (invincible for the first ~0.27 s) |
| Q / F | Parry |
| R | Drink a flask (slow, can be punished) |
| E | Interact (shrines, chests, stairs) |
| Esc / P | Pause |

### Touch (phones / tablets)

Touch controls appear automatically. Landscape works best.

- **Left thumb:** drag anywhere on the left half of the screen to move (an analog stick).
- **Right thumb:** ATTACK, HEAVY, ROLL, PARRY and FLASK buttons. Tap ROLL to dodge; hold it to run.
- **Aiming:** your attacks lock onto the nearest enemy you can see. With nothing in range, you face the way you move.
- A **USE** button appears next to chests, shrines and stairs. **II** at the top pauses. In menus, tap an option to pick it.

## Combat

- **Stamina** powers every attack, roll and parry. When it runs out you can't act.
- **Commitment**: attacks have windup, active and recovery phases. You can't cancel a swing, but a combo or a late roll can come out of recovery. Inputs are buffered for about 0.25 s.
- **Telegraphs**: enemy attacks flash before they land. **Orange** ones can be parried; **red** ones (slams, charges, arrows, magic) have to be dodged.
- **Parry → riposte**: a parry leaves the enemy open. Your next hit is a critical worth about 2.6× damage.
- **Poise**: hits wear down enemy poise. When it breaks, a normal enemy staggers; a boss's posture breaks and it becomes open to a critical. Brutes and bosses have hyper-armour while they attack.
- **Flasks**: 3 per floor, each heals 42%. They refill at the shrine (once per floor) and when you climb to the next floor.
- **Death is permanent.** Each run gets a new seed and a new layout.

## A floor

- Rooms seal behind you (fog gates) until every enemy inside is dead.
- **Treasure rooms** and **elite rooms** (with a guaranteed Brute) give relic chests: pick 1 of 3 run-long passives.
- The **Ember Shrine** sits in the antechamber before the boss. Spend embers there to level Vigor, Endurance or Strength, and rest there once.
- **Boss: Varkoth, Warden of the Gaol.** He uses combos, a delayed slam, a leap and a charge. Below 50% HP he enters phase 2 and adds shockwaves and a void-orb burst.
- Killing the boss raises a stairway. Taking it sends you to the next floor; while there is no next floor, it ends the run as a win.

## Code layout

```
index.html        canvas + script tags (load order matters)
src/util.js       math, seeded RNG, colour helpers
src/input.js      keyboard/mouse bindings, per-step "pressed" edges
src/touch.js      on-screen joystick + buttons, touch aim assist
src/audio.js      synthesized WebAudio SFX
src/fx.js         particles, damage numbers, decals, shake, hit-stop
src/floors.js     THE TOWER: one config object per floor
src/dungeon.js    tile map, collision, LOS, procedural generator, map pre-render
src/relics.js     relic definitions + stat modifier aggregation
src/player.js     player moveset/state machine
src/enemies.js    data-driven enemy + boss definitions, AI, projectiles, shockwaves
src/ui.js         HUD, minimap, menus (shrine / relic / pause), title/death/victory screens
src/game.js       main loop, floor loading, rooms/doors, world update + render
```

### Adding a floor

1. Add a config object to `FLOORS` in `src/floors.js`. It sets the palette, map size, enemy pool and weights, `hpMult`/`dmgMult`, and the boss id.
2. Add any new enemies or the new boss to `ENEMY_TYPES` in `src/enemies.js`. Attacks are data: pick a `shape` (`arc`, `circle`, `lunge`, `charge`, `projectile`, `burst`, `leap`) and set its timings, damage and combo links.
3. Nothing else is needed. The run state (level, stats, embers, relics, HP) already carries over through `Game.ascend()`.
