// ---------- Dungeon map + procedural generator ----------
const TILE = 32;
const T_WALL = 0, T_FLOOR = 1;

class DungeonMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.tiles = new Uint8Array(w * h);
    this.room = new Int16Array(w * h).fill(-1);
    this.locked = new Uint8Array(w * h);
    this.seen = new Uint8Array(w * h);
    this.shade = new Float32Array(w * h);
    this.rooms = [];
    this.torches = [];
  }
  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inb(x, y) ? this.tiles[y * this.w + x] : T_WALL; }
  solid(x, y) {
    if (!this.inb(x, y)) return true;
    const i = y * this.w + x;
    return this.tiles[i] === T_WALL || this.locked[i] === 1;
  }
  solidAt(px, py) { return this.solid(Math.floor(px / TILE), Math.floor(py / TILE)); }
  roomAt(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    return this.inb(x, y) ? this.room[y * this.w + x] : -1;
  }
  los(ax, ay, bx, by) {
    const d = dist(ax, ay, bx, by);
    const steps = Math.ceil(d / 10);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solidAt(lerp(ax, bx, t), lerp(ay, by, t))) return false;
    }
    return true;
  }
  // Push a circle (e.x, e.y, e.r) out of solid tiles. Returns true if it collided.
  collideCircle(e) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      const minx = Math.floor((e.x - e.r) / TILE), maxx = Math.floor((e.x + e.r) / TILE);
      const miny = Math.floor((e.y - e.r) / TILE), maxy = Math.floor((e.y + e.r) / TILE);
      let moved = false;
      for (let ty = miny; ty <= maxy; ty++) {
        for (let tx = minx; tx <= maxx; tx++) {
          if (!this.solid(tx, ty)) continue;
          const x0 = tx * TILE, y0 = ty * TILE;
          const cx = clamp(e.x, x0, x0 + TILE), cy = clamp(e.y, y0, y0 + TILE);
          let dx = e.x - cx, dy = e.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= e.r * e.r) continue;
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            e.x += dx / d * (e.r - d); e.y += dy / d * (e.r - d);
          } else {
            // centre inside the tile: push out through nearest edge
            const l = e.x - x0, r = x0 + TILE - e.x, t = e.y - y0, b = y0 + TILE - e.y;
            const m = Math.min(l, r, t, b);
            if (m === l) e.x = x0 - e.r; else if (m === r) e.x = x0 + TILE + e.r;
            else if (m === t) e.y = y0 - e.r; else e.y = y0 + TILE + e.r;
          }
          hit = moved = true;
        }
      }
      if (!moved) break;
    }
    return hit;
  }
  revealRect(x0, y0, x1, y1) {
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.seen[y * this.w + x] = 1;
  }
  revealAround(px, py, r) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    for (let y = ty - r; y <= ty + r; y++)
      for (let x = tx - r; x <= tx + r; x++)
        if (this.inb(x, y) && (x - tx) ** 2 + (y - ty) ** 2 <= r * r) this.seen[y * this.w + x] = 1;
  }
  roomTiles(room, margin = 0) {
    const out = [];
    for (let y = room.y + margin; y < room.y + room.h - margin; y++)
      for (let x = room.x + margin; x < room.x + room.w - margin; x++) out.push([x, y]);
    return out;
  }
}

function makeRoom(id, x, y, w, h, type) {
  return {
    id, x, y, w, h, type,
    cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE,
    tcx: Math.floor(x + w / 2), tcy: Math.floor(y + h / 2),
    doors: [], enemies: [], neighbors: [],
    visited: false, active: false, cleared: false, elite: false, depth: 0,
  };
}

function generateDungeon(rng, cfg) {
  const W = cfg.width, H = cfg.height;
  const map = new DungeonMap(W, H);
  const rooms = [];
  const GAP = 3;
  const overlaps = (x, y, w, h) => rooms.some(r =>
    x < r.x + r.w + GAP && x + w + GAP > r.x && y < r.y + r.h + GAP && y + h + GAP > r.y);

  // 1. Boss room near a map edge
  const [bw, bh] = cfg.bossRoomSize;
  const side = rng.int(0, 3);
  let bx, by;
  if (side === 0) { bx = rng.int(3, W - bw - 3); by = 3; }
  else if (side === 1) { bx = W - bw - 3; by = rng.int(3, H - bh - 3); }
  else if (side === 2) { bx = rng.int(3, W - bw - 3); by = H - bh - 3; }
  else { bx = 3; by = rng.int(3, H - bh - 3); }
  const boss = makeRoom(0, bx, by, bw, bh, 'boss');
  rooms.push(boss);

  // 2. Scatter normal rooms
  const target = rng.int(cfg.roomCount[0], cfg.roomCount[1]);
  for (let a = 0; a < 3000 && rooms.length < target + 1; a++) {
    const w = rng.int(cfg.roomSize[0], cfg.roomSize[1]);
    const h = rng.int(cfg.roomSize[0], cfg.roomSize[1]);
    const x = rng.int(2, W - w - 2), y = rng.int(2, H - h - 2);
    if (overlaps(x, y, w, h)) continue;
    rooms.push(makeRoom(rooms.length, x, y, w, h, 'combat'));
  }

  for (const r of rooms)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = map.idx(x, y); map.tiles[i] = T_FLOOR; map.room[i] = r.id;
      }

  // 3. Connect: MST over normal rooms, boss room attached as a leaf, plus loops
  const normal = rooms.filter(r => r !== boss);
  const d = (a, b) => dist(a.tcx, a.tcy, b.tcx, b.tcy);
  const edges = [];
  const inTree = new Set([normal[0]]);
  while (inTree.size < normal.length) {
    let best = null, bd = Infinity;
    for (const a of inTree) for (const b of normal) {
      if (inTree.has(b)) continue;
      const dd = d(a, b);
      if (dd < bd) { bd = dd; best = [a, b]; }
    }
    edges.push(best); inTree.add(best[1]);
  }
  const nearestToBoss = normal.reduce((m, r) => (d(r, boss) < d(m, boss) ? r : m), normal[0]);
  edges.push([nearestToBoss, boss]);
  const hasEdge = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  for (const r of normal) {
    if (!rng.chance(cfg.loopChance)) continue;
    const cands = normal.filter(o => o !== r && !hasEdge(r, o)).sort((a, b) => d(r, a) - d(r, b));
    if (cands.length) edges.push([r, cands[0]]);
  }

  const bossRect = { x: boss.x - 1, y: boss.y - 1, w: boss.w + 2, h: boss.h + 2 };
  const inRect = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const lPath = (ax, ay, bx2, by2, hFirst) => {
    const pts = [];
    if (hFirst) {
      for (let x = Math.min(ax, bx2); x <= Math.max(ax, bx2); x++) pts.push([x, ay]);
      for (let y = Math.min(ay, by2); y <= Math.max(ay, by2); y++) pts.push([bx2, y]);
    } else {
      for (let y = Math.min(ay, by2); y <= Math.max(ay, by2); y++) pts.push([ax, y]);
      for (let x = Math.min(ax, bx2); x <= Math.max(ax, bx2); x++) pts.push([x, by2]);
    }
    return pts;
  };
  for (const [a, b] of edges) {
    let hFirst = rng.chance(0.5);
    if (a !== boss && b !== boss) {
      // avoid accidentally tunnelling through the boss arena
      const crosses = h => lPath(a.tcx, a.tcy, b.tcx, b.tcy, h).some(([x, y]) => inRect(x, y, bossRect));
      if (crosses(hFirst) && !crosses(!hFirst)) hFirst = !hFirst;
    }
    for (const [x, y] of lPath(a.tcx, a.tcy, b.tcx, b.tcy, hFirst)) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const tx = x + ox, ty = y + oy;
        if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) continue;
        map.tiles[map.idx(tx, ty)] = T_FLOOR;
      }
    }
    a.neighbors.push(b); b.neighbors.push(a);
  }

  // 4. Door tiles: corridor tiles touching a room
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = map.idx(x, y);
    if (map.tiles[i] !== T_FLOOR || map.room[i] !== -1) continue;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rid = map.room[map.idx(x + ox, y + oy)];
      if (rid >= 0 && !rooms[rid].doors.includes(i)) rooms[rid].doors.push(i);
    }
  }

  // 5. Assign room roles via graph distance
  const bfs = src => {
    const dd = new Map([[src, 0]]); const q = [src];
    while (q.length) { const r = q.shift(); for (const n of r.neighbors) if (!dd.has(n)) { dd.set(n, dd.get(r) + 1); q.push(n); } }
    return dd;
  };
  const fromBoss = bfs(boss);
  let start = normal[0];
  for (const r of normal) {
    const a = fromBoss.get(r) ?? 0, b = fromBoss.get(start) ?? 0;
    if (a > b || (a === b && d(r, boss) > d(start, boss))) start = r;
  }
  start.type = 'start';
  const fromStart = bfs(start);
  const maxD = Math.max(1, ...[...fromStart.values()]);
  for (const r of rooms) r.depth = (fromStart.get(r) ?? 0) / maxD;

  // Shrine (souls-style rest point) in the antechamber before the boss
  const ante = boss.neighbors[0];
  if (ante && ante !== start) ante.type = 'shrine';
  else start.hasShrine = true;

  const pool = normal.filter(r => r.type === 'combat');
  const leaves = rng.shuffle(pool.filter(r => r.neighbors.length === 1));
  const others = rng.shuffle(pool.filter(r => r.neighbors.length !== 1));
  for (const r of [...leaves, ...others].slice(0, cfg.treasureRooms)) r.type = 'treasure';
  const deep = pool.filter(r => r.type === 'combat').sort((a, b) => b.depth - a.depth);
  for (const r of deep.slice(0, cfg.eliteRooms)) r.elite = true;

  // 6. Cosmetics: floor shading and wall torches
  for (let i = 0; i < W * H; i++) map.shade[i] = rng.next();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (map.tile(x, y) === T_WALL && map.tile(x, y + 1) === T_FLOOR && map.room[map.idx(x, y + 1)] >= 0 && rng.chance(0.07))
      map.torches.push({ x: (x + 0.5) * TILE, y: (y + 1) * TILE - 6, phase: rng.range(0, TAU) });
  }

  map.rooms = rooms;
  map.start = { x: start.cx, y: start.cy };
  map.startRoom = start;
  map.bossRoom = boss;
  return map;
}

// Pre-render the static map to an offscreen canvas.
function renderMapCanvas(map, pal) {
  const c = document.createElement('canvas');
  c.width = map.w * TILE; c.height = map.h * TILE;
  const g = c.getContext('2d');
  g.fillStyle = pal.void; g.fillRect(0, 0, c.width, c.height);
  const isFloor = (x, y) => map.tile(x, y) === T_FLOOR;

  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const i = map.idx(x, y), px = x * TILE, py = y * TILE, s = map.shade[i];
    if (map.tiles[i] === T_FLOOR) {
      const base = map.room[i] >= 0 ? pal.floor : pal.corridor;
      g.fillStyle = shade(base, 0.88 + s * 0.24);
      g.fillRect(px, py, TILE, TILE);
      // flagstone seams
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(px, py, TILE, 1); g.fillRect(px, py, 1, TILE);
      if (s > 0.5) { g.fillRect(px + 16, py, 1, 16); }
      else { g.fillRect(px, py + 16, 16, 1); }
      // debris / cracks
      if (s > 0.92) {
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(px + 6, py + 8); g.lineTo(px + 14, py + 15); g.lineTo(px + 12, py + 24); g.stroke();
      } else if (s < 0.04) {
        g.fillStyle = 'rgba(210,200,180,0.25)';
        g.fillRect(px + 10, py + 12, 7, 2); g.fillRect(px + 15, py + 9, 2, 6); // bones
      } else if (s > 0.86) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath(); g.arc(px + 22, py + 20, 3, 0, TAU); g.fill();
      }
      // ambient occlusion near walls
      g.fillStyle = 'rgba(0,0,0,0.28)';
      if (!isFloor(x, y - 1)) g.fillRect(px, py, TILE, 8);
      if (!isFloor(x - 1, y)) g.fillRect(px, py, 5, TILE);
      if (!isFloor(x + 1, y)) g.fillRect(px + TILE - 5, py, 5, TILE);
    } else {
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (isFloor(x + ox, y + oy)) { near = true; break; }
      if (!near) continue;
      g.fillStyle = shade(pal.wallTop, 0.9 + s * 0.2);
      g.fillRect(px, py, TILE, TILE);
      if (isFloor(x, y + 1)) {
        // front face with bricks
        g.fillStyle = shade(pal.wallFace, 0.85 + s * 0.25);
        g.fillRect(px, py + 10, TILE, TILE - 10);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(px, py + 10, TILE, 2);
        g.fillRect(px, py + 20, TILE, 1);
        const off = (x % 2) * 8;
        g.fillRect(px + 8 + off, py + 10, 1, 10); g.fillRect(px + 16 - off, py + 20, 1, 12);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(px, py + 12, TILE, 1);
      } else {
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      }
    }
  }
  return c;
}
