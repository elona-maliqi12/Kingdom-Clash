import type { GameState, Unit, Projectile, Castle, FloatingText } from "./types";

const GROUND_TOP_COLOR = "#1a3a1a";
const GROUND_BTM_COLOR = "#1a2a3a";
const MIDLINE_COLOR = "#c0a855";
const CASTLE_PLAYER = "#4488cc";
const CASTLE_ENEMY = "#cc4444";
const HEALTH_BG = "rgba(0,0,0,0.5)";
const HEALTH_GREEN = "#44cc44";
const HEALTH_YELLOW = "#cccc44";
const HEALTH_RED = "#cc4444";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function healthColor(frac: number) {
  if (frac > 0.5) return HEALTH_GREEN;
  if (frac > 0.25) return HEALTH_YELLOW;
  return HEALTH_RED;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cursor: { x: number; y: number } | null,
  cameraVideo: HTMLVideoElement | null,
  handDetected: boolean,
  holdProgress: number
) {
  const { canvasWidth: W, canvasHeight: H } = state;
  const midY = H / 2;

  ctx.clearRect(0, 0, W, H);

  const topGrad = ctx.createLinearGradient(0, 0, 0, midY);
  topGrad.addColorStop(0, "#0d1f0d");
  topGrad.addColorStop(1, "#1a3a1a");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, midY);

  const btmGrad = ctx.createLinearGradient(0, midY, 0, H);
  btmGrad.addColorStop(0, "#0d1a2a");
  btmGrad.addColorStop(1, "#1a2a3a");
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, midY, W, H - midY);

  for (let gx = 0; gx < W; gx += 60) {
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  ctx.strokeStyle = MIDLINE_COLOR;
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 8]);
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(W, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "rgba(200,168,85,0.5)";
  ctx.textAlign = "center";
  ctx.fillText("— ENEMY TERRITORY —", W / 2, midY - 10);
  ctx.fillText("— YOUR TERRITORY —", W / 2, midY + 22);

  drawCastle(ctx, state.enemyCastle, CASTLE_ENEMY, "Enemy Castle");
  drawCastle(ctx, state.playerCastle, CASTLE_PLAYER, "Your Castle");

  for (const proj of state.projectiles) {
    drawProjectile(ctx, proj);
  }

  for (const unit of state.units) {
    drawUnit(ctx, unit);
  }

  for (const ft of state.floatingTexts) {
    drawFloatingText(ctx, ft);
  }

  if (cursor) {
    drawCursor(ctx, cursor, holdProgress, handDetected);
    if (state.pendingPlacement && state.selectedCardIndex !== null) {
      const halfH = H / 2;
      if (cursor.y > halfH) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(100,200,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.15)";
        ctx.fill();
      }
    }
  }

  if (cameraVideo && cameraVideo.readyState >= 2) {
    drawCameraFeed(ctx, cameraVideo, W, H, handDetected);
  }

  if (state.phase !== "playing") {
    drawOverlay(ctx, state, W, H);
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, castle: Castle, color: string, label: string) {
  const x = castle.x - castle.width / 2;
  const y = castle.y - castle.height / 2;

  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, castle.width, castle.height);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = lighten(color, 0.3);
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, castle.width, castle.height);

  const battlementH = 16;
  const bCount = 5;
  const bWidth = castle.width / (bCount * 2 - 1);
  const bY = castle.team === "enemy" ? y - battlementH : y + castle.height;
  for (let i = 0; i < bCount; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * bWidth * 2, bY, bWidth, battlementH);
  }

  const barW = castle.width + 20;
  const barH = 8;
  const barX = castle.x - barW / 2;
  const barY = castle.team === "enemy" ? y + castle.height + 6 : y - barH - 6;
  const frac = castle.hp / castle.maxHp;

  ctx.fillStyle = HEALTH_BG;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = healthColor(frac);
  ctx.fillRect(barX, barY, barW * frac, barH);

  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(label, castle.x, barY + (castle.team === "enemy" ? 24 : -4));
  ctx.fillText(`${castle.hp}/${castle.maxHp}`, castle.x, castle.team === "enemy" ? barY + 36 : barY - 16);
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${nr},${ng},${nb})`;
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

  if (unit.team === "enemy") {
    ctx.fillStyle = "#ff3333";
    const sz = 6;
    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y - unit.radius - sz - 2);
    ctx.lineTo(unit.x - sz / 2, unit.y - unit.radius - 2);
    ctx.lineTo(unit.x + sz / 2, unit.y - unit.radius - 2);
    ctx.fill();
  }

  const barW = unit.radius * 2 + 8;
  const barH = 5;
  const barX = unit.x - barW / 2;
  const barY = unit.y - unit.radius - 12;
  const frac = unit.hp / unit.maxHp;

  ctx.fillStyle = HEALTH_BG;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = healthColor(frac);
  ctx.fillRect(barX, barY, barW * frac, barH);

  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(unit.label, unit.x, unit.y + unit.radius + 14);

  if (unit.level > 1) {
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`Lv${unit.level}`, unit.x, unit.y + 4);
  }
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
  const alpha = ft.life / ft.maxLife;
  ctx.globalAlpha = alpha;
  ctx.font = "bold 15px monospace";
  ctx.fillStyle = ft.color;
  ctx.textAlign = "center";
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.globalAlpha = 1;
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  cursor: { x: number; y: number },
  holdProgress: number,
  handDetected: boolean
) {
  const { x, y } = cursor;
  const r = 18;

  ctx.shadowColor = "#00ccff";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = handDetected ? "rgba(0,200,255,0.9)" : "rgba(100,100,100,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (holdProgress > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdProgress);
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const size = 8;
  ctx.strokeStyle = handDetected ? "#00ccff" : "#555";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

function drawCameraFeed(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  W: number,
  H: number,
  handDetected: boolean
) {
  const feedW = 180;
  const feedH = 120;
  const feedX = W - feedW - 12;
  const feedY = H - feedH - 12;

  ctx.save();
  ctx.translate(feedX + feedW, feedY);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, feedW, feedH);
  ctx.restore();

  ctx.strokeStyle = handDetected ? "#00ccff" : "#444";
  ctx.lineWidth = 2;
  ctx.strokeRect(feedX, feedY, feedW, feedH);

  ctx.font = "bold 11px monospace";
  ctx.fillStyle = handDetected ? "#00ccff" : "#888";
  ctx.textAlign = "left";
  ctx.fillText(handDetected ? "HAND DETECTED" : "NO HAND", feedX + 6, feedY - 6);
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  if (state.phase === "won") {
    ctx.font = "bold 60px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("VICTORY!", W / 2, H / 2 - 30);
    ctx.font = "24px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Level ${state.currentLevel} Complete`, W / 2, H / 2 + 20);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Use two-finger hold on NEXT LEVEL or press N", W / 2, H / 2 + 60);
  } else if (state.phase === "lost") {
    ctx.font = "bold 60px monospace";
    ctx.fillStyle = "#cc3333";
    ctx.fillText("DEFEATED", W / 2, H / 2 - 30);
    ctx.font = "24px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Reached Level ${state.currentLevel}`, W / 2, H / 2 + 20);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Use two-finger hold on RETRY or press R", W / 2, H / 2 + 60);
  }
}
