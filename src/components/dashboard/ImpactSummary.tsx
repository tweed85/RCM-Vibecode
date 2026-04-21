import { useState } from 'react';
import type { Milestone } from '../../store/types';
import { IMPACT_TYPES } from '../../constants/enums';
import { wsColorHex } from '../../constants/colors';
import { useProjectStore } from '../../store/useProjectStore';

interface Props { milestones: Milestone[]; }

function parseValue(str: string) {
  if (!str) return null;
  const s = str.trim().replace(/[+,]/g, '');
  const pct = s.match(/^([\d.]+)\s*%$/);
  const days = s.match(/^([\d.]+)\s*days?$/i);
  const dollar = s.match(/^\$?([\d.]+)\s*([KMB]?)$/i);
  if (pct)    return { val: parseFloat(pct[1]),   unit: '%' };
  if (days)   return { val: parseFloat(days[1]),  unit: 'days' };
  if (dollar && (str.includes('$') || dollar[2])) {
    let v = parseFloat(dollar[1]);
    const suf = (dollar[2] ?? '').toUpperCase();
    if (suf === 'K') v *= 1e3;
    if (suf === 'M') v *= 1e6;
    if (suf === 'B') v *= 1e9;
    return { val: v, unit: '$' };
  }
  return null;
}

function fmtAgg(unit: string, total: number, count: number): string {
  if (unit === '$') {
    const a = Math.abs(total);
    if (a >= 1e6) return '$' + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + Math.round(a / 1e3) + 'K';
    return '$' + Math.round(a);
  }
  if (unit === '%')    return '+' + (total / count).toFixed(1) + '%';
  if (unit === 'days') return (total >= 0 ? '+' : '') + total.toFixed(1) + ' days';
  return total.toFixed(1);
}

function aggregate(items: { projected: string; realized: string }[], field: 'projected' | 'realized') {
  const parsed = items.map(i => parseValue(i[field])).filter(Boolean) as { val: number; unit: string }[];
  if (!parsed.length) return null;
  const uc: Record<string, number> = {};
  parsed.forEach(p => { uc[p.unit] = (uc[p.unit] ?? 0) + 1; });
  const domUnit = Object.entries(uc).sort((a, b) => b[1] - a[1])[0][0];
  const matching = parsed.filter(p => p.unit === domUnit);
  const total = matching.reduce((s, p) => s + p.val, 0);
  return { label: fmtAgg(domUnit, total, matching.length), total, unit: domUnit, count: matching.length };
}

export function ImpactSummary({ milestones }: Props) {
  const [open, setOpen] = useState(false);
  const { projects, activeProject } = useProjectStore();
  const cfg = projects[activeProject].config;

  const byType: Record<string, { projected: string; realized: string; wsId: string }[]> = {};
  milestones.forEach(m => {
    (m.impact ?? []).forEach(imp => {
      if (!imp.type || !imp.projected?.trim()) return;
      if (!byType[imp.type]) byType[imp.type] = [];
      byType[imp.type].push({ projected: imp.projected, realized: imp.realized ?? '', wsId: m.workstream });
    });
  });

  const activeTypes = IMPACT_TYPES.filter(tp => byType[tp]?.length > 0);
  const wsWithImpact = new Set(Object.values(byType).flat().map(i => i.wsId)).size;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1rem', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer', borderBottom: open ? '1px solid var(--border)' : '1px solid transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10L5 7L8 9L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Client Impact Summary
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>{activeTypes.length} categories · {wsWithImpact} workstreams</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)', transform: open ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }}>›</span>
      </div>

      {open && (
        <div style={{ padding: '14px 16px' }}>
          {activeTypes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No impact data yet.</p>
          ) : (
            activeTypes.map(tp => {
              const items = byType[tp];
              const aggP = aggregate(items, 'projected');
              const aggR = aggregate(items, 'realized');
              const pctReal = aggP && aggR && aggP.unit === aggR.unit && aggP.total > 0
                ? Math.min(100, Math.round(aggR.total / aggP.total * 100))
                : 0;

              return (
                <div key={tp} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{tp}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{aggP?.label ?? items[0].projected}</span>
                      {aggR?.label && <span style={{ fontSize: 12, color: 'var(--text2)' }}>→ {aggR.label} realized</span>}
                    </div>
                    {pctReal > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctReal}%`, background: 'var(--green)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{pctReal}%</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {items.map((imp, i) => {
                      const ws = cfg.workstreams.find(w => w.id === imp.wsId);
                      const wc = ws ? (wsColorHex[ws.color] ?? '#0085CA') : '#0085CA';
                      return (
                        <div key={i} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '5px 10px', minWidth: 100, borderLeft: `3px solid ${wc}` }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{imp.projected}</div>
                          {imp.realized && <div style={{ fontSize: 10, color: 'var(--text2)' }}>→ {imp.realized}</div>}
                          {ws && <div style={{ fontSize: 10, color: wc }}>{ws.label}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
