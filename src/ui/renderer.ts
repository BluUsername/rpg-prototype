// ============================================================
// Renderer — draws the game world onto the canvas
// ============================================================

import {
  GameMap, Entity, TileType, TILE_SIZE, Position, CombatResult,
  WorldItem, Inventory, GamePhase, ItemType,
} from '../core/types';
import { getItemDef } from '../data/items';

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

// Inventory panel layout constants (shared with hit-testing)
const INV_PANEL_W = 280;
const INV_PANEL_H = 400;
const INV_SLOT_SIZE = 32;
const INV_COLS = 5;
const INV_PADDING = 8;
const INV_USE_BTN_W = 80;
const INV_USE_BTN_H = 24;

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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = 800;
    this.canvas.height = 576;
  }

  private get panelX(): number {
    return this.canvas.width - INV_PANEL_W - 8;
  }

  private get panelY(): number {
    return 30;
  }

  private get slotsStartX(): number {
    return this.panelX + INV_PADDING + 12;
  }

  private get slotsStartY(): number {
    return this.panelY + 36;
  }

  setHoveredSlot(slot: number): void {
    this.hoveredSlot = slot;
  }

  // Returns the inventory slot index at a given canvas pixel, or -1
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

  // Returns true if the click is on the "Use" button
  isUseButtonAt(px: number, py: number, maxSlots: number): boolean {
    const btnPos = this.getUseButtonRect(maxSlots);
    return px >= btnPos.x && px < btnPos.x + btnPos.w &&
           py >= btnPos.y && py < btnPos.y + btnPos.h;
  }

  private getUseButtonRect(maxSlots: number): { x: number; y: number; w: number; h: number } {
    const detailY = this.slotsStartY + Math.ceil(maxSlots / INV_COLS) * (INV_SLOT_SIZE + 6) + 8;
    return {
      x: this.panelX + INV_PANEL_W - INV_PADDING - INV_USE_BTN_W - 4,
      y: detailY + 50,
      w: INV_USE_BTN_W,
      h: INV_USE_BTN_H,
    };
  }

  updateCamera(playerPos: Position): void {
    const viewW = this.canvas.width / TILE_SIZE;
    const viewH = this.canvas.height / TILE_SIZE;
    this.camera.x = playerPos.x - Math.floor(viewW / 2);
    this.camera.y = playerPos.y - Math.floor(viewH / 2);
  }

  addFloatingText(text: string, worldX: number, worldY: number, color: string): void {
    this.floatingTexts.push({
      text, x: worldX, y: worldY, color,
      life: 60, maxLife: 60,
    });
  }

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

    const tilesX = Math.ceil(w / TILE_SIZE) + 1;
    const tilesY = Math.ceil(h / TILE_SIZE) + 1;

    // Draw tiles
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

    // Draw world items
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

      if (wi.quantity > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${wi.quantity}`, sx + TILE_SIZE - 2, sy + TILE_SIZE - 2);
      }
      ctx.textBaseline = 'alphabetic';
    }

    // Draw entities
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

    // Floating text
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

    // UI overlays
    const player = entities.find(e => e.type === 'player');
    if (player) {
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
      ctx.fillText('Click: Select  |  Right-click/Enter: Use  |  I/Tab: Close', w - 8, 16);
    } else {
      ctx.fillText('WASD: Move  |  Space: Wait  |  E: Pickup  |  I: Inventory', w - 8, 16);
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

    // Title
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

      // Slot background — distinct states for selected, hovered, and default
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

      // Slot number hint (1-9)
      if (i < 9) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${i + 1}`, sx + 2, sy + 10);
      }

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

    // Selected item detail panel
    const selectedItem = inventory.slots[selectedSlot];
    const detailY = startY + Math.ceil(inventory.maxSlots / INV_COLS) * (INV_SLOT_SIZE + 6) + 8;

    if (selectedItem) {
      const def = getItemDef(selectedItem.itemId);
      if (def) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 78);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 78);

        // Item name (colored by rarity)
        ctx.fillStyle = RARITY_COLORS[def.rarity];
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, panelX + INV_PADDING + 4, detailY + 16);

        // Description
        ctx.fillStyle = '#999';
        ctx.font = '11px monospace';
        ctx.fillText(def.description, panelX + INV_PADDING + 4, detailY + 32);

        // Type / rarity / quantity
        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.fillText(`${def.rarity} ${def.type}  |  qty: ${selectedItem.quantity}`, panelX + INV_PADDING + 4, detailY + 48);

        // "Use" button (only for consumables)
        if (def.type === ItemType.Consumable) {
          const btn = this.getUseButtonRect(inventory.maxSlots);

          // Hover detection for button
          const btnHovered = this.hoveredSlot === -2;
          ctx.fillStyle = btnHovered ? '#4caf50' : '#388e3c';
          ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
          ctx.strokeStyle = '#66bb6a';
          ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('USE', btn.x + btn.w / 2, btn.y + 16);
        }
      }
    } else {
      // Empty state
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(panelX + INV_PADDING, detailY, INV_PANEL_W - INV_PADDING * 2, 78);

      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select an item to see details', panelX + INV_PANEL_W / 2, detailY + 40);
    }

    // Tooltip on hover (shows item name near cursor)
    if (this.hoveredSlot >= 0 && this.hoveredSlot !== selectedSlot) {
      const hovItem = inventory.slots[this.hoveredSlot];
      if (hovItem) {
        const def = getItemDef(hovItem.itemId);
        if (def) {
          const col = this.hoveredSlot % INV_COLS;
          const row = Math.floor(this.hoveredSlot / INV_COLS);
          const tipX = startX + col * (INV_SLOT_SIZE + 6);
          const tipY = startY + row * (INV_SLOT_SIZE + 6) - 16;

          const textW = ctx.measureText(def.name).width || def.name.length * 7;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(tipX - 2, tipY - 10, textW + 12, 16);
          ctx.strokeStyle = RARITY_COLORS[def.rarity];
          ctx.strokeRect(tipX - 2, tipY - 10, textW + 12, 16);

          ctx.fillStyle = RARITY_COLORS[def.rarity];
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(def.name, tipX + 2, tipY + 2);
        }
      }
    }
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
