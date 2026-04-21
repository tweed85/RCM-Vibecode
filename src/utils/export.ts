import type { Project } from '../store/types';
import { wsColorHex, statusColors } from '../constants/colors';
import { statusLabels } from '../constants/enums';
import { calcProgress } from './progress';

// 1920×1080 — standard FHD widescreen (16:9)
// Font scale: 1pt ≈ 1.33px at 96dpi → for readability at this res, body ≥ 16px
const W = 1920;
const H = 1080;

const NAVY   = '#002B49';
const BLUE   = '#0085CA';
const WHITE  = '#FFFFFF';
const BG     = '#EEF3F8';
const CARD   = '#FFFFFF';
const BORDER = '#CFDBE8';
const MUTED  = '#7A8FA6';
const TEXT2  = '#2E4A65';

const SIDEBAR_W = 320;
const ACCENT_W  = 5;
const CONTENT_X = SIDEBAR_W + ACCENT_W + 40;
const CONTENT_W = W - CONTENT_X - 40;
const TITLE_H   = 100;
const FOOTER_Y  = 1044;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function cardShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8) {
  ctx.fillStyle = 'rgba(0,43,73,0.08)';
  rr(ctx, x + 1, y + 3, w, h, r); ctx.fill();
}

export function exportSlide(proj: Project) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const cfg      = proj.config;
  const mils     = proj.milestones;
  const noteMils = mils.filter(m => m.noteExport && m.note?.trim());
  const hasNotes = noteMils.length > 0;

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ── Background ─────────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Sidebar ─────────────────────────────────────────────────────────────
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, SIDEBAR_W, H);

  // Blue accent stripe
  ctx.fillStyle = BLUE;
  ctx.fillRect(SIDEBAR_W, 0, ACCENT_W, H);

  // Brand gradient tint
  const grad = ctx.createLinearGradient(0, 0, 0, 90);
  grad.addColorStop(0, 'rgba(0,133,202,0.20)');
  grad.addColorStop(1, 'rgba(0,133,202,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, SIDEBAR_W, 90);

  // Wordmark
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 22px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Alvarez & Marsal', 28, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.font = '13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Healthcare Industry Group', 28, 58);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(28, 74); ctx.lineTo(SIDEBAR_W - 22, 74); ctx.stroke();

  // Client name
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 18px Inter, "Segoe UI", Arial, sans-serif';
  const nameLines = wrap(ctx, cfg.clientName, SIDEBAR_W - 56);
  nameLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 28, 100 + i * 24));

  // EHR badge
  const ehrY = 100 + Math.min(nameLines.length, 2) * 24 + 10;
  const ehrLabel = cfg.ehr === 'Other' ? (cfg.ehrCustom || 'Other') : cfg.ehr;
  ctx.fillStyle = BLUE;
  rr(ctx, 28, ehrY, ctx.measureText(ehrLabel).width + 20, 22, 4); ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 11px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(ehrLabel, 38, ehrY + 15);

  // Project status pill
  const psY = ehrY + 34;
  const PS: Record<string, [string, string, string]> = {
    'On Track':  ['rgba(41,112,42,0.22)',  '#7cda7e', '#4CAF50'],
    'At Risk':   ['rgba(207,127,0,0.22)',  '#ffc85a', '#FF9800'],
    'Off Track': ['rgba(166,25,46,0.22)',  '#ff8a8a', '#F44336'],
    'Complete':  ['rgba(41,112,42,0.22)',  '#7cda7e', '#4CAF50'],
  };
  const [psBg, psText, psDot] = PS[cfg.projectStatus ?? 'On Track'] ?? PS['On Track'];
  ctx.fillStyle = psBg;
  rr(ctx, 28, psY, SIDEBAR_W - 54, 34, 6); ctx.fill();
  ctx.fillStyle = psDot;
  ctx.beginPath(); ctx.arc(48, psY + 17, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = psText;
  ctx.font = 'bold 14px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(cfg.projectStatus ?? 'On Track', 62, psY + 22);

  // Metrics block
  const all     = mils.flatMap(m => m.tasks);
  const doneTasks = all.filter(t => t.done).length;
  const pct     = all.length ? Math.round(doneTasks / all.length * 100) : 0;
  const metrics = [
    ['Milestones Complete', `${mils.filter(m => m.status === 'complete').length} / ${mils.length}`],
    ['Task Completion',     `${pct}%`],
    ['At Risk',             String(mils.filter(m => m.status === 'atrisk').length)],
    ['Workstreams',         String(cfg.workstreams.length)],
  ];

  const mBlockY = psY + 50;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  rr(ctx, 18, mBlockY, SIDEBAR_W - 34, 256, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '10px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('PROJECT METRICS', 30, mBlockY + 16);

  metrics.forEach(([label, value], i) => {
    const my = mBlockY + 24 + i * 58;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    rr(ctx, 26, my, SIDEBAR_W - 50, 46, 5); ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 26px Inter, "Segoe UI", Arial, sans-serif';
    ctx.fillText(value, 40, my + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.44)';
    ctx.font = '11px Inter, "Segoe UI", Arial, sans-serif';
    ctx.fillText(label, 40, my + 44);
  });

  // Workstream legend
  const wsY = mBlockY + 268;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(28, wsY); ctx.lineTo(SIDEBAR_W - 22, wsY); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '10px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('WORKSTREAMS', 28, wsY + 16);

  const maxWsBottom = H - 70;
  cfg.workstreams.forEach((ws, i) => {
    const wy = wsY + 26 + i * (ws.amOwner ? 34 : 24);
    if (wy > maxWsBottom) return;
    const wc = wsColorHex[ws.color] ?? BLUE;
    ctx.fillStyle = wc;
    ctx.beginPath(); ctx.arc(40, wy + 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = '13px Inter, "Segoe UI", Arial, sans-serif';
    ctx.fillText(ws.label, 54, wy + 12);
    if (ws.amOwner && wy + 26 <= maxWsBottom) {
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.font = '10px Inter, "Segoe UI", Arial, sans-serif';
      ctx.fillText(ws.amOwner, 54, wy + 26);
    }
  });

  // Lead / MD footer
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.moveTo(18, H - 58); ctx.lineTo(SIDEBAR_W - 18, H - 58); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = '11px Inter, "Segoe UI", Arial, sans-serif';
  if (cfg.managingDirector) {
    ctx.fillText('MD: ' + cfg.managingDirector, 28, H - 40);
    ctx.fillText('Lead: ' + cfg.lead, 28, H - 22);
  } else if (cfg.lead) {
    ctx.fillText('Lead: ' + cfg.lead, 28, H - 30);
  }

  // ── Content: title bar ──────────────────────────────────────────────────
  ctx.fillStyle = WHITE;
  ctx.fillRect(CONTENT_X - 40, 0, W - CONTENT_X + 40, TITLE_H);

  ctx.fillStyle = NAVY;
  ctx.font = 'bold 40px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Milestone Status Report', CONTENT_X, 52);

  ctx.fillStyle = MUTED;
  ctx.font = '16px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(today, CONTENT_X, 76);

  ctx.fillStyle = BLUE;
  ctx.fillRect(CONTENT_X, 88, 52, 3);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(CONTENT_X - 40, TITLE_H); ctx.lineTo(W, TITLE_H); ctx.stroke();

  // ── Milestone grid ───────────────────────────────────────────────────────
  const GRID_TOP   = TITLE_H + 16;
  const COLS       = 3;
  const GAP        = 12;
  const CARD_H     = hasNotes ? 108 : 118;
  const gridBottom = hasNotes ? 660 : FOOTER_Y - 12;
  const maxRows    = Math.floor((gridBottom - GRID_TOP) / (CARD_H + GAP));
  const cW         = (CONTENT_W - GAP * (COLS - 1)) / COLS;

  mils.slice(0, maxRows * COLS).forEach((ms, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const cx  = CONTENT_X + col * (cW + GAP);
    const cy  = GRID_TOP  + row * (CARD_H + GAP);

    const ws     = cfg.workstreams.find(w => w.id === ms.workstream);
    const wColor = ws ? (wsColorHex[ws.color] ?? BLUE) : BLUE;
    const sColor = statusColors[ms.status] ?? MUTED;
    const prog   = calcProgress(ms);
    const doneT  = ms.tasks.filter(t => { const s = t.subtasks ?? []; return s.length ? s.every(x => x.done) : t.done; }).length;

    // Shadow + card
    cardShadow(ctx, cx, cy, cW, CARD_H);
    ctx.fillStyle = CARD;
    rr(ctx, cx, cy, cW, CARD_H, 8); ctx.fill();

    // Left workstream bar
    ctx.fillStyle = wColor;
    rr(ctx, cx, cy, 5, CARD_H, [8, 0, 0, 8]); ctx.fill();

    // Status dot
    ctx.fillStyle = sColor;
    ctx.beginPath(); ctx.arc(cx + 20, cy + 22, 5, 0, Math.PI * 2); ctx.fill();

    // Milestone title (truncated to 1 line)
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 16px Inter, "Segoe UI", Arial, sans-serif';
    const titleW   = cW - 140;
    const tLines   = wrap(ctx, ms.title, titleW);
    ctx.fillText(tLines[0] + (tLines.length > 1 ? '…' : ''), cx + 33, cy + 26);

    // Status label
    ctx.fillStyle = sColor;
    ctx.font = 'bold 12px Inter, "Segoe UI", Arial, sans-serif';
    const slabel = statusLabels[ms.status] ?? ms.status;
    ctx.fillText(slabel, cx + 33, cy + 46);

    // Workstream name
    if (ws) {
      const wBadgeX = cx + 35 + ctx.measureText(slabel).width + 10;
      ctx.fillStyle = wColor + '28';
      rr(ctx, wBadgeX - 3, cy + 35, ctx.measureText(ws.label).width + 14, 15, 3); ctx.fill();
      ctx.fillStyle = wColor;
      ctx.font = '10px Inter, "Segoe UI", Arial, sans-serif';
      ctx.fillText(ws.label, wBadgeX + 4, cy + 46);
    }

    // Task count
    if (ms.tasks.length > 0) {
      ctx.fillStyle = MUTED;
      ctx.font = '12px Inter, "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${doneT} / ${ms.tasks.length} tasks`, cx + 33, cy + 66);
    }

    // Due date
    if (ms.dueDate) {
      const dl = new Date(ms.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillStyle = MUTED;
      ctx.font = '12px Inter, "Segoe UI", Arial, sans-serif';
      const taskW = ms.tasks.length > 0 ? ctx.measureText(`${doneT} / ${ms.tasks.length} tasks`).width + 20 : 0;
      ctx.fillText('Due ' + dl, cx + 33 + taskW, cy + 66);
    }

    // Progress bar
    const pbX = cx + cW - 118;
    const pbW = 96;
    ctx.fillStyle = '#DDE7F0';
    rr(ctx, pbX, cy + 16, pbW, 7, 4); ctx.fill();
    if (prog > 0) {
      ctx.fillStyle = sColor;
      rr(ctx, pbX, cy + 16, Math.max(7, pbW * prog / 100), 7, 4); ctx.fill();
    }
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 14px Inter, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${prog}%`, cx + cW - 14, cy + 28);
    ctx.textAlign = 'left';

    // Note dot indicator
    if (ms.noteExport && ms.note?.trim()) {
      ctx.fillStyle = BLUE;
      ctx.beginPath(); ctx.arc(cx + cW - 11, cy + 11, 5, 0, Math.PI * 2); ctx.fill();
    }
  });

  // ── KEY UPDATES (notes) ──────────────────────────────────────────────────
  if (hasNotes) {
    const NOTES_TOP = gridBottom + 14;
    const NOTE_AREA = FOOTER_Y - NOTES_TOP;

    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CONTENT_X - 40, NOTES_TOP); ctx.lineTo(W, NOTES_TOP); ctx.stroke();

    // Section label
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 13px Inter, "Segoe UI", Arial, sans-serif';
    ctx.fillText('KEY UPDATES', CONTENT_X, NOTES_TOP + 20);
    ctx.fillStyle = BLUE;
    ctx.fillRect(CONTENT_X, NOTES_TOP + 25, 40, 2.5);

    const NOTE_COLS = Math.min(noteMils.length, 3);
    const ncW       = (CONTENT_W - GAP * (NOTE_COLS - 1)) / NOTE_COLS;
    const NOTE_TOP2 = NOTES_TOP + 34;
    const rows      = Math.ceil(noteMils.length / NOTE_COLS);
    const rowH      = (NOTE_AREA - 36 - (rows - 1) * GAP) / rows;

    noteMils.slice(0, 6).forEach((ms, i) => {
      const col  = i % NOTE_COLS;
      const row  = Math.floor(i / NOTE_COLS);
      const nx   = CONTENT_X + col * (ncW + GAP);
      const ny   = NOTE_TOP2 + row * (rowH + GAP);
      const ws   = cfg.workstreams.find(w => w.id === ms.workstream);
      const wc   = ws ? (wsColorHex[ws.color] ?? BLUE) : BLUE;

      cardShadow(ctx, nx, ny, ncW, rowH);
      ctx.fillStyle = CARD;
      rr(ctx, nx, ny, ncW, rowH, 8); ctx.fill();

      // Top colour bar
      ctx.fillStyle = wc;
      rr(ctx, nx, ny, ncW, 4, [8, 8, 0, 0]); ctx.fill();

      // Header area
      ctx.fillStyle = NAVY;
      ctx.font = 'bold 14px Inter, "Segoe UI", Arial, sans-serif';
      ctx.fillText(ms.title.length > 55 ? ms.title.slice(0, 53) + '…' : ms.title, nx + 16, ny + 24);

      if (ws) {
        ctx.fillStyle = wc;
        ctx.font = '11px Inter, "Segoe UI", Arial, sans-serif';
        ctx.fillText(ws.label, nx + 16, ny + 40);
      }

      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nx + 16, ny + 48); ctx.lineTo(nx + ncW - 16, ny + 48); ctx.stroke();

      // Note body — 15px for clear readability
      ctx.fillStyle = TEXT2;
      ctx.font = '15px Inter, "Segoe UI", Arial, sans-serif';
      const noteLines = wrap(ctx, ms.note!, ncW - 32);
      const maxL      = Math.max(1, Math.floor((rowH - 60) / 22));
      noteLines.slice(0, maxL).forEach((l, li) => ctx.fillText(l, nx + 16, ny + 68 + li * 22));
      if (noteLines.length > maxL) {
        ctx.fillStyle = MUTED;
        ctx.font = 'italic 12px Inter, "Segoe UI", Arial, sans-serif';
        ctx.fillText('…continued', nx + 16, ny + 68 + maxL * 22);
      }
    });
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CONTENT_X - 40, FOOTER_Y); ctx.lineTo(W, FOOTER_Y); ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '12px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Confidential · Alvarez & Marsal Healthcare Industry Group', CONTENT_X, FOOTER_Y + 24);
  ctx.textAlign = 'right';
  ctx.fillText('Meridian · ' + today, W - 40, FOOTER_Y + 24);
  ctx.textAlign = 'left';

  // Download
  const a = document.createElement('a');
  a.download = `${cfg.clientName.replace(/\s+/g, '_')}_status.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
