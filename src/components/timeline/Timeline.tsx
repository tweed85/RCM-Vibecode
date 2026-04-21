import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { wsColorHex, statusColors } from '../../constants/colors';
import styles from './Timeline.module.css';

type ZoomMonths = 3 | 6 | 12;
const ZOOM_LEVELS: ZoomMonths[] = [3, 6, 12];

// Minimum pixel width per month column (used as floor when container is very narrow)
const MIN_MONTH_PX: Record<ZoomMonths, number> = { 3: 180, 6: 120, 12: 80 };

interface MonthData {
  date: Date;
  label: string;
  shortLabel: string;
  days: number;
  width: number;
  dayPx: number;
  xOffset: number; // pixel offset from left of chart
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function buildMonths(zoom: ZoomMonths, offsetMonths: number, mpx: number): MonthData[] {
  const now = new Date();
  const base = now.getMonth() + offsetMonths;
  const months: MonthData[] = [];
  let x = 0;
  for (let i = 0; i < zoom; i++) {
    const totalMonth = base + i;
    const year = now.getFullYear() + Math.floor(totalMonth / 12);
    const month = ((totalMonth % 12) + 12) % 12;
    const date = new Date(year, month, 1);
    const days = daysInMonth(year, month);
    const width = mpx;
    const dayPx = width / days;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push({ date, label, shortLabel, days, width, dayPx, xOffset: x });
    x += width;
  }
  return months;
}

function dateToX(d: Date, months: MonthData[]): number {
  for (const m of months) {
    const mEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 1);
    if (d < m.date) return m.xOffset;
    if (d < mEnd) {
      return m.xOffset + (d.getDate() - 1) * m.dayPx;
    }
  }
  // after last month
  const last = months[months.length - 1];
  return last.xOffset + last.width;
}

export function Timeline() {
  const [zoom, setZoom] = useState<ZoomMonths>(3);
  const [offset, setOffset] = useState(0); // in months
  const [labelWidth, setLabelWidth] = useState(480);
  const [chartAreaWidth, setChartAreaWidth] = useState(0);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartW = useRef<number>(480);

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setChartAreaWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = labelWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - dragStartX.current!;
      setLabelWidth(Math.max(120, Math.min(480, dragStartW.current + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [labelWidth]);

  const { projects, activeProject } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;
  const milestones = proj.milestones;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthPx = chartAreaWidth > 0
    ? Math.max(MIN_MONTH_PX[zoom], Math.floor(chartAreaWidth / zoom))
    : MIN_MONTH_PX[zoom];

  const months = useMemo(
    () => buildMonths(zoom, offset, monthPx),
    [zoom, offset, monthPx]
  );

  const viewStart = months[0].date;
  const lastM = months[months.length - 1];
  const viewEnd = new Date(lastM.date.getFullYear(), lastM.date.getMonth() + 1, 1);
  const totalWidth = lastM.xOffset + lastM.width;

  // Week marker x-positions (Mondays)
  const weekMarkers = useMemo(() => {
    const xs: number[] = [];
    const d = new Date(viewStart);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d < viewEnd) {
      xs.push(dateToX(d, months));
      d.setDate(d.getDate() + 7);
    }
    return xs;
  }, [months]);

  // Month divider x-positions (between months)
  const monthDividers = months.slice(1).map(m => m.xOffset);

  function barProps(startStr: string, endStr: string) {
    const s = parseDate(startStr);
    const e = parseDate(endStr);
    if (!s || !e) return { left: 0, width: 0, visible: false };
    const eNext = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1);
    if (eNext <= viewStart || s >= viewEnd) return { left: 0, width: 0, visible: false };
    const cs = s < viewStart ? viewStart : s;
    const ce = eNext > viewEnd ? viewEnd : eNext;
    const left = dateToX(cs, months);
    const right = dateToX(ce, months);
    return { left, width: Math.max(4, right - left), visible: true };
  }

  const todayVisible = today >= viewStart && today < viewEnd;
  const todayX = todayVisible ? dateToX(today, months) : -1;

  const undatedTasks = milestones.flatMap(m =>
    m.tasks.filter(t => !t.startDate && !t.endDate).map(t => t.text)
  );
  const undatedMilestones = milestones.filter(m => !m.dueDate && !m.tasks.some(t => t.startDate || t.endDate));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Timeline</h1>
          <p className={styles.sub}>
            {months[0].shortLabel} – {lastM.shortLabel}
          </p>
        </div>
        <div className={styles.controls}>
          <button className={styles.navBtn} onClick={() => setOffset(o => o - zoom)}>◀ Prev</button>
          <button className={styles.navBtn} onClick={() => setOffset(0)}>Today</button>
          <button className={styles.navBtn} onClick={() => setOffset(o => o + zoom)}>Next ▶</button>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>View:</span>
          {ZOOM_LEVELS.map(z => (
            <button
              key={z}
              className={`${styles.zoomBtn} ${zoom === z ? styles.zoomActive : ''}`}
              onClick={() => setZoom(z)}
            >{z} months</button>
          ))}
        </div>
      </div>

      <div className={styles.gantt}>
        {/* Left label column — resizable */}
        <div className={styles.labelCol} style={{ width: labelWidth }}>
          <div className={styles.labelHeader} />
          {milestones.map(m => {
            const ws = cfg.workstreams.find(w => w.id === m.workstream);
            const wc = ws ? (wsColorHex[ws.color] ?? '#0085CA') : '#0085CA';
            return (
              <div key={m.id}>
                <div className={styles.milestoneLabel} style={{ borderLeft: `3px solid ${wc}` }}>
                  <span className={styles.msLabelText}>{m.title}</span>
                </div>
                {m.tasks.map(t => (
                  <div key={t.id} className={styles.taskLabel}>{t.text}</div>
                ))}
              </div>
            );
          })}
          {/* Drag handle */}
          <div className={styles.resizeHandle} onMouseDown={onDragStart} title="Drag to resize" />
        </div>

        {/* Chart */}
        <div className={styles.chartArea} ref={chartAreaRef}>
          <div style={{ width: '100%', position: 'relative' }}>

            {/* Month header row */}
            <div className={styles.monthHeader}>
              {/* Week ticks */}
              {weekMarkers.map((x, i) => (
                <div key={i} className={styles.weekTickInHeader} style={{ left: x }} />
              ))}
              {/* Month dividers */}
              {monthDividers.map((x, i) => (
                <div key={i} className={styles.monthDividerInHeader} style={{ left: x }} />
              ))}
              {/* Today marker */}
              {todayVisible && (
                <div className={styles.todayHeaderBand} style={{ left: todayX }} />
              )}
              {/* Month name blocks */}
              {months.map((m, i) => (
                <div
                  key={i}
                  className={styles.monthBlock}
                  style={{ left: m.xOffset, width: m.width }}
                >
                  {zoom <= 6 ? m.label : m.shortLabel}
                </div>
              ))}
            </div>

            {/* Chart rows */}
            {milestones.map(m => {
              const ws = cfg.workstreams.find(w => w.id === m.workstream);
              const wc = ws ? (wsColorHex[ws.color] ?? '#0085CA') : '#0085CA';
              const firstStart = m.tasks.find(t => t.startDate)?.startDate ?? '';
              const msBar = barProps(firstStart, m.dueDate);

              return (
                <div key={m.id}>
                  <div className={styles.chartRow} style={{ height: 36, background: 'var(--surface2)' }}>
                    <RowGridLines weekMarkers={weekMarkers} monthDividers={monthDividers} todayX={todayVisible ? todayX : -1} />
                    {msBar.visible && (
                      <div
                        className={styles.milestoneBar}
                        style={{
                          left: msBar.left,
                          width: msBar.width,
                          background: `linear-gradient(135deg, ${wc}ee, ${wc}88)`,
                          border: `1px solid ${wc}bb`,
                        }}
                      />
                    )}
                  </div>
                  {m.tasks.map(t => {
                    const tb = barProps(t.startDate, t.endDate);
                    const tc = t.done ? '#29702A' : wc;
                    return (
                      <div key={t.id} className={styles.chartRow} style={{ height: 28 }}>
                        <RowGridLines weekMarkers={weekMarkers} monthDividers={monthDividers} todayX={todayVisible ? todayX : -1} />
                        {tb.visible && (
                          <div
                            className={styles.taskBar}
                            style={{
                              left: tb.left,
                              width: tb.width,
                              background: `linear-gradient(135deg, ${tc}ee, ${tc}88)`,
                              border: `1px solid ${tc}bb`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(undatedMilestones.length > 0 || undatedTasks.length > 0) && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text3)' }}>
          <strong style={{ color: 'var(--text2)' }}>Not shown — missing dates:</strong>
          {undatedMilestones.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {undatedMilestones.length} milestone{undatedMilestones.length > 1 ? 's' : ''} with no due date or task dates:{' '}
              {undatedMilestones.map(m => m.title).join(', ')}
            </div>
          )}
          {undatedTasks.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {undatedTasks.length} task{undatedTasks.length > 1 ? 's' : ''} with no start/end date
              {undatedTasks.length <= 5 ? ': ' + undatedTasks.join(', ') : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RowGridLines({ weekMarkers, monthDividers, todayX }: { weekMarkers: number[]; monthDividers: number[]; todayX: number }) {
  return (
    <>
      {weekMarkers.map((x, i) => (
        <div key={`w${i}`} style={{ position: 'absolute', inset: '0 auto', left: x, width: 1, background: 'var(--border)', pointerEvents: 'none', zIndex: 0 }} />
      ))}
      {monthDividers.map((x, i) => (
        <div key={`m${i}`} style={{ position: 'absolute', inset: '0 auto', left: x, width: 1, background: 'var(--border-med)', pointerEvents: 'none', zIndex: 0 }} />
      ))}
      {todayX >= 0 && (
        <div style={{ position: 'absolute', inset: '0 auto', left: todayX, width: 2, background: '#0085CA', opacity: 0.5, pointerEvents: 'none', zIndex: 1 }} />
      )}
    </>
  );
}
