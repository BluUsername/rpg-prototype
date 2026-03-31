// ============================================================
// Inventory System — add, remove, use items
// ============================================================

import { Inventory, ItemStack, Entity, WorldItem, LootTable, Position } from '../core/types';
import { getItemDef } from '../data/items';

let nextWorldItemId = 0;

export function createInventory(maxSlots: number): Inventory {
  return {
    slots: new Array(maxSlots).fill(null),
    maxSlots,
  };
}

export function addItemToInventory(inv: Inventory, itemId: string, quantity: number): number {
  const def = getItemDef(itemId);
  if (!def) return quantity;

  let remaining = quantity;

  // First, try to stack into existing slots
  if (def.stackable) {
    for (let i = 0; i < inv.maxSlots && remaining > 0; i++) {
      const slot = inv.slots[i];
      if (slot && slot.itemId === itemId && slot.quantity < def.maxStack) {
        const canAdd = Math.min(remaining, def.maxStack - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }
  }

  // Then fill empty slots
  for (let i = 0; i < inv.maxSlots && remaining > 0; i++) {
    if (inv.slots[i] === null) {
      const qty = def.stackable ? Math.min(remaining, def.maxStack) : 1;
      inv.slots[i] = { itemId, quantity: qty };
      remaining -= qty;
    }
  }

  return remaining;
}

export function removeItemFromSlot(inv: Inventory, slotIndex: number, quantity: number): boolean {
  const slot = inv.slots[slotIndex];
  if (!slot) return false;

  slot.quantity -= quantity;
  if (slot.quantity <= 0) {
    inv.slots[slotIndex] = null;
  }
  return true;
}

export function useItemFromSlot(inv: Inventory, slotIndex: number, entity: Entity): string | null {
  const slot = inv.slots[slotIndex];
  if (!slot) return null;

  const def = getItemDef(slot.itemId);
  if (!def || !def.onUse) return `${def?.name ?? 'Item'} cannot be used.`;

  const result = def.onUse(entity);

  if (result.consumed) {
    removeItemFromSlot(inv, slotIndex, 1);
  }

  return result.message;
}

export function getInventoryItemCount(inv: Inventory, itemId: string): number {
  let count = 0;
  for (const slot of inv.slots) {
    if (slot && slot.itemId === itemId) {
      count += slot.quantity;
    }
  }
  return count;
}

export function rollLoot(lootTable: LootTable, pos: Position): WorldItem[] {
  const items: WorldItem[] = [];

  for (const entry of lootTable.entries) {
    if (Math.random() < entry.chance) {
      const qty = entry.minQty + Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1));
      items.push({
        id: `world_item_${nextWorldItemId++}`,
        itemId: entry.itemId,
        pos: { ...pos },
        quantity: qty,
      });
    }
  }

  return items;
}
