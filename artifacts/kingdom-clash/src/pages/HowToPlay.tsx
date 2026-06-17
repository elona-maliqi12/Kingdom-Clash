interface Props {
  onBack: () => void;
}

export default function HowToPlay({ onBack }: Props) {
  return (
    <div
      className="flex flex-col items-center min-h-screen py-8 px-4"
      style={{ background: "linear-gradient(180deg, #0a1a0a 0%, #0d1f2d 100%)", fontFamily: "monospace" }}
    >
      <div className="w-full max-w-2xl">
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
          <h1 className="text-4xl font-black tracking-widest" style={{ color: "#c0a855", textShadow: "0 0 20px rgba(192,168,85,0.5)" }}>
            HOW TO PLAY
          </h1>
        </div>

        <div className="space-y-6">
          <Section title="Hand Tracking Controls" color="#00ccff">
            <Row icon="☝️" title="Point Finger" desc="Extend your index finger to move the on-screen cursor across the battlefield." />
            <Row icon="🤏" title="Two-Finger Hold" desc="Bring your index and middle fingertips close together and hold for ~0.6 seconds to confirm a selection or deploy a unit." />
            <Row icon="📷" title="Camera Feed" desc="Your live camera appears in the bottom-right of the battlefield so you can see what the tracker sees." />
          </Section>

          <Section title="Battlefield" color="#c0a855">
            <Row icon="🏰" title="Enemy Castle (top)" desc="The enemy's fortress. Reduce its HP to zero to win the level." />
            <Row icon="🛡️" title="Your Castle (bottom)" desc="Your fortress. If it falls, you lose. Remaining HP determines your star rating." />
            <Row icon="⚔️" title="No Borders" desc="Enemy units will cross into your territory and attack your castle — you must stop them!" />
          </Section>

          <Section title="Deploying Units" color="#6dbf6d">
            <Row icon="🃏" title="Card Panel" desc="Your unit cards appear on the left side of the screen. Each card shows the unit type, cost, level, and spawn cooldown." />
            <Row icon="1️⃣" title="Select a Card" desc="Hover your cursor over a card and use a two-finger hold to select it (or press 1–4 on keyboard)." />
            <Row icon="📍" title="Place the Unit" desc="After selecting, move your cursor to the BOTTOM half of the battlefield, then two-finger hold to deploy. (Or click with mouse.)" />
            <Row icon="⏱️" title="Spawn Cooldown" desc="Each card has a cooldown after deployment — the card fills back up before you can use it again." />
          </Section>

          <Section title="Economy" color="#ffd700">
            <Row icon="💰" title="Gold from Kills" desc="Gold is earned only by defeating enemy units — the stronger the enemy, the more gold they drop." />
            <Row icon="⬆️" title="Upgrade Cards" desc="Spend gold on the UP button below each card to raise it to the next level (max 10). Higher levels mean more HP and damage." />
          </Section>

          <Section title="Star Rating" color="#ffd700">
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #333" }}
            >
              {[
                { stars: 3, label: "Castle HP > 66%", color: "#44cc44" },
                { stars: 2, label: "Castle HP 33–66%", color: "#cccc44" },
                { stars: 1, label: "Castle HP 1–33%", color: "#cc7733" },
                { stars: 0, label: "Castle destroyed (loss)", color: "#cc3333" },
              ].map(({ stars, label, color }) => (
                <div key={stars} className="flex items-center gap-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <svg key={i} width={18} height={18} viewBox="0 0 24 24">
                        <polygon
                          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                          fill={i <= stars ? "#ffd700" : "#333"}
                          stroke={i <= stars ? "#ffa500" : "#444"}
                          strokeWidth="1"
                        />
                      </svg>
                    ))}
                  </div>
                  <div className="text-sm" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Units" color="#b87fd9">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "⚔️", name: "Knight", color: "#5b8dd9", desc: "Melee bruiser with high HP" },
                { icon: "🏹", name: "Archer", color: "#6dbf6d", desc: "Ranged attacker, fast" },
                { icon: "✨", name: "Mage", color: "#b87fd9", desc: "AOE ranged damage" },
                { icon: "🪨", name: "Giant", color: "#d97a3a", desc: "Massive tank, slow but deadly" },
              ].map(({ icon, name, color, desc }) => (
                <div
                  key={name}
                  className="flex items-start gap-2 rounded-lg p-3"
                  style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}44` }}
                >
                  <div className="text-xl shrink-0">{icon}</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color }}>{name}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Keyboard Shortcuts" color="#888">
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              {[
                ["1–4", "Select card"],
                ["Click / Space", "Deploy selected unit"],
                ["Esc", "Deselect card"],
                ["N", "Next level (after win)"],
                ["R", "Retry (after loss)"],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ background: "#222", border: "1px solid #444", color: "#ccc", fontFamily: "monospace" }}
                  >
                    {key}
                  </span>
                  <span className="text-xs text-gray-400">{action}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}33` }}>
      <div
        className="px-4 py-2 text-sm font-bold tracking-widest"
        style={{ background: `linear-gradient(90deg, ${color}22, transparent)`, color }}
      >
        {title}
      </div>
      <div className="px-4 py-3 space-y-3" style={{ background: "rgba(0,0,0,0.35)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-gray-400 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
