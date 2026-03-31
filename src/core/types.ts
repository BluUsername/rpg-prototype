// ============================================================
// Core Types — shared type definitions and constants
// ============================================================

export interface Position {
  x: number;
  y: number;
}

export enum TileType {
  Floor = 0,
  Wall = 1,
  Water = 2,
  Door = 3,
  StairsDown = 4,
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export enum GamePhase {
  PlayerTurn = 'player_turn',
  EnemyTurn = 'enemy_turn',
  Animation = 'animation',
  Inventory = 'inventory',
  GameOver = 'game_over',
}

export enum EntityType {
  Player = 'player',
  Enemy = 'enemy',
}

export interface Stats {
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Tile {
  type: TileType;
  walkable: boolean;
  visible: boolean;
  explored: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

export interface CombatResult {
  attacker: Entity;
  defender: Entity;
  damage: number;
  hit: boolean;
  killed: boolean;
}

export const TILE_SIZE = 32;
export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 20;

// --- Item types ---

export enum ItemType {
  Consumable = 'consumable',
  Equipment = 'equipment',
  Misc = 'misc',
}

export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  symbol: string;
  color: string;
  stackable: boolean;
  maxStack: number;
  onUse?: (entity: Entity) => UseResult;
}

export interface UseResult {
  consumed: boolean;
  message: string;
}

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export interface Inventory {
  slots: (ItemStack | null)[];
  maxSlots: number;
}

// --- World item (item on the ground) ---

export interface WorldItem {
  id: string;
  itemId: string;
  pos: Position;
  quantity: number;
}

// --- Loot table ---

export interface LootEntry {
  itemId: string;
  chance: number;    // 0-1
  minQty: number;
  maxQty: number;
}

export interface LootTable {
  entries: LootEntry[];
}

// --- Entity (with inventory) ---

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  pos: Position;
  stats: Stats;
  alive: boolean;
  color: string;
  symbol: string;
  inventory: Inventory;
  lootTable?: LootTable;
}
