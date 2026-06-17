import type { UnitTemplate, UnitType, SpawnEntry, PlayerCard } from "./types";

export const UNIT_TEMPLATES: Record<UnitType, UnitTemplate> = {
  knight: {
    type: "knight",
    label: "Knight",
    baseHp: 200,
    baseAttack: 30,
    baseDefense: 10,
    speed: 60,
    attackRange: 55,
    attackCooldown: 1.2,
    isRanged: false,
    isAoe: false,
    radius: 20,
    color: "#5b8dd9",
  },
  archer: {
    type: "archer",
    label: "Archer",
    baseHp: 100,
    baseAttack: 20,
    baseDefense: 3,
    speed: 75,
    attackRange: 180,
    attackCooldown: 1.0,
    isRanged: true,
    isAoe: false,
    radius: 15,
    color: "#6dbf6d",
  },
  mage: {
    type: "mage",
    label: "Mage",
    baseHp: 80,
    baseAttack: 28,
    baseDefense: 2,
    speed: 60,
    attackRange: 160,
    attackCooldown: 1.8,
    isRanged: true,
    isAoe: true,
    radius: 16,
    color: "#b87fd9",
  },
  giant: {
    type: "giant",
    label: "Giant",
    baseHp: 450,
    baseAttack: 50,
    baseDefense: 20,
    speed: 40,
    attackRange: 65,
    attackCooldown: 2.0,
    isRanged: false,
    isAoe: false,
    radius: 28,
    color: "#d97a3a",
  },
  goblin: {
    type: "goblin",
    label: "Goblin",
    baseHp: 70,
    baseAttack: 15,
    baseDefense: 2,
    speed: 90,
    attackRange: 50,
    attackCooldown: 0.9,
    isRanged: false,
    isAoe: false,
    radius: 13,
    color: "#a0cc3a",
  },
  orc: {
    type: "orc",
    label: "Orc",
    baseHp: 160,
    baseAttack: 28,
    baseDefense: 7,
    speed: 60,
    attackRange: 55,
    attackCooldown: 1.4,
    isRanged: false,
    isAoe: false,
    radius: 22,
    color: "#7abf40",
  },
  troll: {
    type: "troll",
    label: "Troll",
    baseHp: 320,
    baseAttack: 45,
    baseDefense: 12,
    speed: 40,
    attackRange: 60,
    attackCooldown: 2.2,
    isRanged: false,
    isAoe: false,
    radius: 26,
    color: "#5a9e3a",
  },
  darkKnight: {
    type: "darkKnight",
    label: "Dark Knight",
    baseHp: 280,
    baseAttack: 40,
    baseDefense: 14,
    speed: 65,
    attackRange: 58,
    attackCooldown: 1.3,
    isRanged: false,
    isAoe: false,
    radius: 24,
    color: "#7a50bb",
  },
  dragon: {
    type: "dragon",
    label: "Dragon",
    baseHp: 600,
    baseAttack: 70,
    baseDefense: 18,
    speed: 50,
    attackRange: 200,
    attackCooldown: 2.5,
    isRanged: true,
    isAoe: true,
    radius: 32,
    color: "#cc3a3a",
  },
};

export const PLAYER_CARDS: PlayerCard[] = [
  { unitType: "knight", manaCost: 3, icon: "⚔️" },
  { unitType: "archer", manaCost: 2, icon: "🏹" },
  { unitType: "mage",   manaCost: 4, icon: "✨" },
  { unitType: "giant",  manaCost: 5, icon: "🪨" },
];

export function getScaledStats(template: UnitTemplate, level: number, scaling = 1.0) {
  const lvl = Math.max(1, level);
  const scale = 1 + (lvl - 1) * 0.15;
  return {
    hp: Math.round(template.baseHp * scale * scaling),
    attack: Math.round(template.baseAttack * scale * scaling),
    defense: Math.round(template.baseDefense * scale * scaling),
  };
}

const LEVEL_COMPOSITIONS: UnitType[][] = [
  // Level 1 — Goblins only
  ["goblin", "goblin", "goblin", "goblin", "goblin"],
  // Level 2 — Goblins + Orcs
  ["goblin", "goblin", "orc", "goblin", "orc", "goblin"],
  // Level 3 — Orcs rising
  ["goblin", "orc", "orc", "goblin", "orc", "orc"],
  // Level 4 — Trolls arrive
  ["goblin", "orc", "troll", "orc", "goblin", "troll"],
  // Level 5 — Heavy trolls
  ["orc", "troll", "orc", "troll", "orc", "troll"],
  // Level 6 — Dark Knights
  ["orc", "troll", "darkKnight", "orc", "troll", "darkKnight"],
  // Level 7 — Elite force
  ["troll", "darkKnight", "troll", "darkKnight", "darkKnight"],
  // Level 8 — Dragon appears
  ["darkKnight", "troll", "dragon", "darkKnight", "troll"],
  // Level 9 — Double dragon
  ["darkKnight", "dragon", "troll", "darkKnight", "dragon"],
  // Level 10 — Armageddon
  ["dragon", "darkKnight", "dragon", "darkKnight", "dragon", "darkKnight"],
];

export function getLevelSpawnQueue(level: number): SpawnEntry[] {
  const comp = LEVEL_COMPOSITIONS[Math.min(level - 1, LEVEL_COMPOSITIONS.length - 1)];
  const scaling = 1 + (level - 1) * 0.25;
  let delay = 3;
  return comp.map((unitType) => {
    const entry: SpawnEntry = { delay, unitType };
    delay += 5 + Math.random() * 4;
    return entry;
  });
}
