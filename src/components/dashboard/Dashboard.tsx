import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { calcProgress, isOverdue } from '../../utils/progress';
import { colorMap, statusColors, statusBgColors } from '../../constants/colors';
import { statusLabels } from '../../constants/enums';
import { ProgressBar } from '../shared/ProgressBar';
import { WorkstreamBadge } from '../shared/WorkstreamBadge';
import { ImpactSummary } from './ImpactSummary';
import { WsNotesBar } from './WsNotesBar';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

const PROJECT_STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'On Track':  { bg: '#e8f5e8', color: '#29702A', border: '#29702A' },
  'At Risk':   { bg: '#fff3d6', color: '#8a5500', border: '#CF7F00' },
  'Off Track': { bg: '#fceaed', color: '#A6192E', border: '#A6192E' },
  'Complete':  { bg: '#e8f5e8', color: '#29702A', border: '#29702A' },
};
const PROJECT_STATUS_OPTS = ['On Track', 'At Risk', 'Off Track', 'Complete'];

export function Dashboard() {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const {
    projects, activeProject,
    setActiveFilter, updateProjectConfig,
  } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;
  const milestones = proj.milestones;
  const navigate = useNavigate();

  const filtered = proj.activeFilter === 'all'
    ? milestones
    : milestones.filter(m => m.workstream === proj.activeFilter);

  const total   = milestones.length;
  const complete = milestones.filter(m => m.status === 'complete').length;
  const atrisk  = milestones.filter(m => m.status === 'atrisk').length;
  const allTasks = milestones.flatMap(m => m.tasks);
  const doneTasks = allTasks.filter(t => t.done).length;
  const taskPct = allTasks.length ? Math.round(doneTasks / allTasks.length * 100) : 0;

  const projStatus = cfg.projectStatus ?? 'On Track';
  const psStyle = PROJECT_STATUS_STYLES[projStatus] ?? PROJECT_STATUS_STYLES['On Track'];

  const subParts = [cfg.clientName, cfg.engagementType ?? 'Implementation'];
  if (cfg.managingDirector) subParts.push('MD: ' + cfg.managingDirector);
  subParts.push('Lead: ' + cfg.lead);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>{subParts.join(' · ')}</p>
        </div>
        <select
          style={{
            fontSize: 13, fontWeight: 600, padding: '4px 10px',
            borderRadius: 99, border: `2px solid ${psStyle.border}`,
            background: psStyle.bg, color: psStyle.color,
            cursor: 'pointer',
          }}
          value={projStatus}
          onChange={e => updateProjectConfig({ projectStatus: e.target.value as typeof cfg.projectStatus })}
        >
          {PROJECT_STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Metrics */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Milestones complete</div>
          <div className={styles.metricValue}>{complete}/{total}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Tasks completed</div>
          <div className={styles.metricValue}>{taskPct}%</div>
          <div className={styles.metricSub}>{doneTasks} of {allTasks.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>At risk</div>
          <div className={styles.metricValue} style={{ color: 'var(--red)' }}>{atrisk}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active workstreams</div>
          <div className={styles.metricValue}>{cfg.workstreams.length}</div>
        </div>
      </div>

      <ImpactSummary milestones={milestones} />

      {/* Workstream filter */}
      <div className={styles.filterRow}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Workstream:</span>
        <button
          className={`${styles.chip} ${proj.activeFilter === 'all' ? styles.chipActive : ''}`}
          onClick={() => setActiveFilter('all')}
        >All</button>
        {cfg.workstreams.map(ws => (
          <button
            key={ws.id}
            className={`${styles.chip} ${proj.activeFilter === ws.id ? styles.chipActive : ''}`}
            onClick={() => setActiveFilter(ws.id)}
          >{ws.label}</button>
        ))}
      </div>

      <WsNotesBar workstreams={cfg.workstreams} />

      {/* Milestone cards */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>No milestones yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Add your first milestone to start tracking this engagement.</div>
          <button className={styles.btnPrimary} onClick={() => navigate('/milestones')}>+ Add Milestone</button>
        </div>
      ) : (
        filtered.map(m => {
          const mIdx = milestones.indexOf(m);
          const ws = cfg.workstreams.find(w => w.id === m.workstream) ?? { label: m.workstream, color: 'blue' as const, amOwner: '' };
          const col = colorMap[ws.color] ?? colorMap.blue;
          const prog = calcProgress(m);
          const od = m.dueDate ? isOverdue(m.dueDate, m.status) : false;
          const ownerRole = cfg.roles.find(r => r.key === m.owner);
          const ownerLabel = ownerRole ? (ownerRole.clientRole || ownerRole.key) : m.owner;
          const totalT = m.tasks.length;
          const doneT = m.tasks.filter(t => { const s = t.subtasks ?? []; return s.length ? s.every(x => x.done) : t.done; }).length;
          const raidLinked = proj.raid.filter(r => r.linkedTasks.some(tid => m.tasks.find(t => t.id === tid)));
          const decLinked  = proj.decisions.filter(d => d.linkedTasks.some(tid => m.tasks.find(t => t.id === tid)));
          const impactItems = (m.impact ?? []).filter(i => i.type && i.projected);

          return (
            <div key={m.id} className={styles.milestoneCard}>
              <div
                className={styles.milestoneHeader}
                onClick={() => { navigate('/tasks', { state: { scrollTo: m.id } }); }}
                title="Click to view tasks"
              >
                <div className={styles.statusDot} style={{ background: statusColors[m.status] }} />
                <div className={styles.msTitle}>{m.title}</div>
                <div className={styles.msMeta}>
                  <WorkstreamBadge label={ws.label} color={ws.color} />
                  {ownerLabel && <span className={styles.ownerPill}>{ownerLabel}</span>}
                  {ws.amOwner && <span className={styles.ownerPill} style={{ background: 'var(--blue-bg)', color: 'var(--blue)', border: 'none' }}>{ws.amOwner}</span>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: statusBgColors[m.status], color: statusColors[m.status] }}>
                    {statusLabels[m.status]}
                  </span>
                  <button className={styles.msBtn} onClick={e => { e.stopPropagation(); navigate('/milestones', { state: { editId: m.id } }); }}>Edit</button>
                </div>
              </div>

              <ProgressBar pct={prog} />

              <div className={styles.msFooter}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Tasks: <strong style={{ color: doneT === totalT && totalT > 0 ? 'var(--green)' : 'var(--text2)' }}>{doneT}/{totalT}</strong>
                  </span>
                  {m.dueDate && (
                    <span style={{ fontSize: 12, color: od ? 'var(--red)' : 'var(--text3)' }}>
                      Due: <strong>{m.dueDate}</strong>{od ? ' ⚠' : ''}
                    </span>
                  )}
                  {raidLinked.length > 0 && (
                    <span
                      style={{ fontSize: 11, background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}
                      onClick={() => navigate('/raid')}
                    >{raidLinked.length} RAID</span>
                  )}
                  {decLinked.length > 0 && (
                    <span
                      style={{ fontSize: 11, background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}
                      onClick={() => navigate('/decisions')}
                    >{decLinked.length} decision{decLinked.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                {impactItems.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {impactItems.slice(0, 3).map((imp, i) => (
                      <span key={i} style={{ fontSize: 11, background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 4, padding: '2px 7px' }}>
                        {imp.type}: {imp.projected}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {m.note?.trim() && (() => {
                const isLong = m.note.length > 160;
                const isExpanded = expandedNotes.has(m.id);
                const text = isLong && !isExpanded ? m.note.slice(0, 160) + '…' : m.note;
                return (
                  <div style={{ padding: '6px 16px 10px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {text}
                    {isLong && (
                      <button
                        style={{ marginLeft: 6, fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={e => { e.stopPropagation(); setExpandedNotes(s => { const n = new Set(s); isExpanded ? n.delete(m.id) : n.add(m.id); return n; }); }}
                      >{isExpanded ? 'Show less' : 'Show more'}</button>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })
      )}

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button className={styles.btnPrimary} onClick={() => navigate('/milestones')}>+ Add Milestone</button>
      </div>
    </div>
  );
}
