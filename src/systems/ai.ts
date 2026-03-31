// ============================================================
// Enemy AI — simple chase-and-attack behavior
// ============================================================

import { Entity, GameMap, Position, Direction } from '../core/types';
import { isWalkable } from './map';

interface AIAction {
  type: 'move' | 'attack' | 'wait';
  direction?: Direction;
}

function manhattanDist(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function directionDelta(dir: Direction): Position {
  switch (dir) {
    case Direction.Up:    return { x: 0, y: -1 };
    case Direction.Down:  return { x: 0, y: 1 };
    case Direction.Left:  return { x: -1, y: 0 };
    case Direction.Right: return { x: 1, y: 0 };
  }
}

export function getEnemyAction(
  enemy: Entity,
  player: Entity,
  map: GameMap,
  entities: Entity[]
): AIAction {
  const dist = manhattanDist(enemy.pos, player.pos);

  // If adjacent to player, attack
  if (dist === 1) {
    const dx = player.pos.x - enemy.pos.x;
    const dy = player.pos.y - enemy.pos.y;
    let dir: Direction;
    if (dx === 1) dir = Direction.Right;
    else if (dx === -1) dir = Direction.Left;
    else if (dy === 1) dir = Direction.Down;
    else dir = Direction.Up;
    return { type: 'attack', direction: dir };
  }

  // If within detection range (8 tiles), chase player
  if (dist <= 8) {
    const candidates: { dir: Direction; dist: number }[] = [];

    for (const dir of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      const delta = directionDelta(dir);
      const newPos: Position = { x: enemy.pos.x + delta.x, y: enemy.pos.y + delta.y };

      if (!isWalkable(map, newPos)) continue;

      const blocked = entities.some(
        e => e.alive && e.id !== enemy.id && e.pos.x === newPos.x && e.pos.y === newPos.y
      );
      if (blocked) continue;

      candidates.push({ dir, dist: manhattanDist(newPos, player.pos) });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      return { type: 'move', direction: candidates[0].dir };
    }
  }

  return { type: 'wait' };
}
