import type { LevelStars } from "./types";

const STORAGE_KEY = "kingdom-clash-stars";

export function loadStars(): LevelStars {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStars(stars: LevelStars) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
  } catch {}
}

export function computeStars(castleHpFraction: number, won: boolean): number {
  if (!won) return 0;
  if (castleHpFraction > 0.66) return 3;
  if (castleHpFraction > 0.33) return 2;
  return 1;
}

export function levelKey(level: number) {
  return `level-${level}`;
}

export function isLevelUnlocked(level: number, stars: LevelStars): boolean {
  if (level === 1) return true;
  return (stars[levelKey(level - 1)] ?? 0) >= 1;
}

export const TOTAL_LEVELS = 10;
