import { useEffect, useRef, useState, useCallback } from "react";
import { renderGame } from "../game/renderer";
import { createInitialState, tickGame, spawnPlayerUnit, startNextLevel } from "../game/engine";
import { UNIT_TEMPLATES, PLAYER_CARDS } from "../game/units";
import { useHandTracking } from "../hooks/useHandTracking";
import { loadStars, saveStars, computeStars, levelKey } from "../game/stars";
import type { GameState, UnitType } from "../game/types";

const PANEL_W = 150;
const HUD_H = 50;

const CARD_ICONS: Record<string, string> = {
  knight: "⚔️",
  archer: "🏹",
  mage: "✨",
  giant: "🪨",
};

const SPAWN_COOLDOWNS: Record<UnitType, number> = {
  knight: 8,
  archer: 6,
  mage: 10,
  giant: 15,
  goblin: 0,
  orc: 0,
  troll: 0,
  darkKnight: 0,
  dragon: 0,
};

interface CardState {
  level: number;
  cooldownTimer: number;
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3].map((i) => (
        <svg key={i} width={28} height={28} viewBox="0 0 24 24">
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={i <= count ? "#ffd700" : "#333"}
            stroke={i <= count ? "#ffa500" : "#444"}
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}

export default function Game({
  level,
  onMenu,
  onNextLevel,
  onRetry,
}: {
  level: number;
  onMenu: () => void;
  onNextLevel: (stars: number) => void;
  onRetry: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const selectedCardRef = useRef<number | null>(null);

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const canvasW = windowSize.w - PANEL_W;
  const canvasH = windowSize.h - HUD_H;

  const [cardStates, setCardStates] = useState<CardState[]>(PLAYER_CARDS.map(() => ({ level: 1, cooldownTimer: 0 })));
  const cardStatesRef = useRef<CardState[]>(PLAYER_CARDS.map(() => ({ level: 1, cooldownTimer: 0 })));

  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [gold, setGold] = useState(80);
  const [phase, setPhase] = useState<GameState["phase"]>("playing");
  const [waveTimer, setWaveTimer] = useState(8);
  const [wave, setWave] = useState(0);
  const [playerHpFrac, setPlayerHpFrac] = useState(1);
  const [earnedStars, setEarnedStars] = useState(0);

  useEffect(() => {
    function onResize() {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (canvasW > 100 && canvasH > 100) {
      stateRef.current = createInitialState(canvasW, canvasH, level);
      setGold(80);
      setPhase("playing");
      setWave(0);
      setWaveTimer(8);
      setPlayerHpFrac(1);
      setCardStates(PLAYER_CARDS.map(() => ({ level: 1, cooldownTimer: 0 })));
      cardStatesRef.current = PLAYER_CARDS.map(() => ({ level: 1, cooldownTimer: 0 }));
      setSelectedCard(null);
      selectedCardRef.current = null;
    }
  }, [canvasW, canvasH, level]);

  function selectCard(idx: number) {
    const newVal = selectedCardRef.current === idx ? null : idx;
    setSelectedCard(newVal);
    selectedCardRef.current = newVal;
  }

  function deployAtCanvasPos(cx: number, cy: number) {
    const state = stateRef.current;
    const idx = selectedCardRef.current;
    if (!state || state.phase !== "playing" || idx === null) return;
    if (cy < canvasH / 2 || cy < 0) return;

    const card = PLAYER_CARDS[idx];
    const cs = cardStatesRef.current[idx];
    if (cs.cooldownTimer > 0) return;

    const cost = Math.round(card.baseCost * (1 + (cs.level - 1) * 0.5));
    if (state.gold < cost) return;

    const newState = { ...state, gold: state.gold - cost };
    spawnPlayerUnit(newState, card.unitType, cx, cy, cs.level);
    stateRef.current = newState;

    const spawnCD = SPAWN_COOLDOWNS[card.unitType];
    const updatedCards = cardStatesRef.current.map((c, i) =>
      i === idx ? { ...c, cooldownTimer: spawnCD } : c
    );
    cardStatesRef.current = updatedCards;
    setCardStates([...updatedCards]);
    setSelectedCard(null);
    selectedCardRef.current = null;
  }

  const handleHold = useCallback(
    (vx: number, vy: number) => {
      const state = stateRef.current;
      if (!state) return;

      if (state.phase === "won" || state.phase === "lost") return;

      if (vx < PANEL_W) {
        const slotH = (windowSize.h - HUD_H) / PLAYER_CARDS.length;
        const cardIdx = Math.floor((vy - HUD_H) / slotH);
        if (cardIdx >= 0 && cardIdx < PLAYER_CARDS.length) {
          selectCard(cardIdx);
        }
        return;
      }

      const cx = vx - PANEL_W;
      const cy = vy - HUD_H;
      deployAtCanvasPos(cx, cy);
    },
    [windowSize.h]
  );

  const { cursor, holdProgress, handDetected, videoRef, isReady, error } = useHandTracking(
    windowSize.w,
    windowSize.h,
    handleHold
  );

  const cursorCanvas = cursor && cursor.x >= PANEL_W
    ? { x: cursor.x - PANEL_W, y: cursor.y - HUD_H }
    : null;

  const cursorOverCard = cursor && cursor.x < PANEL_W ? cursor : null;
  const hoveredCardIdx = cursorOverCard
    ? Math.floor((cursorOverCard.y - HUD_H) / ((windowSize.h - HUD_H) / PLAYER_CARDS.length))
    : -1;

  useEffect(() => {
    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min((ts - (lastTimeRef.current || ts)) / 1000, 0.1);
      lastTimeRef.current = ts;

      if (state.phase === "playing") {
        const newState = tickGame(state, dt);
        stateRef.current = newState;
        setGold(Math.floor(newState.gold));
        setPhase(newState.phase);
        setWaveTimer(Math.ceil(newState.waveTimer));
        setWave(newState.wave);
        setPlayerHpFrac(newState.playerCastle.hp / newState.playerCastle.maxHp);

        if (newState.phase === "won" || newState.phase === "lost") {
          const stars = computeStars(
            newState.playerCastle.hp / newState.playerCastle.maxHp,
            newState.phase === "won"
          );
          setEarnedStars(stars);

          if (newState.phase === "won") {
            const allStars = loadStars();
            const key = levelKey(level);
            if ((allStars[key] ?? 0) < stars) {
              allStars[key] = stars;
              saveStars(allStars);
            }
          }
        }

        const updatedCards = cardStatesRef.current.map((c) => ({
          ...c,
          cooldownTimer: Math.max(0, c.cooldownTimer - dt),
        }));
        cardStatesRef.current = updatedCards;
        setCardStates([...updatedCards]);
      }

      renderGame(ctx, stateRef.current!, cursorCanvas, videoRef.current, handDetected, holdProgress);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cursorCanvas, handDetected, holdProgress, videoRef]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state) return;

      if (e.key === "n" || e.key === "N") {
        if (state.phase === "won") onNextLevel(earnedStars);
      }
      if (e.key === "r" || e.key === "R") {
        if (state.phase === "lost") onRetry();
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < PLAYER_CARDS.length) selectCard(idx);
      }
      if (e.key === "Escape") {
        setSelectedCard(null);
        selectedCardRef.current = null;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [earnedStars, onNextLevel, onRetry]);

  function handleCanvasClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    deployAtCanvasPos(cx, cy);
  }

  function upgradeCard(index: number) {
    const cs = cardStatesRef.current[index];
    if (cs.level >= 10) return;
    const upgradeCost = 50 * cs.level;
    const state = stateRef.current;
    if (!state || state.gold < upgradeCost) return;
    stateRef.current = { ...state, gold: state.gold - upgradeCost };
    setGold(Math.floor(stateRef.current.gold));
    const updated = cardStatesRef.current.map((c, i) =>
      i === index ? { ...c, level: c.level + 1 } : c
    );
    cardStatesRef.current = updated;
    setCardStates([...updated]);
  }

  const slotH = (windowSize.h - HUD_H) / PLAYER_CARDS.length;
  const CARD_COLORS: Record<string, string> = {
    knight: "#5b8dd9",
    archer: "#6dbf6d",
    mage: "#b87fd9",
    giant: "#d97a3a",
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ fontFamily: "monospace", background: "#000" }}
    >
      {/* Top HUD */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ height: HUD_H, background: "rgba(0,0,0,0.85)", borderBottom: "1px solid #222", zIndex: 20 }}
      >
        <button
          onClick={onMenu}
          className="text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-400 text-xs"
        >
          ← Menu
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-gray-500 text-xs">LEVEL</div>
            <div className="text-yellow-400 font-bold">{level}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">GOLD</div>
            <div className="text-yellow-300 font-bold">⚙ {gold}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">WAVE</div>
            <div className="text-cyan-400 font-bold">{wave}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">NEXT</div>
            <div className="text-red-400 font-bold">{waveTimer}s</div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: handDetected ? "#00ccff" : "#333", boxShadow: handDetected ? "0 0 6px #00ccff" : "none" }}
            />
            <span className="text-xs text-gray-500">
              {!isReady ? (error ? "Cam error" : "Loading...") : handDetected ? "Tracked" : "No hand"}
            </span>
          </div>
        </div>
        <div className="w-16" />
      </div>

      {/* Left card panel */}
      <div
        className="absolute left-0 bottom-0 flex flex-col"
        style={{ top: HUD_H, width: PANEL_W, background: "rgba(0,0,0,0.88)", borderRight: "1px solid #1a1a2a", zIndex: 10 }}
      >
        {PLAYER_CARDS.map((card, i) => {
          const cs = cardStates[i];
          const template = UNIT_TEMPLATES[card.unitType];
          const cost = Math.round(card.baseCost * (1 + (cs.level - 1) * 0.5));
          const upgradeCost = 50 * cs.level;
          const canAfford = gold >= cost;
          const onCooldown = cs.cooldownTimer > 0;
          const cdTotal = SPAWN_COOLDOWNS[card.unitType];
          const cdFrac = cdTotal > 0 ? cs.cooldownTimer / cdTotal : 0;
          const isSelected = selectedCard === i;
          const color = CARD_COLORS[card.unitType];
          const isHovered = hoveredCardIdx === i;

          return (
            <div
              key={card.unitType}
              className="flex flex-col relative"
              style={{ height: slotH, borderBottom: "1px solid #1a1a2a", flexShrink: 0 }}
            >
              {/* Cooldown overlay */}
              {onCooldown && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)", pointerEvents: "none" }}
                >
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">{cs.cooldownTimer.toFixed(1)}s</div>
                    <div
                      className="mt-1 rounded-full overflow-hidden"
                      style={{ width: 60, height: 5, background: "#222" }}
                    >
                      <div
                        style={{ height: "100%", width: `${(1 - cdFrac) * 100}%`, background: color, transition: "width 0.1s linear" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Card main button */}
              <button
                onClick={() => { if (phase === "playing") selectCard(i); }}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-100"
                style={{
                  background: isSelected
                    ? `rgba(${hexRgb(color)},0.25)`
                    : isHovered
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                  border: "none",
                  borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                  cursor: phase === "playing" && !onCooldown ? "pointer" : "default",
                  paddingLeft: 4,
                }}
              >
                <div className="text-2xl">{CARD_ICONS[card.unitType]}</div>
                <div className="text-xs font-bold" style={{ color }}>{template.label}</div>
                <div className="text-xs text-yellow-300">⚙ {cost}</div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.2)" }}
                >
                  Lv {cs.level}
                </div>
                {!canAfford && !onCooldown && (
                  <div className="text-xs" style={{ color: "#cc4444" }}>No gold</div>
                )}
                <div className="text-xs text-gray-600">[{i + 1}]</div>
              </button>

              {/* Upgrade button */}
              <button
                onClick={() => upgradeCard(i)}
                disabled={cs.level >= 10 || gold < upgradeCost}
                className="w-full text-xs py-1 font-bold transition-all duration-100"
                style={{
                  background: cs.level < 10 && gold >= upgradeCost ? "rgba(255,215,0,0.1)" : "rgba(20,20,20,0.5)",
                  color: cs.level < 10 && gold >= upgradeCost ? "#ffd700" : "#333",
                  border: "none",
                  borderTop: "1px solid #1a1a2a",
                  cursor: cs.level < 10 && gold >= upgradeCost ? "pointer" : "not-allowed",
                }}
              >
                {cs.level >= 10 ? "MAX" : `▲ ${upgradeCost}g`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="absolute"
        style={{
          left: PANEL_W,
          top: HUD_H,
          cursor: selectedCard !== null ? "crosshair" : "default",
        }}
        onClick={handleCanvasClick}
      />

      {/* Deploy hint */}
      {selectedCard !== null && phase === "playing" && (
        <div
          className="absolute text-xs font-bold text-white rounded-full px-3 py-1 pointer-events-none"
          style={{
            top: HUD_H + 8,
            left: PANEL_W + 8,
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(100,200,255,0.4)",
          }}
        >
          {UNIT_TEMPLATES[PLAYER_CARDS[selectedCard].unitType].label} — click your side to deploy
        </div>
      )}

      {/* Victory overlay */}
      {phase === "won" && (
        <div className="absolute inset-0 flex items-center justify-center z-30" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div
            className="flex flex-col items-center gap-5 rounded-2xl px-10 py-8"
            style={{ background: "rgba(10,20,10,0.95)", border: "2px solid #c0a855", boxShadow: "0 0 60px rgba(192,168,85,0.3)" }}
          >
            <div className="text-5xl font-black" style={{ color: "#ffd700", textShadow: "0 0 30px rgba(255,215,0,0.5)", fontFamily: "monospace" }}>
              VICTORY!
            </div>
            <div className="text-gray-300 text-sm">Level {level} Complete</div>
            <StarDisplay count={earnedStars} />
            <div className="text-xs text-gray-500 text-center">
              {earnedStars === 3 ? "Perfect! Castle nearly untouched." : earnedStars === 2 ? "Good fight! Castle took some damage." : "Close call! Castle barely survived."}
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => onNextLevel(earnedStars)}
                className="px-8 py-3 text-base font-black rounded-lg uppercase transition-all"
                style={{ background: "#c0a855", color: "#000", fontFamily: "monospace" }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                Next Level →
              </button>
              <button
                onClick={onMenu}
                className="px-6 py-3 text-sm font-bold rounded-lg border transition-all"
                style={{ borderColor: "#444", color: "#aaa", background: "transparent" }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defeat overlay */}
      {phase === "lost" && (
        <div className="absolute inset-0 flex items-center justify-center z-30" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div
            className="flex flex-col items-center gap-5 rounded-2xl px-10 py-8"
            style={{ background: "rgba(20,5,5,0.95)", border: "2px solid #cc4444", boxShadow: "0 0 60px rgba(204,68,68,0.3)" }}
          >
            <div className="text-5xl font-black" style={{ color: "#cc4444", textShadow: "0 0 30px rgba(204,68,68,0.5)", fontFamily: "monospace" }}>
              DEFEATED
            </div>
            <div className="text-gray-300 text-sm">Your castle has fallen on Level {level}</div>
            <StarDisplay count={0} />
            <div className="flex gap-3 mt-2">
              <button
                onClick={onRetry}
                className="px-8 py-3 text-base font-black rounded-lg uppercase transition-all"
                style={{ background: "#cc4444", color: "#fff", fontFamily: "monospace" }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                Retry
              </button>
              <button
                onClick={onMenu}
                className="px-6 py-3 text-sm font-bold rounded-lg border transition-all"
                style={{ borderColor: "#444", color: "#aaa", background: "transparent" }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
