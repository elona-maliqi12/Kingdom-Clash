interface Props {
  onPlay: () => void;
  onHowToPlay: () => void;
}

export default function MainMenu({ onPlay, onHowToPlay }: Props) {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a1a0a 0%, #0d1f2d 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 animate-pulse"
            style={{
              width: Math.random() * 6 + 3,
              height: Math.random() * 6 + 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? "#44aaff" : "#ff8844",
              animationDelay: `${(i * 0.37) % 3}s`,
              animationDuration: `${2 + (i * 0.23) % 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-xl w-full">
        <div>
          <h1
            className="text-7xl font-black tracking-widest leading-none"
            style={{
              fontFamily: "monospace",
              color: "#c0a855",
              textShadow: "0 0 30px rgba(192,168,85,0.6), 0 0 60px rgba(192,168,85,0.3)",
            }}
          >
            KINGDOM
          </h1>
          <h1
            className="text-7xl font-black tracking-widest leading-none"
            style={{
              fontFamily: "monospace",
              color: "#cc4444",
              textShadow: "0 0 30px rgba(204,68,68,0.6), 0 0 60px rgba(204,68,68,0.3)",
            }}
          >
            CLASH
          </h1>
          <div className="text-sm tracking-widest text-gray-400 mt-2 uppercase">
            Hand-Tracked Strategy Battle
          </div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          {[
            { label: "Knight", color: "#5b8dd9" },
            { label: "Archer", color: "#6dbf6d" },
            { label: "Mage", color: "#b87fd9" },
            { label: "Giant", color: "#d97a3a" },
          ].map(({ label, color }) => (
            <div
              key={label}
              className="px-3 py-1 rounded text-xs font-bold border"
              style={{ color, borderColor: color, background: "rgba(0,0,0,0.4)" }}
            >
              {label}
            </div>
          ))}
        </div>

        <p className="text-gray-300 text-sm leading-relaxed max-w-md">
          Deploy troops using hand gestures. Destroy the enemy castle before they destroy yours.
          Survive waves and conquer all 10 levels.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onPlay}
            className="w-full px-8 py-4 text-xl font-black tracking-widest rounded-lg transition-all duration-200 uppercase"
            style={{
              background: "linear-gradient(135deg, #c0a855, #8a7030)",
              color: "#0d1a0d",
              boxShadow: "0 0 30px rgba(192,168,85,0.4)",
              fontFamily: "monospace",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
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
            onClick={onHowToPlay}
            className="w-full px-8 py-3 text-sm font-bold tracking-widest rounded-lg transition-all duration-200 uppercase border"
            style={{
              background: "rgba(0,0,0,0.4)",
              color: "#aaa",
              borderColor: "#444",
              fontFamily: "monospace",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#888";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#444";
              e.currentTarget.style.color = "#aaa";
            }}
          >
            HOW TO PLAY
          </button>
        </div>
      </div>
    </div>
  );
}
