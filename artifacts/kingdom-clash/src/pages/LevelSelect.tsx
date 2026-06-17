import { loadStars, isLevelUnlocked, TOTAL_LEVELS, levelKey } from "../game/stars";

interface Props {
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

function StarDisplay({ count, size = 20 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none">
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

const LEVEL_NAMES = [
  "The First Stand",
  "Goblin Raid",
  "Orc Invasion",
  "Troll March",
  "Dark Advance",
  "Shadow Legion",
  "Knight's Siege",
  "Dragon's Breath",
  "The Last Bastion",
  "Armageddon",
];

const LEVEL_COLORS = [
  "#44aa44",
  "#55bb44",
  "#aaaa22",
  "#cc8833",
  "#cc5522",
  "#cc3333",
  "#993388",
  "#6633bb",
  "#3344cc",
  "#cc2222",
];

export default function LevelSelect({ onSelectLevel, onBack }: Props) {
  const stars = loadStars();

  return (
    <div
      className="flex flex-col items-center min-h-screen py-8 px-4"
      style={{ background: "linear-gradient(180deg, #0a1a0a 0%, #0d1f2d 100%)", fontFamily: "monospace" }}
    >
      <div className="w-full max-w-3xl">
        <div className="flex items-center mb-8 gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded border text-sm transition-colors"
            style={{ borderColor: "#444", color: "#aaa", background: "rgba(0,0,0,0.4)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#888"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#aaa"; }}
          >
            ← Back
          </button>
          <h1
            className="text-4xl font-black tracking-widest"
            style={{ color: "#c0a855", textShadow: "0 0 20px rgba(192,168,85,0.5)" }}
          >
            SELECT LEVEL
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
            const level = i + 1;
            const unlocked = isLevelUnlocked(level, stars);
            const earned = stars[levelKey(level)] ?? 0;
            const color = LEVEL_COLORS[i];

            return (
              <button
                key={level}
                onClick={() => unlocked && onSelectLevel(level)}
                disabled={!unlocked}
                className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200"
                style={{
                  background: unlocked
                    ? `linear-gradient(135deg, rgba(${hexToRgb(color)},0.15), rgba(${hexToRgb(color)},0.05))`
                    : "rgba(20,20,20,0.6)",
                  border: unlocked
                    ? `2px solid ${color}88`
                    : "2px solid #2a2a2a",
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: unlocked ? 1 : 0.45,
                  boxShadow: unlocked && earned > 0 ? `0 0 16px ${color}33` : "none",
                }}
                onMouseEnter={(e) => {
                  if (unlocked) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = `0 0 24px ${color}55`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = unlocked && earned > 0 ? `0 0 16px ${color}33` : "none";
                }}
              >
                <div
                  className="text-3xl font-black"
                  style={{ color: unlocked ? color : "#444" }}
                >
                  {level}
                </div>
                <div
                  className="text-xs text-center leading-tight"
                  style={{ color: unlocked ? "#ccc" : "#444" }}
                >
                  {LEVEL_NAMES[i]}
                </div>
                {unlocked ? (
                  <StarDisplay count={earned} size={16} />
                ) : (
                  <div className="text-xl">🔒</div>
                )}
                {unlocked && earned === 0 && (
                  <div className="text-xs" style={{ color: "#666" }}>Not played</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: "#555" }}>
          Complete a level to unlock the next one · Stars depend on your castle's remaining health
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  if (!hex.startsWith("#")) return "128,128,128";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
