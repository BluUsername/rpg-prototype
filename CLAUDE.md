# RPG Prototype

Turn-based RPG prototype built with TypeScript + HTML5 Canvas.
Planned migration to Godot 4 once core mechanics are proven.

## Architecture

```
src/
├── main.ts              Entry point
├── game.ts              Core game state machine and turn loop
├── core/                Shared types, constants, input handling
│   ├── types.ts         All type definitions and interfaces
│   └── input.ts         Keyboard input handler
├── systems/             Game logic (engine-agnostic, no rendering)
│   ├── ai.ts            Enemy AI behavior
│   ├── combat.ts        Damage calculation and resolution
│   ├── inventory.ts     Item add/remove/use and loot rolling
│   └── map.ts           Map generation and field-of-view
├── entities/            Entity creation and definitions
│   └── factory.ts       Player and enemy factory functions
├── data/                Static game data
│   ├── items.ts         Item definitions and effects
│   └── loot-tables.ts   Enemy loot drop tables
└── ui/                  Rendering and UI
    └── renderer.ts      Canvas rendering, HUD, inventory panel
```

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Type-check and build for production
- `npx tsc --noEmit` — Type-check only

## Design Principles

- **Separation of concerns**: Game logic in `systems/` has zero rendering dependencies
- **Data-driven**: Items, loot tables, and entity stats are defined as data, not hardcoded
- **Godot-ready**: `systems/` and `core/` are pure logic — they will translate directly to GDScript/C#
