export type UnitType =
  | "knight"
  | "archer"
  | "mage"
  | "giant"
  | "goblin"
  | "orc"
  | "troll"
  | "darkKnight"
  | "dragon";

export type Team = "player" | "enemy";

export type UnitState = "moving" | "attacking" | "dead";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  state: UnitState;
  targetId: string | null;
  isRanged: boolean;
  isAoe: boolean;
  level: number;
  radius: number;
  color: string;
  label: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  isAoe: boolean;
  aoeRadius: number;
  color: string;
  sourceTeam: Team;
}

export interface Castle {
  team: Team;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardDef {
  unitType: UnitType;
  label: string;
  description: string;
  baseCost: number;
  color: string;
  level: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface GameState {
  units: Unit[];
  projectiles: Projectile[];
  playerCastle: Castle;
  enemyCastle: Castle;
  gold: number;
  currentLevel: number;
  phase: "playing" | "won" | "lost" | "menu" | "levelup";
  wave: number;
  waveTimer: number;
  waveInterval: number;
  floatingTexts: FloatingText[];
  selectedCardIndex: number | null;
  pendingPlacement: boolean;
  goldPerSecond: number;
  tickCount: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface UnitTemplate {
  type: UnitType;
  label: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  isRanged: boolean;
  isAoe: boolean;
  radius: number;
  color: string;
  goldReward?: number;
}
