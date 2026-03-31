// ============================================================
// Map Generation & Utilities
// ============================================================

import { GameMap, Tile, TileType, Position, MAP_WIDTH, MAP_HEIGHT } from '../core/types';

export function createTile(type: TileType): Tile {
  return {
    type,
    walkable: type === TileType.Floor || type === TileType.Door || type === TileType.StairsDown,
    visible: false,
    explored: false,
  };
}

export function createTestMap(): GameMap {
  const tiles: Tile[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = createTile(TileType.Wall);
    }
  }

  const rooms = [
    { x: 1, y: 1, w: 8, h: 6 },
    { x: 12, y: 1, w: 7, h: 5 },
    { x: 22, y: 1, w: 7, h: 6 },
    { x: 1, y: 10, w: 6, h: 8 },
    { x: 12, y: 9, w: 9, h: 7 },
    { x: 23, y: 10, w: 6, h: 8 },
  ];

  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h && y < MAP_HEIGHT - 1; y++) {
      for (let x = room.x; x < room.x + room.w && x < MAP_WIDTH - 1; x++) {
        tiles[y][x] = createTile(TileType.Floor);
      }
    }
  }

  const corridors = [
    { x1: 9, y1: 3, x2: 12, y2: 3 },
    { x1: 19, y1: 3, x2: 22, y2: 3 },
    { x1: 4, y1: 7, x2: 4, y2: 10 },
    { x1: 16, y1: 6, x2: 16, y2: 9 },
    { x1: 7, y1: 14, x2: 12, y2: 14 },
    { x1: 21, y1: 12, x2: 23, y2: 12 },
    { x1: 26, y1: 7, x2: 26, y2: 10 },
  ];

  for (const c of corridors) {
    const minX = Math.min(c.x1, c.x2);
    const maxX = Math.max(c.x1, c.x2);
    for (let x = minX; x <= maxX; x++) {
      tiles[c.y1][x] = createTile(TileType.Floor);
    }
    const minY = Math.min(c.y1, c.y2);
    const maxY = Math.max(c.y1, c.y2);
    for (let y = minY; y <= maxY; y++) {
      tiles[y][c.x2] = createTile(TileType.Floor);
    }
  }

  tiles[12][14] = createTile(TileType.Water);
  tiles[12][15] = createTile(TileType.Water);
  tiles[13][14] = createTile(TileType.Water);
  tiles[3][12] = createTile(TileType.Door);

  return { width: MAP_WIDTH, height: MAP_HEIGHT, tiles };
}

export function isWalkable(map: GameMap, pos: Position): boolean {
  if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) return false;
  return map.tiles[pos.y][pos.x].walkable;
}

export function getTile(map: GameMap, pos: Position): Tile | null {
  if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) return null;
  return map.tiles[pos.y][pos.x];
}

export function computeFOV(map: GameMap, origin: Position, radius: number): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      map.tiles[y][x].visible = false;
    }
  }

  const steps = 360;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let cx = origin.x + 0.5;
    let cy = origin.y + 0.5;

    for (let step = 0; step < radius; step++) {
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);

      if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) break;

      map.tiles[ty][tx].visible = true;
      map.tiles[ty][tx].explored = true;

      if (map.tiles[ty][tx].type === TileType.Wall && step > 0) break;

      cx += dx;
      cy += dy;
    }
  }
}
