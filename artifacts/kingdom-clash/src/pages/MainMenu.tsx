import { useState } from "react";

interface Props {
  onPlay: () => void;
}

export default function MainMenu({ onPlay }: Props) {
  const [showHow, setShowHow] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a1a0a 0%, #0d1f2d 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 animate-pulse"
            style={{
              width: Math.random() * 6 + 3,
              height: Math.random() * 6 + 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? "#44aaff" : "#ff8844",
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-xl w-full">
        <div className="relative">
          <h1
            className="text-7xl font-black tracking-widest"
            style={{
              fontFamily: "monospace",
              color: "#c0a855",
              textShadow: "0 0 30px rgba(192,168,85,0.6), 0 0 60px rgba(192,168,85,0.3)",
            }}
          >
            KINGDOM
          </h1>
          <h1
            className="text-7xl font-black tracking-widest"
            style={{
              fontFamily: "monospace",
              color: "#cc4444",
              textShadow: "0 0 30px rgba(204,68,68,0.6), 0 0 60px rgba(204,68,68,0.3)",
            }}
          >
            CLASH
          </h1>
          <div className="text-sm tracking-widest text-gray-400 mt-1 uppercase">
            Hand-Tracked Strategy Battle
          </div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          {["Knight", "Archer", "Mage", "Giant"].map((u, i) => (
            <div
              key={u}
              className="px-3 py-1 rounded text-xs font-bold border"
              style={{
                color: ["#5b8dd9", "#6dbf6d", "#b87fd9", "#d97a3a"][i],
                borderColor: ["#5b8dd9", "#6dbf6d", "#b87fd9", "#d97a3a"][i],
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {u}
            </div>
          ))}
        </div>

        <p className="text-gray-300 text-sm leading-relaxed max-w-md">
          Deploy troops using hand gestures. Destroy the enemy castle before they destroy yours.
          Upgrade your units and survive increasingly difficult waves.
        </p>

        <button
          onClick={onPlay}
          className="px-12 py-4 text-xl font-black tracking-widest rounded-lg transition-all duration-200 uppercase"
          style={{
            background: "linear-gradient(135deg, #c0a855, #8a7030)",
            color: "#0d1a0d",
            boxShadow: "0 0 30px rgba(192,168,85,0.4)",
            fontFamily: "monospace",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 0 50px rgba(192,168,85,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(192,168,85,0.4)";
          }}
        >
          PLAY
        </button>

        <button
          onClick={() => setShowHow(!showHow)}
          className="text-gray-400 text-sm underline hover:text-gray-200 transition-colors"
        >
          {showHow ? "Hide" : "How to Play"}
        </button>

        {showHow && (
          <div
            className="w-full rounded-lg p-5 text-left text-sm space-y-3 border"
            style={{
              background: "rgba(0,0,0,0.5)",
              borderColor: "rgba(192,168,85,0.3)",
              color: "#cccccc",
              fontFamily: "monospace",
            }}
          >
            <div className="font-bold text-yellow-400 text-base mb-2">Controls</div>
            <div className="flex items-start gap-3">
              <div className="text-cyan-400 font-bold shrink-0">POINT</div>
              <div>Move your index finger to control the on-screen cursor</div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-cyan-400 font-bold shrink-0">HOLD</div>
              <div>Pinch index + middle finger together and hold ~0.6s to select/deploy</div>
            </div>
            <div className="font-bold text-yellow-400 text-base mt-3 mb-2">Gameplay</div>
            <div>1. Allow camera access when prompted</div>
            <div>2. Hover your cursor over a card at the bottom to select it</div>
            <div>3. Move to <span className="text-blue-400">your side</span> (bottom half) and hold to place the unit</div>
            <div>4. Units auto-fight enemies and march toward the enemy castle</div>
            <div>5. Upgrade cards with the UP button beneath each card</div>
            <div>6. Destroy the enemy castle to advance to the next level</div>

            <div className="text-gray-500 text-xs pt-2">
              Keyboard shortcuts: 1-4 select cards, Space to place, N=next level, R=retry
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
