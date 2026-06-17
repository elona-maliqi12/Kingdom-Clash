import { useEffect, useRef, useState, useCallback } from "react";
import { renderGame } from "../game/renderer";
import { createInitialState, tickGame, spawnPlayerUnit } from "../game/engine";
import { UNIT_TEMPLATES, PLAYER_CARDS } from "../game/units";
import { useHandTracking } from "../hooks/useHandTracking";
import { loadStars, saveStars, computeStars, levelKey } from "../game/stars";
import type { GameState, PlayerCard } from "../game/types";

const HUD_H = 50;
const CARD_W = 72;
const CARD_H = 100;
const CARD_GAP = 8;
const CARD_MARGIN_X = 16;
const MANA_H = 36;

const CARD_COLORS: Record<string, string> = {
  knight: "#5b8dd9",
  archer: "#6dbf6d",
  mage: "#b87fd9",
  giant: "#d97a3a",
};

function getCardRect(i: number, windowH: number) {
  const cardBottom = windowH - MANA_H - 8;
  return {
    x: CARD_MARGIN_X + i * (CARD_W + CARD_GAP),
    y: cardBottom - CARD_H,
    w: CARD_W,
    h: CARD_H,
  };
}

function cardIndexAtPos(vx: number, vy: number, windowH: number): number | null {
  for (let i = 0; i < PLAYER_CARDS.length; i++) {
    const r = getCardRect(i, windowH);
    if (vx >= r.x && vx <= r.x + r.w && vy >= r.y && vy <= r.y + r.h) return i;
  }
  return null;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {[1, 2, 3].map(i => (
        <svg key={i} width={30} height={30} viewBox="0 0 24 24">
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={i <= count ? "#ffd700" : "#2a2a2a"}
            stroke={i <= count ? "#ffa500" : "#333"}
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

  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const canvasW = winSize.w;
  const canvasH = winSize.h - HUD_H;

  const [mana, setMana] = useState(5);
  const [maxMana] = useState(10);
  const [phase, setPhase] = useState<GameState["phase"]>("playing");
  const [earnedStars, setEarnedStars] = useState(0);
  const [playerHpFrac, setPlayerHpFrac] = useState(1);

  // Drag state
  const [draggedCard, setDraggedCard] = useState<PlayerCard | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const draggedCardRef = useRef<PlayerCard | null>(null);

  // cursor state for overlay
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (canvasW > 100 && canvasH > 100) {
      stateRef.current = createInitialState(canvasW, canvasH, level);
      setMana(5);
      setPhase("playing");
      setPlayerHpFrac(1);
      setEarnedStars(0);
      setDraggedCard(null);
      draggedCardRef.current = null;
    }
  }, [canvasW, canvasH, level]);

  function tryDeploy(vx: number, vy: number, card: PlayerCard) {
    const state = stateRef.current;
    if (!state || state.phase !== "playing") return;

    // Convert to canvas coords
    const cx = vx;
    const cy = vy - HUD_H;

    // Must be in player's half
    if (cy < canvasH / 2 || cy > canvasH) return;

    if (state.mana < card.manaCost) return;

    const newState = { ...state, mana: state.mana - card.manaCost };
    spawnPlayerUnit(newState, card.unitType, cx, cy);
    stateRef.current = newState;
    setMana(Math.floor(newState.mana * 10) / 10);
  }

  const onPinchStart = useCallback((vx: number, vy: number) => {
    const idx = cardIndexAtPos(vx, vy, winSize.h);
    if (idx !== null) {
      const card = PLAYER_CARDS[idx];
      setDraggedCard(card);
      draggedCardRef.current = card;
      setDragPos({ x: vx, y: vy });
    }
    setIsPinching(true);
  }, [winSize.h]);

  const onPinchEnd = useCallback((vx: number, vy: number) => {
    const card = draggedCardRef.current;
    if (card) {
      tryDeploy(vx, vy, card);
    }
    setDraggedCard(null);
    draggedCardRef.current = null;
    setDragPos(null);
    setIsPinching(false);
  }, []);

  const { cursor, isPinching: handPinching, handDetected, videoRef, isReady, error } =
    useHandTracking(winSize.w, winSize.h, onPinchStart, onPinchEnd);

  // Keep cursor and drag pos in sync
  useEffect(() => {
    if (cursor) {
      setCursorPos(cursor);
      if (draggedCardRef.current) setDragPos(cursor);
      // Hover detection over cards
      const idx = cardIndexAtPos(cursor.x, cursor.y, winSize.h);
      setHoveredCardIdx(idx);
    } else {
      setCursorPos(null);
      setHoveredCardIdx(null);
    }
  }, [cursor, winSize.h]);

  // Drop preview: when dragging a card, show where it would land
  const dropPreviewInCanvas =
    dragPos && dragPos.y - HUD_H > canvasH / 2 && dragPos.y - HUD_H < canvasH
      ? { x: dragPos.x, y: dragPos.y - HUD_H }
      : null;

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
        const ns = tickGame(state, dt);
        stateRef.current = ns;
        setMana(ns.mana);
        setPhase(ns.phase);
        setPlayerHpFrac(ns.playerCastle.hp / ns.playerCastle.maxHp);

        if ((ns.phase === "won" || ns.phase === "lost") && state.phase === "playing") {
          const stars = computeStars(ns.playerCastle.hp / ns.playerCastle.maxHp, ns.phase === "won");
          setEarnedStars(stars);
          if (ns.phase === "won") {
            const all = loadStars();
            const k = levelKey(level);
            if ((all[k] ?? 0) < stars) { all[k] = stars; saveStars(all); }
          }
        }
      }

      renderGame(ctx, stateRef.current!, videoRef.current, handDetected, dropPreviewInCanvas);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [handDetected, videoRef, dropPreviewInCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    let selectedKeyCard: number | null = null;
    function onKey(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state) return;
      if (e.key === "n" || e.key === "N") { if (state.phase === "won") onNextLevel(earnedStars); }
      if (e.key === "r" || e.key === "R") { if (state.phase === "lost") onRetry(); }
      if (["1","2","3","4"].includes(e.key)) selectedKeyCard = parseInt(e.key) - 1;
      if (e.key === "Escape") selectedKeyCard = null;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [earnedStars, onNextLevel, onRetry]);

  // Mouse click for card pick-and-place
  const [mouseCard, setMouseCard] = useState<PlayerCard | null>(null);
  const mouseCardRef = useRef<PlayerCard | null>(null);

  function onCanvasClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current || stateRef.current.phase !== "playing") return;
    if (mouseCardRef.current) {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (cy > canvasH / 2) {
        tryDeploy(cx, cy + HUD_H, mouseCardRef.current);
        setMouseCard(null);
        mouseCardRef.current = null;
      }
    }
  }

  function onCardClick(card: PlayerCard) {
    if (phase !== "playing") return;
    if (mouseCardRef.current?.unitType === card.unitType) {
      setMouseCard(null);
      mouseCardRef.current = null;
    } else {
      setMouseCard(card);
      mouseCardRef.current = card;
    }
  }

  const manaInt = Math.floor(mana);
  const manaFrac = mana - manaInt;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" style={{ fontFamily: "monospace" }}>
      {/* HUD */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ height: HUD_H, background: "rgba(0,0,0,0.88)", borderBottom: "1px solid #111", zIndex: 20 }}
      >
        <button
          onClick={onMenu}
          className="text-gray-500 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-gray-800 hover:border-gray-600"
        >
          ← Menu
        </button>
        <div className="text-yellow-400 font-bold text-sm tracking-widest">LEVEL {level}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full" style={{ background: handDetected ? "#00ccff" : "#222", boxShadow: handDetected ? "0 0 6px #00ccff" : "none" }} />
          {!isReady ? (error ? "⚠ Cam error" : "Loading…") : handDetected ? "Tracked" : "No hand"}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="absolute"
        style={{ top: HUD_H, left: 0, cursor: mouseCard ? "crosshair" : "default" }}
        onClick={onCanvasClick}
      />

      {/* Mana bar */}
      <div
        className="absolute flex items-center gap-1.5 px-3"
        style={{
          bottom: MANA_H + CARD_H + 10,
          left: CARD_MARGIN_X,
          height: 24,
          zIndex: 15,
        }}
      >
        {Array.from({ length: maxMana }, (_, i) => {
          const filled = i < manaInt;
          const partial = i === manaInt;
          return (
            <div
              key={i}
              title={filled ? "Full mana" : "Empty"}
              style={{
                width: 14, height: 14,
                clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                background: filled
                  ? "linear-gradient(135deg,#66ccff,#3399dd)"
                  : partial
                  ? `linear-gradient(135deg,#66ccff ${Math.round(manaFrac * 100)}%,#1a2a3a ${Math.round(manaFrac * 100)}%)`
                  : "#1a2a3a",
                boxShadow: filled ? "0 0 6px rgba(100,200,255,0.6)" : "none",
                transition: "background 0.3s",
              }}
            />
          );
        })}
        <span className="text-xs text-blue-300 font-bold ml-1">{Math.floor(mana)}/{maxMana}</span>
      </div>

      {/* Cards (bottom-left, real card design) */}
      {PLAYER_CARDS.map((card, i) => {
        const rect = getCardRect(i, winSize.h);
        const color = CARD_COLORS[card.unitType];
        const canAfford = mana >= card.manaCost;
        const isSelected = mouseCard?.unitType === card.unitType;
        const isDragging = draggedCard?.unitType === card.unitType;
        const isHovered = hoveredCardIdx === i;

        return (
          <div
            key={card.unitType}
            onClick={() => onCardClick(card)}
            className="absolute rounded-xl flex flex-col items-center justify-between select-none transition-all duration-100"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              zIndex: 15,
              cursor: "pointer",
              opacity: isDragging ? 0.3 : canAfford ? 1 : 0.45,
              transform: isSelected || isHovered
                ? "translateY(-6px) scale(1.04)"
                : "none",
              background: isDragging
                ? "rgba(20,20,30,0.3)"
                : `linear-gradient(160deg, rgba(${hexRgb(color)},0.18) 0%, rgba(10,12,20,0.95) 100%)`,
              border: isSelected
                ? `2px solid ${color}`
                : `1px solid ${color}55`,
              boxShadow: isSelected
                ? `0 0 20px ${color}66, inset 0 0 20px rgba(0,0,0,0.5)`
                : `0 4px 16px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.4)`,
              padding: "8px 6px 6px",
            }}
          >
            {/* Card top ornament */}
            <div className="w-full flex justify-between items-start px-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.6 }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.6 }} />
            </div>

            {/* Unit icon */}
            <div className="text-3xl leading-none select-none" style={{ filter: isDragging ? "grayscale(1)" : "none" }}>
              {card.icon}
            </div>

            {/* Mana cost */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: canAfford ? "rgba(30,80,120,0.7)" : "rgba(30,30,30,0.7)",
                border: `1px solid ${canAfford ? "#4499cc55" : "#33333355"}`,
              }}
            >
              <div
                style={{
                  width: 8, height: 8,
                  clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                  background: canAfford ? "#66ccff" : "#444",
                }}
              />
              <span className="text-xs font-bold" style={{ color: canAfford ? "#99ddff" : "#555" }}>
                {card.manaCost}
              </span>
            </div>
          </div>
        );
      })}

      {/* Dragged card ghost */}
      {draggedCard && dragPos && (
        <div
          className="pointer-events-none fixed flex items-center justify-center rounded-xl"
          style={{
            left: dragPos.x - CARD_W / 2,
            top: dragPos.y - CARD_H / 2,
            width: CARD_W,
            height: CARD_H,
            zIndex: 50,
            background: `linear-gradient(160deg, rgba(${hexRgb(CARD_COLORS[draggedCard.unitType])},0.25) 0%, rgba(10,12,20,0.9) 100%)`,
            border: `2px solid ${CARD_COLORS[draggedCard.unitType]}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${CARD_COLORS[draggedCard.unitType]}66`,
            transform: "scale(1.08)",
          }}
        >
          <div className="text-4xl">{draggedCard.icon}</div>
        </div>
      )}

      {/* Cursor overlay — shows over everything */}
      {cursorPos && (
        <div
          className="pointer-events-none fixed"
          style={{
            left: cursorPos.x - 12,
            top: cursorPos.y - 12,
            width: 24,
            height: 24,
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: handPinching ? "none" : "2px solid rgba(0,200,255,0.9)",
              background: handPinching ? "rgba(0,200,255,0.5)" : "rgba(0,200,255,0.08)",
              boxShadow: handPinching ? "0 0 12px rgba(0,200,255,0.8)" : "0 0 6px rgba(0,200,255,0.3)",
              transition: "all 0.08s ease",
            }}
          />
          {/* crosshair lines */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: handPinching ? "transparent" : "rgba(0,200,255,0.6)", transform: "translateY(-50%)" }} />
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: handPinching ? "transparent" : "rgba(0,200,255,0.6)", transform: "translateX(-50%)" }} />
        </div>
      )}

      {/* "Deploy here" hint when card selected by mouse */}
      {mouseCard && phase === "playing" && (
        <div
          className="absolute text-xs font-bold text-white rounded-full px-3 py-1 pointer-events-none"
          style={{ top: HUD_H + 8, left: 8, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(100,200,255,0.3)", zIndex: 20 }}
        >
          {UNIT_TEMPLATES[mouseCard.unitType].label} — click your half to deploy
        </div>
      )}

      {/* Victory */}
      {phase === "won" && (
        <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="flex flex-col items-center gap-5 rounded-2xl px-10 py-8" style={{ background: "rgba(8,18,8,0.97)", border: "2px solid #c0a855", boxShadow: "0 0 60px rgba(192,168,85,0.35)" }}>
            <div className="text-5xl font-black" style={{ color: "#ffd700", textShadow: "0 0 30px rgba(255,215,0,0.5)" }}>VICTORY!</div>
            <div className="text-gray-400 text-sm">Level {level} complete</div>
            <Stars count={earnedStars} />
            <div className="text-xs text-gray-500 text-center">
              {earnedStars === 3 ? "Perfect! Castle untouched." : earnedStars === 2 ? "Solid. Castle held strong." : "Barely survived!"}
            </div>
            <div className="flex gap-3">
              <button onClick={() => onNextLevel(earnedStars)} className="px-7 py-2.5 font-black text-sm rounded-lg uppercase transition-all" style={{ background: "#c0a855", color: "#000" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                Next Level →
              </button>
              <button onClick={onMenu} className="px-5 py-2.5 text-xs font-bold rounded-lg border" style={{ borderColor: "#333", color: "#888", background: "transparent" }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* Defeat */}
      {phase === "lost" && (
        <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="flex flex-col items-center gap-5 rounded-2xl px-10 py-8" style={{ background: "rgba(18,5,5,0.97)", border: "2px solid #cc4444", boxShadow: "0 0 60px rgba(204,68,68,0.35)" }}>
            <div className="text-5xl font-black" style={{ color: "#cc4444", textShadow: "0 0 30px rgba(204,68,68,0.5)" }}>DEFEATED</div>
            <div className="text-gray-400 text-sm">Your castle fell on Level {level}</div>
            <Stars count={0} />
            <div className="flex gap-3">
              <button onClick={onRetry} className="px-7 py-2.5 font-black text-sm rounded-lg uppercase transition-all" style={{ background: "#cc4444", color: "#fff" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                Retry
              </button>
              <button onClick={onMenu} className="px-5 py-2.5 text-xs font-bold rounded-lg border" style={{ borderColor: "#333", color: "#888", background: "transparent" }}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hexRgb(hex: string): string {
  if (!hex.startsWith("#") || hex.length < 7) return "128,128,128";
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}
