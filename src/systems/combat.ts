// ============================================================
// Combat System — damage calculation and resolution
// ============================================================

import { Entity, CombatResult } from '../core/types';

export function resolveCombat(attacker: Entity, defender: Entity): CombatResult {
  // Damage = attacker.attack - defender.defense/2 + random variance
  const baseDamage = attacker.stats.attack - Math.floor(defender.stats.defense / 2);
  const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  const damage = Math.max(1, baseDamage + variance);

  // Hit chance: 85% base, modified by speed difference
  const speedDiff = attacker.stats.speed - defender.stats.speed;
  const hitChance = Math.min(0.95, Math.max(0.5, 0.85 + speedDiff * 0.03));
  const hit = Math.random() < hitChance;

  let killed = false;

  if (hit) {
    defender.stats.hp -= damage;
    if (defender.stats.hp <= 0) {
      defender.stats.hp = 0;
      defender.alive = false;
      killed = true;
    }
  }

  return { attacker, defender, damage: hit ? damage : 0, hit, killed };
}
