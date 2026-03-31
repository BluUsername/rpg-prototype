// ============================================================
// Entity Factory — create player and enemies
// ============================================================

import { Entity, EntityType, Position } from '../core/types';
import { createInventory } from '../systems/inventory';
import { LOOT_TABLES } from '../data/loot-tables';

let nextId = 0;
function genId(): string {
  return `entity_${nextId++}`;
}

export function createPlayer(pos: Position): Entity {
  return {
    id: genId(),
    type: EntityType.Player,
    name: 'Hero',
    pos: { ...pos },
    stats: {
      hp: 30,
      maxHp: 30,
      ap: 3,
      maxAp: 3,
      attack: 8,
      defense: 3,
      speed: 5,
    },
    alive: true,
    color: '#4fc3f7',
    symbol: '@',
    inventory: createInventory(20),
  };
}

export function createSkeleton(pos: Position): Entity {
  return {
    id: genId(),
    type: EntityType.Enemy,
    name: 'Skeleton',
    pos: { ...pos },
    stats: {
      hp: 12,
      maxHp: 12,
      ap: 2,
      maxAp: 2,
      attack: 5,
      defense: 1,
      speed: 3,
    },
    alive: true,
    color: '#e0e0e0',
    symbol: 'S',
    inventory: createInventory(0),
    lootTable: LOOT_TABLES.skeleton,
  };
}

export function createGoblin(pos: Position): Entity {
  return {
    id: genId(),
    type: EntityType.Enemy,
    name: 'Goblin',
    pos: { ...pos },
    stats: {
      hp: 8,
      maxHp: 8,
      ap: 3,
      maxAp: 3,
      attack: 4,
      defense: 1,
      speed: 6,
    },
    alive: true,
    color: '#66bb6a',
    symbol: 'G',
    inventory: createInventory(0),
    lootTable: LOOT_TABLES.goblin,
  };
}

export function createOrc(pos: Position): Entity {
  return {
    id: genId(),
    type: EntityType.Enemy,
    name: 'Orc Warrior',
    pos: { ...pos },
    stats: {
      hp: 20,
      maxHp: 20,
      ap: 2,
      maxAp: 2,
      attack: 7,
      defense: 4,
      speed: 3,
    },
    alive: true,
    color: '#a5d6a7',
    symbol: 'O',
    inventory: createInventory(0),
    lootTable: LOOT_TABLES.orc,
  };
}
