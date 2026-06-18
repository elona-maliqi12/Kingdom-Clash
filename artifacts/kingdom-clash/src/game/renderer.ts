import type { GameState, Unit, Projectile, Castle, FloatingText } from "./types";

const HEALTH_BG = "rgba(0,0,0,0.5)";

function healthColor(frac: number) {
  if (frac > 0.5) return "#44cc44";
  if (frac > 0.25) return "#cccc44";
  return "#cc4444";
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))},${Math.min(255, Math.round(g + (255 - g) * amount))},${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraVideo: HTMLVideoElement | null,
  handDetected: boolean,
  dropPreview: { x: number; y: number } | null
) {
  const { canvasWidth: W, canvasHeight: H } = state;
  const midY = H / 2;

  ctx.clearRect(0, 0, W, H);

  // Enemy territory background
  const topGrad = ctx.createLinearGradient(0, 0, 0, midY);
  topGrad.addColorStop(0, "#0d1f0d");
  topGrad.addColorStop(1, "#1a3a1a");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, midY);

  // Player territory background
  const btmGrad = ctx.createLinearGradient(0, midY, 0, H);
  btmGrad.addColorStop(0, "#0d1a2a");
  btmGrad.addColorStop(1, "#0a1520");
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, midY, W, H - midY);

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 60) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Mid divider
  ctx.strokeStyle = "#c0a855";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 7]);
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200,168,85,0.4)";
  ctx.fillText("ENEMY TERRITORY", W / 2, midY - 8);
  ctx.fillText("YOUR TERRITORY", W / 2, midY + 18);

  // Drop preview
  if (dropPreview) {
    ctx.beginPath();
    ctx.arc(dropPreview.x, dropPreview.y, 32, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(100,200,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(100,200,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Castles
  drawCastle(ctx, state.enemyCastle, "#cc4444", "Enemy Castle");
  drawCastle(ctx, state.playerCastle, "#4488cc", "Your Castle");

  // Projectiles
  for (const proj of state.projectiles) drawProjectile(ctx, proj);

  // Units
  for (const unit of state.units) drawUnit(ctx, unit);

  // Floating texts
  for (const ft of state.floatingTexts) drawFloatingText(ctx, ft);

  // Spawn queue incoming indicator
  if (state.spawnQueue.length > 0) {
    const next = state.spawnQueue[0];
    const timeLeft = Math.max(0, next.delay - state.spawnTimer);
    if (timeLeft < 4) {
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = `rgba(255,80,80,${0.5 + 0.5 * Math.sin(Date.now() / 200)})`;
      ctx.textAlign = "right";
      ctx.fillText(`⚠ Incoming in ${timeLeft.toFixed(1)}s`, W - 12, 30);
    }
  }

  // Camera feed (bottom-right corner)
  if (cameraVideo && cameraVideo.readyState >= 2) {
    const fw = 300, fh = 200;
    const fx = W - fw - 12, fy = H - fh - 12;

    // Rounded clip
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 8);
    ctx.clip();

    // Mirror the feed horizontally
    ctx.translate(fx + fw, fy);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, 0, 0, fw, fh);
    ctx.restore();

    // Border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 8);
    ctx.strokeStyle = handDetected ? "#00ccff" : "#2a2a2a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Status label above feed
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = handDetected ? "#00ccff" : "#444";
    ctx.textAlign = "left";
    ctx.fillText(handDetected ? "✓ HAND TRACKED" : "NO HAND DETECTED", fx + 4, fy - 6);
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, castle: Castle, color: string, label: string) {
  const x = castle.x - castle.width / 2;
  const y = castle.y - castle.height / 2;

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, castle.width, castle.height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = lighten(color, 0.3);
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, castle.width, castle.height);

  // Battlements
  const bCount = 5, bW = castle.width / (bCount * 2 - 1), bH = 14;
  const bY = castle.team === "enemy" ? y - bH : y + castle.height;
  for (let i = 0; i < bCount; i++) {
    ctx.fillStyle = lighten(color, -0.2);
    ctx.fillRect(x + i * bW * 2, bY, bW, bH);
  }

  // Health bar
  const barW = castle.width + 16, barH = 7;
  const barX = castle.x - barW / 2;
  const barY = castle.team === "enemy" ? y + castle.height + 6 : y - barH - 6;
  const frac = castle.hp / castle.maxHp;
  ctx.fillStyle = HEALTH_BG;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = healthColor(frac);
  ctx.fillRect(barX, barY, barW * frac, barH);

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  const labelY = castle.team === "enemy" ? barY + 20 : barY - 4;
  ctx.fillText(label, castle.x, labelY);
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit) {
  ctx.shadowColor = unit.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
  ctx.fillStyle = unit.color;
  ctx.fill();
  ctx.strokeStyle = lighten(unit.color, 0.4);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Enemy marker
  if (unit.team === "enemy") {
    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y - unit.radius - 8);
    ctx.lineTo(unit.x - 4, unit.y - unit.radius - 2);
    ctx.lineTo(unit.x + 4, unit.y - unit.radius - 2);
    ctx.fill();
  }

  // HP bar
  const barW = unit.radius * 2 + 6, barH = 4;
  const barX = unit.x - barW / 2, barY = unit.y - unit.radius - 10;
  const frac = unit.hp / unit.maxHp;
  ctx.fillStyle = HEALTH_BG;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = healthColor(frac);
  ctx.fillRect(barX, barY, barW * frac, barH);

  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(unit.label, unit.x, unit.y + unit.radius + 12);
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.shadowColor = proj.color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, proj.isAoe ? 7 : 5, 0, Math.PI * 2);
  ctx.fillStyle = proj.color;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText) {
  ctx.globalAlpha = ft.life / ft.maxLife;
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = ft.color;
  ctx.textAlign = "center";
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.globalAlpha = 1;
}
