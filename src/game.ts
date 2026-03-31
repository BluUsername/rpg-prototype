// ============================================================
// Game — core state machine and turn loop
// ============================================================

import {
  Entity, GamePhase, Direction, Position, GameMap, WorldItem,
} from './core/types';
import { createTestMap, isWalkable, computeFOV } from './systems/map';
import { createPlayer, createSkeleton, createGoblin, createOrc } from './entities/factory';
import { resolveCombat } from './systems/combat';
import { getEnemyAction, directionDelta } from './systems/ai';
import { addItemToInventory, useItemFromSlot, rollLoot } from './systems/inventory';
import { getItemDef } from './data/items';
import { InputHandler } from './core/input';
import { Renderer } from './ui/renderer';

export class Game {
  private map: GameMap;
  private player: Entity;
  private entities: Entity[] = [];
  private worldItems: WorldItem[] = [];
  private phase: GamePhase = GamePhase.PlayerTurn;
  private messageLog: string[] = [];
  private renderer: Renderer;
  private input: InputHandler;
  private turnCount = 0;
  private inventoryOpen = false;
  private selectedSlot = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputHandler(canvas);

    // Create map
    this.map = createTestMap();

    // Create player in starting room (with a starter potion)
    this.player = createPlayer({ x: 4, y: 4 });
    addItemToInventory(this.player.inventory, 'health_potion_small', 2);
    addItemToInventory(this.player.inventory, 'bread', 1);
    this.entities.push(this.player);

    // Spawn enemies
    this.entities.push(createGoblin({ x: 14, y: 3 }));
    this.entities.push(createGoblin({ x: 16, y: 4 }));
    this.entities.push(createSkeleton({ x: 24, y: 3 }));
    this.entities.push(createSkeleton({ x: 25, y: 5 }));
    this.entities.push(createOrc({ x: 15, y: 12 }));
    this.entities.push(createGoblin({ x: 3, y: 14 }));
    this.entities.push(createSkeleton({ x: 25, y: 14 }));

    // Bind input
    this.input.onMove((dir) => this.handlePlayerMove(dir));
    this.input.onWait(() => this.handlePlayerWait());
    this.input.onInventoryToggle(() => this.toggleInventory());
    this.input.onPickup(() => this.handlePickup());
    this.input.onSelectSlot((slot) => this.handleSelectSlot(slot));
    this.input.onUseSelected(() => this.handleUseSelected());
    this.input.onClick((x, y) => this.handleClick(x, y));
    this.input.onRightClick((x, y) => this.handleRightClick(x, y));
    this.input.onMouseMove((x, y) => this.handleMouseMove(x, y));

    // Initial FOV
    computeFOV(this.map, this.player.pos, 7);

    this.log('You awaken in a dark dungeon. Find your way out.');
    this.log('WASD: Move | Space: Wait | E: Pickup | I: Inventory | 1-9: Use item');

    this.tick();
  }

  private tick = (): void => {
    this.renderer.updateCamera(this.player.pos);
    this.renderer.render(
      this.map,
      this.entities,
      this.worldItems,
      this.messageLog,
      this.phase,
      this.inventoryOpen,
      this.selectedSlot
    );
    requestAnimationFrame(this.tick);
  };

  private log(msg: string): void {
    this.messageLog.push(msg);
    if (this.messageLog.length > 50) {
      this.messageLog.shift();
    }
  }

  // --- Inventory actions (free actions, no AP cost) ---

  private toggleInventory(): void {
    if (this.phase === GamePhase.GameOver) return;
    this.inventoryOpen = !this.inventoryOpen;
  }

  private handlePickup(): void {
    if (this.phase !== GamePhase.PlayerTurn) return;

    const itemIndex = this.worldItems.findIndex(
      wi => wi.pos.x === this.player.pos.x && wi.pos.y === this.player.pos.y
    );

    if (itemIndex === -1) {
      this.log('Nothing to pick up here.');
      return;
    }

    const worldItem = this.worldItems[itemIndex];
    const remaining = addItemToInventory(this.player.inventory, worldItem.itemId, worldItem.quantity);

    if (remaining === worldItem.quantity) {
      this.log('Inventory is full!');
      return;
    }

    const pickedUp = worldItem.quantity - remaining;
    const def = getItemDef(worldItem.itemId);
    const name = def?.name ?? worldItem.itemId;
    const qtyStr = pickedUp > 1 ? `${pickedUp}x ` : '';

    if (remaining > 0) {
      worldItem.quantity = remaining;
      this.log(`Picked up ${qtyStr}${name}. (Inventory nearly full)`);
    } else {
      this.worldItems.splice(itemIndex, 1);
      this.log(`Picked up ${qtyStr}${name}.`);
    }
  }

  private handleSelectSlot(slot: number): void {
    if (slot >= this.player.inventory.maxSlots) return;
    this.selectedSlot = slot;
  }

  private handleUseSelected(): void {
    if (this.phase === GamePhase.GameOver) return;

    const slot = this.player.inventory.slots[this.selectedSlot];
    if (!slot) return;

    const result = useItemFromSlot(this.player.inventory, this.selectedSlot, this.player);
    if (result) {
      this.log(result);
    }
  }

  private handleClick(x: number, y: number): void {
    if (!this.inventoryOpen) return;

    // Check if clicking the "Use" button
    if (this.renderer.isUseButtonAt(x, y, this.player.inventory.maxSlots)) {
      this.handleUseSelected();
      return;
    }

    // Check if clicking an inventory slot
    const slot = this.renderer.getSlotAtPosition(x, y, this.player.inventory.maxSlots);
    if (slot >= 0) {
      this.selectedSlot = slot;
    }
  }

  private handleRightClick(x: number, y: number): void {
    if (!this.inventoryOpen) return;

    // Right-click on a slot: select + use immediately
    const slot = this.renderer.getSlotAtPosition(x, y, this.player.inventory.maxSlots);
    if (slot >= 0) {
      this.selectedSlot = slot;
      this.handleUseSelected();
    }
  }

  private handleMouseMove(x: number, y: number): void {
    if (!this.inventoryOpen) {
      this.renderer.setHoveredSlot(-1);
      return;
    }

    // Check if hovering the "Use" button (use -2 as sentinel)
    if (this.renderer.isUseButtonAt(x, y, this.player.inventory.maxSlots)) {
      this.renderer.setHoveredSlot(-2);
      return;
    }

    const slot = this.renderer.getSlotAtPosition(x, y, this.player.inventory.maxSlots);
    this.renderer.setHoveredSlot(slot);
  }

  // --- Movement and combat ---

  private handlePlayerMove(direction: Direction): void {
    if (this.phase !== GamePhase.PlayerTurn) return;
    if (!this.player.alive) return;

    const delta = directionDelta(direction);
    const newPos: Position = {
      x: this.player.pos.x + delta.x,
      y: this.player.pos.y + delta.y,
    };

    const target = this.entities.find(
      e => e.alive && e.type === 'enemy' && e.pos.x === newPos.x && e.pos.y === newPos.y
    );

    if (target) {
      this.playerAttack(target);
    } else if (isWalkable(this.map, newPos)) {
      this.player.pos = newPos;
      this.player.stats.ap -= 1;
      computeFOV(this.map, this.player.pos, 7);
    } else {
      return;
    }

    this.checkEndPlayerTurn();
  }

  private handlePlayerWait(): void {
    if (this.phase !== GamePhase.PlayerTurn) return;
    this.log('You wait...');
    this.player.stats.ap = 0;
    this.checkEndPlayerTurn();
  }

  private playerAttack(target: Entity): void {
    const result = resolveCombat(this.player, target);
    this.renderer.showCombatResult(result);
    this.player.stats.ap -= 1;

    if (result.hit) {
      this.log(`You hit ${target.name} for ${result.damage} damage!`);
      if (result.killed) {
        this.log(`${target.name} is defeated!`);
        this.spawnLoot(target);
      }
    } else {
      this.log(`You missed ${target.name}!`);
    }
  }

  private spawnLoot(enemy: Entity): void {
    if (!enemy.lootTable) return;

    const drops = rollLoot(enemy.lootTable, enemy.pos);
    for (const drop of drops) {
      this.worldItems.push(drop);
    }

    if (drops.length > 0) {
      this.log(`${enemy.name} dropped some items.`);
    }
  }

  private checkEndPlayerTurn(): void {
    if (this.player.stats.ap <= 0) {
      this.endPlayerTurn();
    }
  }

  private endPlayerTurn(): void {
    this.phase = GamePhase.EnemyTurn;
    this.input.setEnabled(false);

    setTimeout(() => {
      this.processEnemyTurns();
    }, 150);
  }

  private processEnemyTurns(): void {
    const enemies = this.entities.filter(e => e.type === 'enemy' && e.alive);

    for (const enemy of enemies) {
      enemy.stats.ap = enemy.stats.maxAp;

      while (enemy.stats.ap > 0 && enemy.alive) {
        const action = getEnemyAction(enemy, this.player, this.map, this.entities);

        if (action.type === 'attack') {
          const result = resolveCombat(enemy, this.player);
          this.renderer.showCombatResult(result);
          enemy.stats.ap -= 1;

          if (result.hit) {
            this.log(`${enemy.name} hits you for ${result.damage} damage!`);
            if (result.killed) {
              this.log('You have been slain...');
              this.phase = GamePhase.GameOver;
              return;
            }
          } else {
            this.log(`${enemy.name} misses you!`);
          }
        } else if (action.type === 'move' && action.direction) {
          const delta = directionDelta(action.direction);
          enemy.pos = {
            x: enemy.pos.x + delta.x,
            y: enemy.pos.y + delta.y,
          };
          enemy.stats.ap -= 1;
        } else {
          enemy.stats.ap = 0;
        }
      }
    }

    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    this.turnCount++;
    this.player.stats.ap = this.player.stats.maxAp;
    this.phase = GamePhase.PlayerTurn;
    this.input.setEnabled(true);

    const enemiesAlive = this.entities.filter(e => e.type === 'enemy' && e.alive).length;
    if (enemiesAlive === 0) {
      this.log('All enemies defeated! The dungeon falls silent.');
    }
  }
}
