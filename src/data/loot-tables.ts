// ============================================================
// Loot Tables — defines what enemies drop on death
// ============================================================

import { LootTable } from '../core/types';

export const LOOT_TABLES: Record<string, LootTable> = {
  goblin: {
    entries: [
      { itemId: 'gold_coin', chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: 'bandage', chance: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'health_potion_small', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'bread', chance: 0.3, minQty: 1, maxQty: 1 },
    ],
  },
  skeleton: {
    entries: [
      { itemId: 'gold_coin', chance: 0.6, minQty: 1, maxQty: 5 },
      { itemId: 'health_potion_small', chance: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'bandage', chance: 0.3, minQty: 1, maxQty: 2 },
    ],
  },
  orc: {
    entries: [
      { itemId: 'gold_coin', chance: 0.9, minQty: 3, maxQty: 8 },
      { itemId: 'health_potion_small', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'health_potion_medium', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'bread', chance: 0.4, minQty: 1, maxQty: 2 },
    ],
  },
};
