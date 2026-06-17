import type { UnitTemplate, UnitType } from "./types";

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
    goldReward: 10,
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
    goldReward: 20,
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
    goldReward: 35,
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
    color: "#4a3070",
    goldReward: 50,
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
    goldReward: 120,
  },
};

export const PLAYER_CARDS = [
  { unitType: "knight" as UnitType, baseCost: 60 },
  { unitType: "archer" as UnitType, baseCost: 40 },
  { unitType: "mage" as UnitType, baseCost: 80 },
  { unitType: "giant" as UnitType, baseCost: 120 },
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

export function getEnemyWaveComposition(level: number, wave: number): UnitType[] {
  const difficulty = level + Math.floor(wave / 3);
  const units: UnitType[] = [];
  const count = 2 + Math.min(difficulty, 6);

  for (let i = 0; i < count; i++) {
    if (difficulty >= 8 && Math.random() < 0.3) {
      units.push("dragon");
    } else if (difficulty >= 5 && Math.random() < 0.3) {
      units.push("darkKnight");
    } else if (difficulty >= 3 && Math.random() < 0.35) {
      units.push("troll");
    } else if (difficulty >= 2 && Math.random() < 0.4) {
      units.push("orc");
    } else {
      units.push("goblin");
    }
  }
  return units;
}
