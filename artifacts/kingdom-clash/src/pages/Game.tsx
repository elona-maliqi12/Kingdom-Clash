import { useEffect, useRef, useState, useCallback } from "react";
import { renderGame } from "../game/renderer";
import { createInitialState, tickGame, spawnPlayerUnit, startNextLevel } from "../game/engine";
import { UNIT_TEMPLATES, PLAYER_CARDS } from "../game/units";
import { useHandTracking } from "../hooks/useHandTracking";
import type { GameState, UnitType } from "../game/types";

const CARD_COLORS: Record<string, string> = {
  knight: "#5b8dd9",
  archer: "#6dbf6d",
  mage: "#b87fd9",
  giant: "#d97a3a",
};

const CARD_ICONS: Record<string, string> = {
  knight: "⚔️",
  archer: "🏹",
  mage: "✨",
  giant: "🪨",
};

interface CardLevel {
  level: number;
}

export default function Game({ onMenu }: { onMenu: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [cardLevels, setCardLevels] = useState<CardLevel[]>(PLAYER_CARDS.map(() => ({ level: 1 })));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [gold, setGold] = useState(120);
  const [phase, setPhase] = useState<GameState["phase"]>("playing");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [waveTimer, setWaveTimer] = useState(8);
  const [wave, setWave] = useState(0);
  const [playerHp, setPlayerHp] = useState(1000);
  const [enemyHp, setEnemyHp] = useState(800);
  const [, forceRender] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height - 120) });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (dims.w > 100 && dims.h > 100) {
      const initial = createInitialState(dims.w, dims.h);
      stateRef.current = initial;
      setGold(initial.gold);
      setPhase(initial.phase);
    }
  }, [dims.w, dims.h]);

  const handleHold = useCallback((x: number, y: number) => {
    const state = stateRef.current;
    if (!state) return;

    if (state.phase === "won") {
      stateRef.current = startNextLevel(state);
      setCurrentLevel((l) => l + 1);
      setPhase("playing");
      return;
    }
    if (state.phase === "lost") {
      stateRef.current = createInitialState(state.canvasWidth, state.canvasHeight);
      setPhase("playing");
      setCurrentLevel(1);
      setSelectedCard(null);
      return;
    }

    if (state.phase !== "playing") return;

    const CARD_AREA_HEIGHT = 120;
    const canvasH = dims.h;
    const cardAreaY = canvasH;

    const cardW = Math.min(120, dims.w / 5);
    const totalW = cardW * PLAYER_CARDS.length + (PLAYER_CARDS.length - 1) * 8;
    const startX = (dims.w - totalW) / 2;

    for (let i = 0; i < PLAYER_CARDS.length; i++) {
      const cx = startX + i * (cardW + 8);
      if (x >= cx && x <= cx + cardW && y >= canvasH + 10 && y <= canvasH + 90) {
        if (selectedCard === i) {
          setSelectedCard(null);
        } else {
          setSelectedCard(i);
        }
        return;
      }
    }

    if (selectedCard !== null && y < canvasH && y > canvasH / 2) {
      const card = PLAYER_CARDS[selectedCard];
      const lvl = cardLevels[selectedCard].level;
      const cost = Math.round(card.baseCost * (1 + (lvl - 1) * 0.5));
      if (state.gold >= cost) {
        const newState = { ...state, gold: state.gold - cost };
        spawnPlayerUnit(newState, card.unitType, x, y, lvl);
        stateRef.current = newState;
        setSelectedCard(null);
      }
    }
  }, [selectedCard, cardLevels, dims]);

  const { cursor, holdProgress, handDetected, videoRef, isReady, error } = useHandTracking(
    dims.w,
    dims.h,
    handleHold
  );

  useEffect(() => {
    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = ts;

      if (state.phase === "playing") {
        const newState = tickGame(state, dt);
        stateRef.current = newState;

        setGold(Math.floor(newState.gold));
        setPhase(newState.phase);
        setCurrentLevel(newState.currentLevel);
        setWaveTimer(Math.ceil(newState.waveTimer));
        setWave(newState.wave);
        setPlayerHp(newState.playerCastle.hp);
        setEnemyHp(newState.enemyCastle.hp);
      }

      renderGame(ctx, stateRef.current!, cursor, videoRef.current, handDetected, holdProgress);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cursor, handDetected, holdProgress, videoRef]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state) return;

      if (e.key === "n" || e.key === "N") {
        if (state.phase === "won") {
          stateRef.current = startNextLevel(state);
          setCurrentLevel((l) => l + 1);
          setPhase("playing");
        }
      }
      if (e.key === "r" || e.key === "R") {
        if (state.phase === "lost") {
          stateRef.current = createInitialState(state.canvasWidth, state.canvasHeight);
          setPhase("playing");
          setCurrentLevel(1);
        }
      }

      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < PLAYER_CARDS.length) {
          setSelectedCard((prev) => (prev === idx ? null : idx));
        }
      }

      if (e.key === "Escape") setSelectedCard(null);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function upgradeCard(index: number) {
    const lvl = cardLevels[index].level;
    if (lvl >= 10) return;
    const upgradeCost = 50 * lvl;
    const state = stateRef.current;
    if (!state || state.gold < upgradeCost) return;
    stateRef.current = { ...state, gold: state.gold - upgradeCost };
    setGold(Math.floor(stateRef.current.gold));
    setCardLevels((prev) => {
      const next = [...prev];
      next[index] = { level: lvl + 1 };
      return next;
    });
  }

  function handleCanvasClick(e: React.MouseEvent) {
    const state = stateRef.current;
    if (!state || state.phase !== "playing") return;
    if (selectedCard === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y < dims.h / 2) return;

    const card = PLAYER_CARDS[selectedCard];
    const lvl = cardLevels[selectedCard].level;
    const cost = Math.round(card.baseCost * (1 + (lvl - 1) * 0.5));
    if (state.gold >= cost) {
      const newState = { ...state, gold: state.gold - cost };
      spawnPlayerUnit(newState, card.unitType, x, y, lvl);
      stateRef.current = newState;
      setSelectedCard(null);
    }
  }

  const cardW = Math.min(120, dims.w / 5);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-black overflow-hidden"
      style={{ fontFamily: "monospace" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 text-xs shrink-0"
        style={{ background: "rgba(0,0,0,0.8)", borderBottom: "1px solid #333" }}
      >
        <button
          onClick={onMenu}
          className="text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-400"
        >
          ← Menu
        </button>
        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="text-gray-500 text-xs">LEVEL</div>
            <div className="text-yellow-400 font-bold text-lg">{currentLevel}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">GOLD</div>
            <div className="text-yellow-300 font-bold text-lg">⚙ {gold}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">WAVE</div>
            <div className="text-cyan-400 font-bold text-lg">{wave}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">NEXT WAVE</div>
            <div className="text-red-400 font-bold text-lg">{waveTimer}s</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: handDetected ? "#00ccff" : "#444", boxShadow: handDetected ? "0 0 6px #00ccff" : "none" }}
          />
          <span className="text-gray-400">{isReady ? (handDetected ? "Hand tracked" : "No hand") : error ? "Cam error" : "Loading..."}</span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={dims.w}
          height={dims.h}
          className="block"
          style={{ cursor: selectedCard !== null ? "crosshair" : "default" }}
          onClick={handleCanvasClick}
        />
        {selectedCard !== null && phase === "playing" && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(100,200,255,0.4)" }}
          >
            {UNIT_TEMPLATES[PLAYER_CARDS[selectedCard].unitType].label} selected — click your side or hold two fingers to deploy
          </div>
        )}
      </div>

      <div
        className="shrink-0 flex items-center justify-center gap-2 px-4 py-3"
        style={{ background: "rgba(0,0,0,0.9)", borderTop: "1px solid #333", minHeight: 120 }}
      >
        {PLAYER_CARDS.map((card, i) => {
          const template = UNIT_TEMPLATES[card.unitType];
          const lvl = cardLevels[i].level;
          const cost = Math.round(card.baseCost * (1 + (lvl - 1) * 0.5));
          const upgradeCost = 50 * lvl;
          const canAfford = gold >= cost;
          const canUpgrade = lvl < 10 && gold >= upgradeCost;
          const isSelected = selectedCard === i;
          const color = CARD_COLORS[card.unitType];

          return (
            <div
              key={card.unitType}
              className="flex flex-col items-center gap-1 rounded-lg transition-all duration-150"
              style={{ width: cardW }}
            >
              <button
                onClick={() => {
                  if (phase !== "playing") return;
                  setSelectedCard((prev) => (prev === i ? null : i));
                }}
                className="w-full rounded-lg p-2 flex flex-col items-center gap-1 transition-all duration-150"
                style={{
                  background: isSelected
                    ? `rgba(${hexToRgb(color)}, 0.3)`
                    : canAfford
                    ? "rgba(30,30,40,0.9)"
                    : "rgba(20,20,25,0.7)",
                  border: isSelected
                    ? `2px solid ${color}`
                    : canAfford
                    ? `2px solid ${color}55`
                    : "2px solid #333",
                  boxShadow: isSelected ? `0 0 16px ${color}55` : "none",
                  opacity: canAfford ? 1 : 0.5,
                  minHeight: 70,
                }}
              >
                <div className="text-2xl">{CARD_ICONS[card.unitType]}</div>
                <div className="text-xs font-bold" style={{ color }}>
                  {template.label}
                </div>
                <div className="text-xs text-yellow-300 font-bold">⚙ {cost}</div>
                <div
                  className="text-xs px-1 rounded"
                  style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}
                >
                  Lv {lvl}
                </div>
                <div className="text-xs text-gray-500">[{i + 1}]</div>
              </button>

              <button
                onClick={() => upgradeCard(i)}
                disabled={!canUpgrade}
                className="w-full text-xs py-1 rounded font-bold transition-all duration-150"
                style={{
                  background: canUpgrade ? "rgba(255,215,0,0.15)" : "rgba(30,30,30,0.5)",
                  color: canUpgrade ? "#ffd700" : "#444",
                  border: canUpgrade ? "1px solid rgba(255,215,0,0.4)" : "1px solid #333",
                  cursor: canUpgrade ? "pointer" : "not-allowed",
                }}
              >
                {lvl >= 10 ? "MAX" : `UP ⚙${upgradeCost}`}
              </button>
            </div>
          );
        })}
      </div>

      {phase === "won" && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="flex gap-4 pointer-events-auto" style={{ marginTop: "20%" }}>
            <button
              onClick={() => {
                const state = stateRef.current;
                if (!state) return;
                stateRef.current = startNextLevel(state);
                setCurrentLevel((l) => l + 1);
                setPhase("playing");
              }}
              className="px-8 py-3 text-lg font-black rounded-lg uppercase"
              style={{ background: "#c0a855", color: "#000", boxShadow: "0 0 30px rgba(192,168,85,0.5)" }}
            >
              Next Level →
            </button>
          </div>
        </div>
      )}
      {phase === "lost" && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="flex gap-4 pointer-events-auto" style={{ marginTop: "20%" }}>
            <button
              onClick={() => {
                const state = stateRef.current;
                if (!state) return;
                stateRef.current = createInitialState(state.canvasWidth, state.canvasHeight);
                setPhase("playing");
                setCurrentLevel(1);
                setSelectedCard(null);
                setCardLevels(PLAYER_CARDS.map(() => ({ level: 1 })));
              }}
              className="px-8 py-3 text-lg font-black rounded-lg uppercase"
              style={{ background: "#cc4444", color: "#fff", boxShadow: "0 0 30px rgba(204,68,68,0.5)" }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
