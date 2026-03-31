// ============================================================
// Entry Point
// ============================================================

import { Game } from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

new Game(canvas);
