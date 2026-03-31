// ============================================================
// Inventory System — add, remove, use items
// ============================================================

import {
  Inventory, ItemStack, Entity, WorldItem, LootTable, Position,
  ActionBar, ACTION_BAR_SLOTS,
} from '../core/types';
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

// --- Action Bar ---

export function createActionBar(): ActionBar {
  return { slots: new Array(ACTION_BAR_SLOTS).fill(null) };
}

export function assignToActionBar(actionBar: ActionBar, barSlot: number, itemId: string): void {
  if (barSlot < 0 || barSlot >= ACTION_BAR_SLOTS) return;
  actionBar.slots[barSlot] = itemId;
}

export function clearActionBarSlot(actionBar: ActionBar, barSlot: number): void {
  if (barSlot < 0 || barSlot >= ACTION_BAR_SLOTS) return;
  actionBar.slots[barSlot] = null;
}

export function useFromActionBar(
  actionBar: ActionBar,
  barSlot: number,
  inventory: Inventory,
  entity: Entity
): string | null {
  if (barSlot < 0 || barSlot >= ACTION_BAR_SLOTS) return null;

  const itemId = actionBar.slots[barSlot];
  if (!itemId) return null;

  const def = getItemDef(itemId);
  if (!def || !def.onUse) return `${def?.name ?? 'Item'} cannot be used.`;

  // Find this item in inventory
  const invSlot = inventory.slots.findIndex(s => s !== null && s.itemId === itemId);
  if (invSlot === -1) {
    return `No ${def.name} left in inventory.`;
  }

  const result = def.onUse(entity);

  if (result.consumed) {
    removeItemFromSlot(inventory, invSlot, 1);
    // If none left, auto-clear the action bar slot
    const remaining = getInventoryItemCount(inventory, itemId);
    if (remaining <= 0) {
      actionBar.slots[barSlot] = null;
    }
  }

  return result.message;
}

/** Find the first empty action bar slot, or -1 */
export function findEmptyActionBarSlot(actionBar: ActionBar): number {
  return actionBar.slots.indexOf(null);
}

// --- Loot ---

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
