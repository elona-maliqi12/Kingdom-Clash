interface Props { onBack: () => void; }

export default function HowToPlay({ onBack }: Props) {
  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(180deg,#0a1a0a 0%,#0d1f2d 100%)", fontFamily: "monospace" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #1a2a1a" }}>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded text-sm border transition-colors"
          style={{ borderColor: "#333", color: "#888", background: "rgba(0,0,0,0.4)" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#666"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#333"; }}
        >
          ← Back
        </button>
        <h1 className="text-3xl font-black tracking-widest" style={{ color: "#c0a855", textShadow: "0 0 16px rgba(192,168,85,0.4)" }}>
          HOW TO PLAY
        </h1>
      </div>

      {/* Content grid — two columns */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-5 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Block color="#00ccff" title="Hand Controls">
            <Row icon="☝️" label="Point" desc="Extend your index finger — the cursor follows your fingertip across the entire screen." />
            <Row icon="🤏" label="Pinch" desc="Bring your thumb and index fingertip together over a card to pick it up." />
            <Row icon="👋" label="Release" desc="Open your fingers to release and deploy the card. The unit lands where your finger is." />
          </Block>

          <Block color="#6dbf6d" title="Deploying Units">
            <Row icon="🃏" label="Pick up a card" desc="Pinch over one of the 4 cards in the bottom-left." />
            <Row icon="📍" label="Drag to your side" desc="Move your pinched hand to the bottom half (your territory)." />
            <Row icon="💧" label="Mana cost" desc="Each unit has a mana cost shown on its card. Mana fills automatically every second (max 10)." />
          </Block>

          <Block color="#ffd700" title="Mana System">
            <Row icon="🔵" label="Auto-fills" desc="Mana regenerates at 1.2 per second up to a maximum of 10." />
            <Row icon="📊" label="Costs" desc="Archer 2 · Knight 3 · Mage 4 · Giant 5" />
          </Block>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Block color="#c0a855" title="Battlefield">
            <Row icon="🏰" label="Enemy Castle" desc="Top of the screen. Destroy it to win." />
            <Row icon="🛡️" label="Your Castle" desc="Bottom of the screen. Protect it or you lose." />
            <Row icon="⚔️" label="No borders" desc="Enemy units march through your territory and will attack your castle." />
          </Block>

          <Block color="#cc4444" title="Waves & Winning">
            <Row icon="🌊" label="One wave per level" desc="All enemies spawn in a single timed wave at the start of each level." />
            <Row icon="✅" label="Victory" desc="Destroy the enemy castle, or defeat every enemy unit in the wave." />
            <Row icon="💀" label="Defeat" desc="Your castle's HP reaches zero." />
          </Block>

          <Block color="#b87fd9" title="Star Rating">
            <div className="flex flex-col gap-2 pt-1">
              {[
                { n: 3, label: "Castle HP > 66%",   color: "#44cc44" },
                { n: 2, label: "Castle HP 33–66%",  color: "#cccc44" },
                { n: 1, label: "Castle HP 1–33%",   color: "#cc7733" },
                { n: 0, label: "Castle destroyed",  color: "#cc3333" },
              ].map(({ n, label, color }) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="flex gap-0.5 shrink-0">
                    {[1,2,3].map(i => (
                      <svg key={i} width={14} height={14} viewBox="0 0 24 24">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                          fill={i<=n?"#ffd700":"#333"} stroke={i<=n?"#ffa500":"#444"} strokeWidth="1" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block color="#888" title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-400">
              {[["1–4", "Select card"], ["Click", "Deploy unit"], ["Esc", "Cancel"], ["N", "Next level"], ["R", "Retry"]].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background:"#1a1a1a", border:"1px solid #333", color:"#bbb" }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}28`, background: "rgba(0,0,0,0.3)" }}>
      <div className="px-3 py-1.5 text-xs font-bold tracking-widest" style={{ background: `${color}18`, color }}>
        {title}
      </div>
      <div className="px-3 py-2 flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0 leading-tight">{icon}</span>
      <div className="leading-snug">
        <span className="text-xs font-bold text-white">{label} — </span>
        <span className="text-xs text-gray-400">{desc}</span>
      </div>
    </div>
  );
}
