// ============================================================
// Renderer — draws the game world onto the canvas
// ============================================================

import {
  GameMap, Entity, TileType, TILE_SIZE, Position, CombatResult,
  WorldItem, Inventory, GamePhase, ItemType, ActionBar, ACTION_BAR_SLOTS,
} from '../core/types';
import { getItemDef } from '../data/items';
import { getInventoryItemCount } from '../systems/inventory';

const TILE_COLORS: Record<TileType, string> = {
  [TileType.Floor]: '#3d3d3d',
  [TileType.Wall]: '#1a1a1a',
  [TileType.Water]: '#1a3a5c',
  [TileType.Door]: '#8d6e3f',
  [TileType.StairsDown]: '#5c3d8f',
};

const FOG_COLOR = '#0d0d1a';
const EXPLORED_ALPHA = 0.45;

const RARITY_COLORS = {
  common: '#aaa',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
};

// --- Inventory panel layout ---
const INV_PANEL_W = 280;
const INV_PANEL_H = 400;
const INV_SLOT_SIZE = 32;
const INV_COLS = 5;
const INV_PADDING = 8;
const INV_BTN_W = 80;
const INV_BTN_H = 24;

// --- Action bar layout ---
const AB_SLOT_SIZE = 40;
const AB_GAP = 4;
const AB_TOTAL_W = ACTION_BAR_SLOTS * (AB_SLOT_SIZE + AB_GAP) - AB_GAP;

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private floatingTexts: FloatingText[] = [];
  private camera: Position = { x: 0, y: 0 };
  private hoveredSlot = -1;
  private hoveredActionBarSlot = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = 800;
    this.canvas.height = 576;
  }

  // --- Inventory panel geometry ---

  private get panelX(): number { return this.canvas.width - INV_PANEL_W - 8; }
  private get panelY(): number { return 30; }
  private get slotsStartX(): number { return this.panelX + INV_PADDING + 12; }
  private get slotsStartY(): number { return this.panelY + 36; }

  setHoveredSlot(slot: number): void { this.hoveredSlot = slot; }
  setHoveredActionBarSlot(slot: number): void { this.hoveredActionBarSlot = slot; }

  getSlotAtPosition(px: number, py: number, maxSlots: number): number {
    const sx = this.slotsStartX;
    const sy = this.slotsStartY;
    for (let i = 0; i < maxSlots; i++) {
      const col = i % INV_COLS;
      const row = Math.floor(i / INV_COLS);
      const slotX = sx + col * (INV_SLOT_SIZE + 6);
      const slotY = sy + row * (INV_SLOT_SIZE + 6);
      if (px >= slotX && px < slotX + INV_SLOT_SIZE &&
          py >= slotY && py < slotY + INV_SLOT_SIZE) {
        return i;
      }
    }
    return -1;
  }

  private getDetailY(maxSlots: number): number {
    return this.slotsStartY + Math.ceil(maxSlots / INV_COLS) * (INV_SLOT_SIZE + 6) + 8;
  }

  private getButtonRect(maxSlots: number, btnIndex: number): { x: number; y: number; w: number; h: number } {
    const detailY = this.getDetailY(maxSlots);
    const btnX = this.panelX + INV_PADDING + 4 + btnIndex * (INV_BTN_W + 8);
    return { x: btnX, y: detailY + 52, w: INV_BTN_W, h: INV_BTN_H };
  }

  isUseButtonAt(px: number, py: number, maxSlots: number): boolean {
    const btn = this.getButtonRect(maxSlots, 0);
    return px >= btn.x && px < btn.x + btn.w && py >= btn.y && py < btn.y + btn.h;
  }

  isAssignButtonAt(px: number, py: number, maxSlots: number): boolean {
    const btn = this.getButtonRect(maxSlots, 1);
    return px >= btn.x && px < btn.x + btn.w && py >= btn.y && py < btn.y + btn.h;
  }

  // --- Action bar geometry ---

  private get abStartX(): number { return Math.floor((this.canvas.width - AB_TOTAL_W) / 2); }
  private get abStartY(): number { return this.canvas.height - 80 - AB_SLOT_SIZE - 12; }

  getActionBarSlotAt(px: number, py: number): number {
    const sx = this.abStartX;
    const sy = this.abStartY;
    for (let i = 0; i < ACTION_BAR_SLOTS; i++) {
      const x = sx + i * (AB_SLOT_SIZE + AB_GAP);
      if (px >= x && px < x + AB_SLOT_SIZE && py >= sy && py < sy + AB_SLOT_SIZE) {
        return i;
      }
    }
    return -1;
  }

  // --- Camera ---

  updateCamera(playerPos: Position): void {
    const viewW = this.canvas.width / TILE_SIZE;
    const viewH = this.canvas.height / TILE_SIZE;
    this.camera.x = playerPos.x - Math.floor(viewW / 2);
    this.camera.y = playerPos.y - Math.floor(viewH / 2);
  }

  addFloatingText(text: string, worldX: number, worldY: number, color: string): void {
    this.floatingTexts.push({ text, x: worldX, y: worldY, color, life: 60, maxLife: 60 });
  }

  // --- Main render ---

  render(
    map: GameMap,
    entities: Entity[],
    worldItems: WorldItem[],
    messageLog: string[],
    phase: GamePhase,
    inventoryOpen: boolean,
    selectedSlot: number
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = FOG_COLOR;
    ctx.fillRect(0, 0, w, h);

    this.drawTiles(ctx, map);
    this.drawWorldItems(ctx, map, worldItems);
    this.drawEntities(ctx, map, entities);
    this.drawFloatingText(ctx);

    // UI overlays
    const player = entities.find(e => e.type === 'player');
    if (player) {
      this.drawActionBar(player.actionBar, player.inventory);
      this.drawPlayerStats(player);
      this.drawMessageLog(messageLog);
      this.drawControlsHint(inventoryOpen);
      this.drawItemPickupHint(player, worldItems);

      if (inventoryOpen) {
        this.drawInventoryPanel(player.inventory, selectedSlot);
      }
      if (phase === GamePhase.GameOver) {
        this.drawGameOver();
      }
    }
  }

  // --- Tile rendering ---

  private drawTiles(ctx: CanvasRenderingContext2D, map: GameMap): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tilesX = Math.ceil(w / TILE_SIZE) + 1;
    const tilesY = Math.ceil(h / TILE_SIZE) + 1;

    for (let vy = 0; vy < tilesY; vy++) {
      for (let vx = 0; vx < tilesX; vx++) {
        const mx = vx + this.camera.x;
        const my = vy + this.camera.y;
        if (mx < 0 || mx >= map.width || my < 0 || my >= map.height) continue;

        const tile = map.tiles[my][mx];
        const sx = vx * TILE_SIZE;
        const sy = vy * TILE_SIZE;

        if (tile.visible) {
          ctx.fillStyle = TILE_COLORS[tile.type];
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);

          if (tile.type === TileType.Wall) {
            ctx.fillStyle = 'rgba(80,80,100,0.3)';
            ctx.fillRect(sx, sy + TILE_SIZE - 4, TILE_SIZE, 4);
          }
          if (tile.type === TileType.Door) {
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(sx + 10, sy + 2, 12, 28);
          }
          if (tile.type === TileType.Water) {
            ctx.fillStyle = `rgba(100,180,255,${0.1 + Math.sin(Date.now() / 500 + mx + my) * 0.05})`;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          }
        } else if (tile.explored) {
          ctx.globalAlpha = EXPLORED_ALPHA;
          ctx.fillStyle = TILE_COLORS[tile.type];
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  private drawWorldItems(ctx: CanvasRenderingContext2D, map: GameMap, worldItems: WorldItem[]): void {
    for (const wi of worldItems) {
      const tile = map.tiles[wi.pos.y]?.[wi.pos.x];
      if (!tile || !tile.visible) continue;
      const def = getItemDef(wi.itemId);
      if (!def) continue;

      const sx = (wi.pos.x - this.camera.x) * TILE_SIZE;
      const sy = (wi.pos.y - this.camera.y) * TILE_SIZE;

      ctx.fillStyle = def.color + '33';
      ctx.fillRect(sx + 4, sy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.fillStyle = def.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
      ctx.textBaseline = 'alphabetic';

      if (wi.quantity > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${wi.quantity}`, sx + TILE_SIZE - 2, sy + TILE_SIZE - 2);
      }
    }
  }

  private drawEntities(ctx: CanvasRenderingContext2D, map: GameMap, entities: Entity[]): void {
    for (const entity of entities) {
      if (!entity.alive) continue;
      const tile = map.tiles[entity.pos.y]?.[entity.pos.x];
      if (!tile || !tile.visible) continue;

      const sx = (entity.pos.x - this.camera.x) * TILE_SIZE;
      const sy = (entity.pos.y - this.camera.y) * TILE_SIZE;

      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entity.symbol, sx + TILE_SIZE / 2, sy + TILE_SIZE / 2 + 1);
      ctx.textBaseline = 'alphabetic';

      if (entity.type === 'enemy' && entity.stats.hp < entity.stats.maxHp) {
        const barW = TILE_SIZE - 4;
        const barH = 3;
        const barX = sx + 2;
        const barY = sy - 4;
        const hpRatio = entity.stats.hp / entity.stats.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      }
    }
  }

  private drawFloatingText(ctx: CanvasRenderingContext2D): void {
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      const offsetY = (1 - ft.life / ft.maxLife) * -20;
      const sx = (ft.x - this.camera.x) * TILE_SIZE + TILE_SIZE / 2;
      const sy = (ft.y - this.camera.y) * TILE_SIZE + offsetY;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, sx, sy);
      ctx.globalAlpha = 1;
      ft.life--;
    }
  }

  // --- Action Bar (bottom center, always visible) ---

  private drawActionBar(actionBar: ActionBar, inventory: Inventory): void {
    const ctx = this.ctx;
    const sx = this.abStartX;
    const sy = this.abStartY;

    // Background strip
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(sx - 6, sy - 4, AB_TOTAL_W + 12, AB_SLOT_SIZE + 8);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(sx - 6, sy - 4, AB_TOTAL_W + 12, AB_SLOT_SIZE + 8);

    for (let i = 0; i < ACTION_BAR_SLOTS; i++) {
      const x = sx + i * (AB_SLOT_SIZE + AB_GAP);
      const itemId = actionBar.slots[i];
      const isHovered = i === this.hoveredActionBarSlot;

      // Slot background
      ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, sy, AB_SLOT_SIZE, AB_SLOT_SIZE);
      ctx.strokeStyle = isHovered ? '#aaa' : '#444';
      ctx.strokeRect(x, sy, AB_SLOT_SIZE, AB_SLOT_SIZE);

      // Keybind number
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, x + 2, sy + 10);

      if (itemId) {
        const def = getItemDef(itemId);
        if (def) {
          const qty = getInventoryItemCount(inventory, itemId);

          // Item symbol
          ctx.fillStyle = qty > 0 ? def.color : '#555';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(def.symbol, x + AB_SLOT_SIZE / 2, sy + AB_SLOT_SIZE / 2);
          ctx.textBaseline = 'alphabetic';

          // Quantity in corner
          ctx.fillStyle = qty > 0 ? '#fff' : '#666';
          ctx.font = '9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${qty}`, x + AB_SLOT_SIZE - 2, sy + AB_SLOT_SIZE - 2);

          // Tooltip on hover
          if (isHovered) {
            const tipText = `${def.name} (${qty})`;
            ctx.font = '10px monospace';
            const tw = ctx.measureText(tipText).width + 8;
            const tipX = x + AB_SLOT_SIZE / 2 - tw / 2;
            const tipY = sy - 20;

            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(tipX, tipY, tw, 16);
            ctx.strokeStyle = def.color;
            ctx.strokeRect(tipX, tipY, tw, 16);
            ctx.fillStyle = def.color;
            ctx.textAlign = 'center';
            ctx.fillText(tipText, x + AB_SLOT_SIZE / 2, tipY + 12);
          }
        }
      }
    }
  }

  // --- HUD panels ---

  private drawPlayerStats(player: Entity): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(4, 4, 200, 70);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(4, 4, 200, 70);

    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = player.color;
    ctx.fillText(player.name, 12, 20);

    const hpRatio = player.stats.hp / player.stats.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(12, 28, 180, 12);
    ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(12, 28, 180 * hpRatio, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`HP: ${player.stats.hp}/${player.stats.maxHp}`, 14, 38);

    const apRatio = player.stats.ap / player.stats.maxAp;
    ctx.fillStyle = '#333';
    ctx.fillRect(12, 46, 180, 12);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(12, 46, 180 * apRatio, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(`AP: ${player.stats.ap}/${player.stats.maxAp}`, 14, 56);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`ATK:${player.stats.attack} DEF:${player.stats.defense} SPD:${player.stats.speed}`, 12, 70);
  }

  private drawMessageLog(messageLog: string[]): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const logH = 80;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, h - logH, w, logH);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(0, h - logH, w, logH);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    const visibleMessages = messageLog.slice(-5);
    for (let i = 0; i < visibleMessages.length; i++) {
      const alpha = 0.5 + (i / visibleMessages.length) * 0.5;
      ctx.fillStyle = `rgba(204,204,204,${alpha})`;
      ctx.fillText(visibleMessages[i], 8, h - logH + 16 + i * 14);
    }
  }

  private drawControlsHint(inventoryOpen: boolean): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    if (inventoryOpen) {
      ctx.fillText('Click: Select  |  Right-click: Use  |  Assign: Add to bar  |  I: Close', w - 8, 16);
    } else {
      ctx.fillText('WASD: Move  |  E: Pickup  |  I: Inventory  |  1-9: Use action bar  |  Space: Wait', w - 8, 16);
    }
  }

  private drawItemPickupHint(player: Entity, worldItems: WorldItem[]): void {
    const itemHere = worldItems.find(
      wi => wi.pos.x === player.pos.x && wi.pos.y === player.pos.y
    );
    if (!itemHere) return;
    const def = getItemDef(itemHere.itemId);
    if (!def) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(w / 2 - 120, 28, 240, 22);
    ctx.strokeStyle = def.color;
    ctx.strokeRect(w / 2 - 120, 28, 240, 22);
    ctx.fillStyle = def.color;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const qtyText = itemHere.quantity > 1 ? ` (x${itemHere.quantity})` : '';
    ctx.fillText(`[E] Pick up ${def.name}${qtyText}`, w / 2, 43);
  }

  // --- Inventory panel ---

  private drawInventoryPanel(inventory: Inventory, selectedSlot: number): void {
    const ctx = this.ctx;
    const panelX = this.panelX;
    const panelY = this.panelY;
    const startX = this.slotsStartX;
    const startY = this.slotsStartY;

    // Panel background
    ctx.fillStyle = 'rgba(10,10,20,0.92)';
    ctx.fillRect(panelX, panelY, INV_PANEL_W, INV_PANEL_H);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, INV_PANEL_W, INV_PANEL_H);
    ctx.lineWidth = 1;

    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INVENTORY', panelX + INV_PANEL_W / 2, panelY + 20);

    // Slots
    for (let i = 0; i < inventory.maxSlots; i++) {
      const col = i % INV_COLS;
      const row = Math.floor(i / INV_COLS);
      const sx = startX + col * (INV_SLOT_SIZE + 6);
      const sy = startY + row * (INV_SLOT_SIZE + 6);

      const isSelected = i === selectedSlot;
      const isHovered = i === this.hoveredSlot;

      if (isSelected) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.strokeStyle = '#fff';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.strokeStyle = '#aaa';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = '#444';
      }
      ctx.fillRect(sx, sy, INV_SLOT_SIZE, INV_SLOT_SIZE);
      ctx.strokeRect(sx, sy, INV_SLOT_SIZE, INV_SLOT_SIZE);

      const slot = inventory.slots[i];
      if (slot) {
        const def = getItemDef(slot.itemId);
        if (def) {
          ctx.fillStyle = def.color;
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(def.symbol, sx + INV_SLOT_SIZE / 2, sy + INV_SLOT_SIZE / 2);
          ctx.textBaseline = 'alphabetic';

          if (slot.quantity > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${slot.quantity}`, sx + INV_SLOT_SIZE - 2, sy + INV_SLOT_SIZE - 2);
          }
        }
      }
    }

    // Detail panel for selected item
    const detailY = this.getDetailY(inventory.maxSlots);
    const selectedItem = inventory.slots[selectedSlot];

    if (selectedItem) {
      const def = getItemDef(selectedItem.itemId);
      if (def) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 82);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 82);

        ctx.fillStyle = RARITY_COLORS[def.rarity];
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, panelX + INV_PADDING + 4, detailY + 16);

        ctx.fillStyle = '#999';
        ctx.font = '11px monospace';
        ctx.fillText(def.description, panelX + INV_PADDING + 4, detailY + 32);

        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.fillText(`${def.rarity} ${def.type}  |  qty: ${selectedItem.quantity}`, panelX + INV_PADDING + 4, detailY + 46);

        // Buttons row
        if (def.type === ItemType.Consumable) {
          // "Use" button
          this.drawButton(this.getButtonRect(inventory.maxSlots, 0), 'USE', '#388e3c', '#66bb6a', this.hoveredSlot === -2);
          // "Assign" button
          this.drawButton(this.getButtonRect(inventory.maxSlots, 1), 'ASSIGN', '#1565c0', '#42a5f5', this.hoveredSlot === -3);
        } else {
          // Non-consumables: just "Assign" in first position
          this.drawButton(this.getButtonRect(inventory.maxSlots, 0), 'ASSIGN', '#1565c0', '#42a5f5', this.hoveredSlot === -3);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 82);
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select an item to see details', panelX + INV_PANEL_W / 2, detailY + 40);
    }

    // Hover tooltip
    if (this.hoveredSlot >= 0 && this.hoveredSlot !== selectedSlot) {
      const hovItem = inventory.slots[this.hoveredSlot];
      if (hovItem) {
        const def = getItemDef(hovItem.itemId);
        if (def) {
          const col = this.hoveredSlot % INV_COLS;
          const row = Math.floor(this.hoveredSlot / INV_COLS);
          const tipX = startX + col * (INV_SLOT_SIZE + 6);
          const tipY = startY + row * (INV_SLOT_SIZE + 6) - 16;

          ctx.font = '10px monospace';
          const textW = ctx.measureText(def.name).width + 12;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(tipX - 2, tipY - 10, textW, 16);
          ctx.strokeStyle = RARITY_COLORS[def.rarity];
          ctx.strokeRect(tipX - 2, tipY - 10, textW, 16);
          ctx.fillStyle = RARITY_COLORS[def.rarity];
          ctx.textAlign = 'left';
          ctx.fillText(def.name, tipX + 2, tipY + 2);
        }
      }
    }
  }

  private drawButton(
    rect: { x: number; y: number; w: number; h: number },
    label: string,
    bgColor: string,
    borderColor: string,
    hovered: boolean
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = hovered ? borderColor : bgColor;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + 16);
  }

  private drawGameOver(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f44336';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU HAVE FALLEN', w / 2, h / 2 - 10);
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('Refresh to try again', w / 2, h / 2 + 20);
  }

  showCombatResult(result: CombatResult): void {
    if (result.hit) {
      const color = result.attacker.type === 'player' ? '#ff8a65' : '#f44336';
      this.addFloatingText(`-${result.damage}`, result.defender.pos.x, result.defender.pos.y, color);
    } else {
      this.addFloatingText('MISS', result.defender.pos.x, result.defender.pos.y, '#888');
    }
  }
}
