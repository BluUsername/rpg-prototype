// ============================================================
// Item Definitions — all item data lives here
// ============================================================

import { ItemDef, ItemType, ItemRarity, Entity } from '../core/types';

function healItem(amount: number): (entity: Entity) => { consumed: boolean; message: string } {
  return (entity: Entity) => {
    if (entity.stats.hp >= entity.stats.maxHp) {
      return { consumed: false, message: 'You are already at full health.' };
    }
    const healed = Math.min(amount, entity.stats.maxHp - entity.stats.hp);
    entity.stats.hp += healed;
    return { consumed: true, message: `Restored ${healed} HP.` };
  };
}

export const ITEMS: Record<string, ItemDef> = {
  health_potion_small: {
    id: 'health_potion_small',
    name: 'Small Health Potion',
    description: 'A vial of crimson liquid. Restores 8 HP.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    symbol: '!',
    color: '#ef5350',
    stackable: true,
    maxStack: 5,
    onUse: healItem(8),
  },
  health_potion_medium: {
    id: 'health_potion_medium',
    name: 'Health Potion',
    description: 'A flask of crimson liquid. Restores 15 HP.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Uncommon,
    symbol: '!',
    color: '#e53935',
    stackable: true,
    maxStack: 3,
    onUse: healItem(15),
  },
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    description: 'Rough linen strips. Restores 5 HP.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    symbol: '+',
    color: '#e0e0e0',
    stackable: true,
    maxStack: 10,
    onUse: healItem(5),
  },
  bread: {
    id: 'bread',
    name: 'Bread',
    description: 'A crusty loaf. Restores 3 HP.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    symbol: '%',
    color: '#d4a76a',
    stackable: true,
    maxStack: 5,
    onUse: healItem(3),
  },
  gold_coin: {
    id: 'gold_coin',
    name: 'Gold Coin',
    description: 'A shiny gold coin.',
    type: ItemType.Misc,
    rarity: ItemRarity.Common,
    symbol: '$',
    color: '#ffd700',
    stackable: true,
    maxStack: 99,
  },
};

export function getItemDef(itemId: string): ItemDef | undefined {
  return ITEMS[itemId];
}
