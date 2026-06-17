import type { Unit, Projectile, GameState, Castle, FloatingText } from "./types";
import { UNIT_TEMPLATES, getScaledStats, getEnemyWaveComposition } from "./units";

let idCounter = 0;
function nextId() {
  return `u${++idCounter}`;
}

export function createInitialState(w: number, h: number, level = 1): GameState {
  const midX = w / 2;
  const castleScaling = 1 + (level - 1) * 0.3;
  return {
    units: [],
    projectiles: [],
    playerCastle: {
      team: "player",
      hp: 1000,
      maxHp: 1000,
      x: midX,
      y: h - 60,
      width: 160,
      height: 90,
    },
    enemyCastle: {
      team: "enemy",
      hp: Math.round(800 * castleScaling),
      maxHp: Math.round(800 * castleScaling),
      x: midX,
      y: 60,
      width: 160,
      height: 90,
    },
    gold: 80,
    currentLevel: level,
    phase: "playing",
    wave: 0,
    waveTimer: 8,
    waveInterval: Math.max(10, 18 - level),
    floatingTexts: [],
    selectedCardIndex: null,
    tickCount: 0,
    canvasWidth: w,
    canvasHeight: h,
  };
}

function spawnEnemy(state: GameState, unitType: import("./types").UnitType) {
  const template = UNIT_TEMPLATES[unitType];
  const scaling = 1 + (state.currentLevel - 1) * 0.25;
  const stats = getScaledStats(template, state.currentLevel, scaling);
  const spawnX = 60 + Math.random() * (state.canvasWidth - 120);
  const spawnY = 60 + Math.random() * 50;

  const unit: Unit = {
    id: nextId(),
    type: unitType,
    team: "enemy",
    x: spawnX,
    y: spawnY,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: template.speed,
    attackRange: template.attackRange,
    attackCooldown: template.attackCooldown,
    attackTimer: 0,
    state: "moving",
    targetId: null,
    isRanged: template.isRanged,
    isAoe: template.isAoe,
    level: state.currentLevel,
    radius: template.radius,
    color: template.color,
    label: template.label,
  };
  state.units.push(unit);
}

export function spawnPlayerUnit(
  state: GameState,
  unitType: import("./types").UnitType,
  x: number,
  y: number,
  cardLevel: number
) {
  const template = UNIT_TEMPLATES[unitType];
  const stats = getScaledStats(template, cardLevel);

  const unit: Unit = {
    id: nextId(),
    type: unitType,
    team: "player",
    x,
    y,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: template.speed,
    attackRange: template.attackRange,
    attackCooldown: template.attackCooldown,
    attackTimer: 0,
    state: "moving",
    targetId: null,
    isRanged: template.isRanged,
    isAoe: template.isAoe,
    level: cardLevel,
    radius: template.radius,
    color: template.color,
    label: template.label,
  };
  state.units.push(unit);
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function addFloatingText(state: GameState, x: number, y: number, text: string, color: string) {
  const ft: FloatingText = {
    id: nextId(),
    x,
    y,
    text,
    color,
    life: 1.5,
    maxLife: 1.5,
    vy: -50,
  };
  state.floatingTexts.push(ft);
}

function spawnProjectile(state: GameState, from: Unit, targetId: string) {
  const proj: Projectile = {
    id: nextId(),
    x: from.x,
    y: from.y,
    targetId,
    damage: from.attack,
    speed: 220,
    isAoe: from.isAoe,
    aoeRadius: from.isAoe ? 70 : 0,
    color: from.team === "player" ? "#fadf70" : "#ff5555",
    sourceTeam: from.team,
  };
  state.projectiles.push(proj);
}

export function tickGame(state: GameState, dt: number): GameState {
  if (state.phase !== "playing") return state;

  const s = { ...state };
  s.units = state.units.map((u) => ({ ...u }));
  s.projectiles = [...state.projectiles];
  s.floatingTexts = state.floatingTexts.map((f) => ({ ...f }));
  s.tickCount++;

  s.waveTimer -= dt;
  if (s.waveTimer <= 0) {
    s.wave++;
    s.waveTimer = s.waveInterval;
    const composition = getEnemyWaveComposition(s.currentLevel, s.wave);
    for (const unitType of composition) {
      spawnEnemy(s, unitType);
    }
    addFloatingText(s, s.canvasWidth / 2, s.canvasHeight / 2 - 40, `Wave ${s.wave}!`, "#ffdd44");
  }

  const playerCastle = { ...s.playerCastle };
  const enemyCastle = { ...s.enemyCastle };

  for (const unit of s.units) {
    if (unit.state === "dead") continue;
    unit.attackTimer = Math.max(0, unit.attackTimer - dt);

    const targetCastle = unit.team === "player" ? enemyCastle : playerCastle;
    const enemies = s.units.filter((u) => u.team !== unit.team && u.state !== "dead");

    let nearestEnemy: Unit | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      const d = dist(unit.x, unit.y, e.x, e.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = e;
      }
    }

    const castleDist = dist(unit.x, unit.y, targetCastle.x, targetCastle.y);

    let target: { x: number; y: number; isUnit: boolean; unit?: Unit; isCastle?: boolean } | null = null;

    if (nearestEnemy && nearestDist <= castleDist) {
      target = { x: nearestEnemy.x, y: nearestEnemy.y, isUnit: true, unit: nearestEnemy };
    } else {
      target = { x: targetCastle.x, y: targetCastle.y, isUnit: false, isCastle: true };
    }

    if (target) {
      const d = dist(unit.x, unit.y, target.x, target.y);

      if (d > unit.attackRange) {
        const nx = (target.x - unit.x) / d;
        const ny = (target.y - unit.y) / d;
        unit.x += nx * unit.speed * dt;
        unit.y += ny * unit.speed * dt;
        unit.state = "moving";

        unit.x = Math.max(unit.radius, Math.min(s.canvasWidth - unit.radius, unit.x));
        unit.y = Math.max(unit.radius, Math.min(s.canvasHeight - unit.radius, unit.y));
      } else if (unit.attackTimer <= 0) {
        unit.state = "attacking";
        unit.attackTimer = unit.attackCooldown;

        if (target.isCastle) {
          const dmg = Math.max(1, unit.attack);
          if (unit.team === "player") {
            enemyCastle.hp = Math.max(0, enemyCastle.hp - dmg);
            addFloatingText(s, targetCastle.x + (Math.random() - 0.5) * 60, targetCastle.y - 20, `-${dmg}`, "#ff8844");
          } else {
            playerCastle.hp = Math.max(0, playerCastle.hp - dmg);
            addFloatingText(s, targetCastle.x + (Math.random() - 0.5) * 60, targetCastle.y - 20, `-${dmg}`, "#ff4444");
          }
        } else if (target.unit) {
          if (unit.isRanged) {
            spawnProjectile(s, unit, target.unit.id);
          } else {
            const dmg = Math.max(1, unit.attack - target.unit.defense);
            target.unit.hp -= dmg;
            addFloatingText(
              s,
              target.unit.x,
              target.unit.y - target.unit.radius - 10,
              `-${dmg}`,
              unit.team === "player" ? "#ff8844" : "#ff4444"
            );
            if (target.unit.hp <= 0) {
              target.unit.state = "dead";
              const template = UNIT_TEMPLATES[target.unit.type];
              if (target.unit.team === "enemy" && template.goldReward) {
                s.gold += template.goldReward;
                addFloatingText(s, target.unit.x, target.unit.y - 30, `+${template.goldReward}g`, "#ffd700");
              }
            }
          }
        }
      } else {
        unit.state = "moving";
      }
    }
  }

  s.playerCastle = playerCastle;
  s.enemyCastle = enemyCastle;

  for (const proj of s.projectiles) {
    const target = s.units.find((u) => u.id === proj.targetId && u.state !== "dead");
    if (!target) {
      proj.targetId = "dead";
      continue;
    }
    const d = dist(proj.x, proj.y, target.x, target.y);
    if (d < 12) {
      if (proj.isAoe) {
        const hits = s.units.filter(
          (u) =>
            u.team !== proj.sourceTeam &&
            u.state !== "dead" &&
            dist(u.x, u.y, target.x, target.y) < proj.aoeRadius
        );
        for (const h of hits) {
          const dmg = Math.max(1, proj.damage - h.defense);
          h.hp -= dmg;
          addFloatingText(s, h.x, h.y - h.radius - 10, `-${dmg}`, "#ff8844");
          if (h.hp <= 0) {
            h.state = "dead";
            const template = UNIT_TEMPLATES[h.type];
            if (h.team === "enemy" && template.goldReward) {
              s.gold += template.goldReward;
              addFloatingText(s, h.x, h.y - 30, `+${template.goldReward}g`, "#ffd700");
            }
          }
        }
      } else {
        const dmg = Math.max(1, proj.damage - target.defense);
        target.hp -= dmg;
        addFloatingText(
          s,
          target.x,
          target.y - target.radius - 10,
          `-${dmg}`,
          proj.sourceTeam === "player" ? "#ff8844" : "#ff4444"
        );
        if (target.hp <= 0) {
          target.state = "dead";
          const template = UNIT_TEMPLATES[target.type];
          if (target.team === "enemy" && template.goldReward) {
            s.gold += template.goldReward;
            addFloatingText(s, target.x, target.y - 30, `+${template.goldReward}g`, "#ffd700");
          }
        }
      }
      proj.targetId = "dead";
    } else {
      const nx = (target.x - proj.x) / d;
      const ny = (target.y - proj.y) / d;
      proj.x += nx * proj.speed * dt;
      proj.y += ny * proj.speed * dt;
    }
  }

  s.projectiles = s.projectiles.filter((p) => p.targetId !== "dead");
  s.units = s.units.filter((u) => u.state !== "dead");

  for (const ft of s.floatingTexts) {
    ft.life -= dt;
    ft.y += ft.vy * dt;
  }
  s.floatingTexts = s.floatingTexts.filter((ft) => ft.life > 0);

  if (s.enemyCastle.hp <= 0) {
    s.phase = "won";
  } else if (s.playerCastle.hp <= 0) {
    s.phase = "lost";
  }

  return s;
}

export function startNextLevel(state: GameState): GameState {
  return createInitialState(state.canvasWidth, state.canvasHeight, state.currentLevel + 1);
}
