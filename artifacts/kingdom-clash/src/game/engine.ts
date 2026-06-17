import type { Unit, Projectile, GameState, Castle, FloatingText } from "./types";
import { UNIT_TEMPLATES, getScaledStats, getLevelSpawnQueue } from "./units";

let idCounter = 0;
function nextId() { return `u${++idCounter}`; }

export function createInitialState(w: number, h: number, level = 1): GameState {
  const castleScaling = 1 + (level - 1) * 0.3;
  return {
    units: [],
    projectiles: [],
    playerCastle: {
      team: "player",
      hp: 1000,
      maxHp: 1000,
      x: w / 2,
      y: h - 60,
      width: 160,
      height: 90,
    },
    enemyCastle: {
      team: "enemy",
      hp: Math.round(800 * castleScaling),
      maxHp: Math.round(800 * castleScaling),
      x: w / 2,
      y: 60,
      width: 160,
      height: 90,
    },
    mana: 5,
    maxMana: 10,
    manaPerSecond: 1.2,
    currentLevel: level,
    phase: "playing",
    spawnQueue: getLevelSpawnQueue(level),
    spawnTimer: 0,
    floatingTexts: [],
    tickCount: 0,
    canvasWidth: w,
    canvasHeight: h,
  };
}

export function spawnPlayerUnit(
  state: GameState,
  unitType: import("./types").UnitType,
  x: number,
  y: number
) {
  const template = UNIT_TEMPLATES[unitType];
  const stats = getScaledStats(template, state.currentLevel);
  state.units.push({
    id: nextId(),
    type: unitType,
    team: "player",
    x, y,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: template.speed,
    attackRange: template.attackRange,
    attackCooldown: template.attackCooldown,
    attackTimer: 0,
    state: "moving",
    isRanged: template.isRanged,
    isAoe: template.isAoe,
    level: state.currentLevel,
    radius: template.radius,
    color: template.color,
    label: template.label,
  });
}

function spawnEnemy(state: GameState, unitType: import("./types").UnitType) {
  const template = UNIT_TEMPLATES[unitType];
  const scaling = 1 + (state.currentLevel - 1) * 0.25;
  const stats = getScaledStats(template, state.currentLevel, scaling);
  state.units.push({
    id: nextId(),
    type: unitType,
    team: "enemy",
    x: 60 + Math.random() * (state.canvasWidth - 120),
    y: 60 + Math.random() * 50,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: template.speed,
    attackRange: template.attackRange,
    attackCooldown: template.attackCooldown,
    attackTimer: 0,
    state: "moving",
    isRanged: template.isRanged,
    isAoe: template.isAoe,
    level: state.currentLevel,
    radius: template.radius,
    color: template.color,
    label: template.label,
  });
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function addFloat(state: GameState, x: number, y: number, text: string, color: string) {
  state.floatingTexts.push({ id: nextId(), x, y, text, color, life: 1.5, maxLife: 1.5, vy: -50 });
}

function spawnProjectile(state: GameState, from: Unit, targetId: string) {
  state.projectiles.push({
    id: nextId(),
    x: from.x, y: from.y,
    targetId,
    damage: from.attack,
    speed: 220,
    isAoe: from.isAoe,
    aoeRadius: from.isAoe ? 70 : 0,
    color: from.team === "player" ? "#fadf70" : "#ff5555",
    sourceTeam: from.team,
  });
}

export function tickGame(state: GameState, dt: number): GameState {
  if (state.phase !== "playing") return state;

  const s = {
    ...state,
    units: state.units.map(u => ({ ...u })),
    projectiles: [...state.projectiles],
    floatingTexts: state.floatingTexts.map(f => ({ ...f })),
    spawnQueue: [...state.spawnQueue],
  };
  s.tickCount++;

  // Mana regeneration
  s.mana = Math.min(s.maxMana, s.mana + s.manaPerSecond * dt);

  // Spawn queue
  s.spawnTimer += dt;
  while (s.spawnQueue.length > 0 && s.spawnTimer >= s.spawnQueue[0].delay) {
    const entry = s.spawnQueue.shift()!;
    spawnEnemy(s, entry.unitType);
  }

  const playerCastle = { ...s.playerCastle };
  const enemyCastle = { ...s.enemyCastle };

  for (const unit of s.units) {
    if (unit.state === "dead") continue;
    unit.attackTimer = Math.max(0, unit.attackTimer - dt);

    const targetCastle = unit.team === "player" ? enemyCastle : playerCastle;
    const enemies = s.units.filter(u => u.team !== unit.team && u.state !== "dead");

    let nearestEnemy: Unit | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      const d = dist(unit.x, unit.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    }

    const castleDist = dist(unit.x, unit.y, targetCastle.x, targetCastle.y);
    const target = nearestEnemy && nearestDist <= castleDist
      ? { x: nearestEnemy.x, y: nearestEnemy.y, isUnit: true, unit: nearestEnemy }
      : { x: targetCastle.x, y: targetCastle.y, isUnit: false, isCastle: true } as any;

    const d = dist(unit.x, unit.y, target.x, target.y);
    if (d > unit.attackRange) {
      const nx = (target.x - unit.x) / d;
      const ny = (target.y - unit.y) / d;
      unit.x += nx * unit.speed * dt;
      unit.y += ny * unit.speed * dt;
      unit.x = Math.max(unit.radius, Math.min(s.canvasWidth - unit.radius, unit.x));
      unit.y = Math.max(unit.radius, Math.min(s.canvasHeight - unit.radius, unit.y));
      unit.state = "moving";
    } else if (unit.attackTimer <= 0) {
      unit.state = "attacking";
      unit.attackTimer = unit.attackCooldown;

      if (target.isCastle) {
        const dmg = Math.max(1, unit.attack);
        if (unit.team === "player") {
          enemyCastle.hp = Math.max(0, enemyCastle.hp - dmg);
          addFloat(s, targetCastle.x + (Math.random() - 0.5) * 60, targetCastle.y - 20, `-${dmg}`, "#ff8844");
        } else {
          playerCastle.hp = Math.max(0, playerCastle.hp - dmg);
          addFloat(s, targetCastle.x + (Math.random() - 0.5) * 60, targetCastle.y - 20, `-${dmg}`, "#ff4444");
        }
      } else if (target.unit) {
        if (unit.isRanged) {
          spawnProjectile(s, unit, target.unit.id);
        } else {
          const dmg = Math.max(1, unit.attack - target.unit.defense);
          target.unit.hp -= dmg;
          addFloat(s, target.unit.x, target.unit.y - target.unit.radius - 10, `-${dmg}`, unit.team === "player" ? "#ff8844" : "#ff4444");
          if (target.unit.hp <= 0) target.unit.state = "dead";
        }
      }
    } else {
      unit.state = "moving";
    }
  }

  s.playerCastle = playerCastle;
  s.enemyCastle = enemyCastle;

  // Projectiles
  for (const proj of s.projectiles) {
    const target = s.units.find(u => u.id === proj.targetId && u.state !== "dead");
    if (!target) { proj.targetId = "dead"; continue; }
    const d = dist(proj.x, proj.y, target.x, target.y);
    if (d < 12) {
      if (proj.isAoe) {
        for (const h of s.units.filter(u => u.team !== proj.sourceTeam && u.state !== "dead" && dist(u.x, u.y, target.x, target.y) < proj.aoeRadius)) {
          const dmg = Math.max(1, proj.damage - h.defense);
          h.hp -= dmg;
          addFloat(s, h.x, h.y - h.radius - 10, `-${dmg}`, "#ff8844");
          if (h.hp <= 0) h.state = "dead";
        }
      } else {
        const dmg = Math.max(1, proj.damage - target.defense);
        target.hp -= dmg;
        addFloat(s, target.x, target.y - target.radius - 10, `-${dmg}`, proj.sourceTeam === "player" ? "#ff8844" : "#ff4444");
        if (target.hp <= 0) target.state = "dead";
      }
      proj.targetId = "dead";
    } else {
      proj.x += ((target.x - proj.x) / d) * proj.speed * dt;
      proj.y += ((target.y - proj.y) / d) * proj.speed * dt;
    }
  }

  s.projectiles = s.projectiles.filter(p => p.targetId !== "dead");
  s.units = s.units.filter(u => u.state !== "dead");
  for (const ft of s.floatingTexts) { ft.life -= dt; ft.y += ft.vy * dt; }
  s.floatingTexts = s.floatingTexts.filter(ft => ft.life > 0);

  if (s.enemyCastle.hp <= 0) s.phase = "won";
  else if (s.playerCastle.hp <= 0) s.phase = "lost";
  // Also win if all enemies spawned & defeated
  else if (s.spawnQueue.length === 0 && !s.units.some(u => u.team === "enemy")) s.phase = "won";

  return s;
}

export function startNextLevel(state: GameState): GameState {
  return createInitialState(state.canvasWidth, state.canvasHeight, state.currentLevel + 1);
}
