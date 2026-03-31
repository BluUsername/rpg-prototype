// ============================================================
// Input Handler — keyboard and mouse input
// ============================================================

import { Direction } from './types';

export type InputCallback = (direction: Direction) => void;
export type KeyCallback = () => void;
export type SlotCallback = (slot: number) => void;
export type MouseCallback = (x: number, y: number) => void;

export class InputHandler {
  private moveCallback: InputCallback | null = null;
  private waitCallback: KeyCallback | null = null;
  private inventoryToggleCallback: KeyCallback | null = null;
  private pickupCallback: KeyCallback | null = null;
  private selectSlotCallback: SlotCallback | null = null;
  private useSelectedCallback: KeyCallback | null = null;
  private clickCallback: MouseCallback | null = null;
  private rightClickCallback: MouseCallback | null = null;
  private mouseMoveCallback: MouseCallback | null = null;
  private enabled = true;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    canvas.addEventListener('click', (e) => {
      if (!this.enabled) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.clickCallback?.(x, y);
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.rightClickCallback?.(x, y);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mouseMoveCallback?.(x, y);
    });
  }

  onMove(cb: InputCallback): void { this.moveCallback = cb; }
  onWait(cb: KeyCallback): void { this.waitCallback = cb; }
  onInventoryToggle(cb: KeyCallback): void { this.inventoryToggleCallback = cb; }
  onPickup(cb: KeyCallback): void { this.pickupCallback = cb; }
  onSelectSlot(cb: SlotCallback): void { this.selectSlotCallback = cb; }
  onUseSelected(cb: KeyCallback): void { this.useSelectedCallback = cb; }
  onClick(cb: MouseCallback): void { this.clickCallback = cb; }
  onRightClick(cb: MouseCallback): void { this.rightClickCallback = cb; }
  onMouseMove(cb: MouseCallback): void { this.mouseMoveCallback = cb; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = e.key.toLowerCase();

    // Movement: WASD or Arrow keys
    const directionMap: Record<string, Direction> = {
      'w': Direction.Up,
      'arrowup': Direction.Up,
      's': Direction.Down,
      'arrowdown': Direction.Down,
      'a': Direction.Left,
      'arrowleft': Direction.Left,
      'd': Direction.Right,
      'arrowright': Direction.Right,
    };

    const direction = directionMap[key];
    if (direction && this.moveCallback) {
      e.preventDefault();
      this.moveCallback(direction);
      return;
    }

    if (key === ' ' && this.waitCallback) {
      e.preventDefault();
      this.waitCallback();
      return;
    }

    if ((key === 'i' || key === 'tab') && this.inventoryToggleCallback) {
      e.preventDefault();
      this.inventoryToggleCallback();
      return;
    }

    if (key === 'e' && this.pickupCallback) {
      e.preventDefault();
      this.pickupCallback();
      return;
    }

    // Number keys 1-9: select slot
    if (key >= '1' && key <= '9' && this.selectSlotCallback) {
      e.preventDefault();
      this.selectSlotCallback(parseInt(key) - 1);
      return;
    }

    // Enter: use selected item
    if (key === 'enter' && this.useSelectedCallback) {
      e.preventDefault();
      this.useSelectedCallback();
      return;
    }
  }
}
