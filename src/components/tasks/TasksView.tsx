import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { MilestoneGroup } from './MilestoneGroup';
import styles from './TasksView.module.css';

type SortBy = 'none' | 'due' | 'status' | 'workstream';
const STATUS_ORDER = ['inprogress', 'atrisk', 'notstarted', 'complete'];

export function TasksView() {
  const { projects, activeProject, setTasksFilterWs, setTasksFilterStatus } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;
  const milestones = proj.milestones;
  const location = useLocation();
  const navigate = useNavigate();
  const scrollTarget = (location.state as { scrollTo?: string })?.scrollTo;
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sortBy, setSortBy] = useState<SortBy>('none');
  const [allOpen, setAllOpen] = useState(true);
  const [forceOpen, setForceOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (scrollTarget != null && refs.current[scrollTarget]) {
      setTimeout(() => refs.current[scrollTarget]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [scrollTarget]);

  const filterWs = proj.tasksFilterWs ?? 'all';
  const filterStatus = proj.tasksFilterStatus ?? 'all';

  const filtered = milestones.filter(m => {
    if (filterWs !== 'all' && m.workstream !== filterWs) return false;
    if (filterStatus === 'done' && m.status !== 'complete') return false;
    if (filterStatus === 'todo' && m.status === 'complete') return false;
    return true;
  });

  const sorted = [...filtered];
  if (sortBy === 'due') sorted.sort((a, b) => (a.dueDate || 'z') < (b.dueDate || 'z') ? -1 : 1);
  if (sortBy === 'status') sorted.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  if (sortBy === 'workstream') sorted.sort((a, b) => a.workstream.localeCompare(b.workstream));

  function toggleCollapseAll(open: boolean) {
    setAllOpen(open);
    setForceOpen(open);
    setTimeout(() => setForceOpen(undefined), 50);
  }

  const wsLabel = filterWs !== 'all' ? cfg.workstreams.find(w => w.id === filterWs)?.label : null;
  const statusLabel = filterStatus !== 'all' ? (filterStatus === 'done' ? 'Complete' : 'In Progress') : null;
  const activeFilters = [wsLabel, statusLabel].filter(Boolean).join(', ');

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.sub}>{milestones.length} milestones · {milestones.flatMap(m => m.tasks).length} tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={styles.btnGhost} onClick={() => toggleCollapseAll(!allOpen)} title={allOpen ? 'Collapse all milestones' : 'Expand all milestones'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: 'middle', transition: 'transform 0.15s', transform: allOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/milestones')}>+ Add Milestone</button>
        </div>
      </div>

      <div className={styles.filterRow}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Workstream:</span>
        <button
          className={`${styles.chip} ${filterWs === 'all' ? styles.chipActive : ''}`}
          onClick={() => setTasksFilterWs('all')}
        >All</button>
        {cfg.workstreams.map(ws => (
          <button
            key={ws.id}
            className={`${styles.chip} ${filterWs === ws.id ? styles.chipActive : ''}`}
            onClick={() => setTasksFilterWs(ws.id)}
          >{ws.label}</button>
        ))}

        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Status:</span>
        {(['all', 'todo', 'done'] as const).map(s => (
          <button
            key={s}
            className={`${styles.chip} ${filterStatus === s ? styles.chipActive : ''}`}
            onClick={() => setTasksFilterStatus(s)}
          >
            {s === 'all' ? 'All' : s === 'todo' ? 'In Progress' : 'Complete'}
          </button>
        ))}

        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Sort:</span>
        <select
          style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--border-med)', borderRadius: 99, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
        >
          <option value="none">Default</option>
          <option value="due">Due date</option>
          <option value="status">Status</option>
          <option value="workstream">Workstream</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          No milestones match{activeFilters ? ` (${activeFilters})` : ''}.{' '}
          <button
            style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => { setTasksFilterWs('all'); setTasksFilterStatus('all'); }}
          >Clear filters</button>
        </div>
      ) : (
        sorted.map(m => {
          const mIdx = milestones.indexOf(m);
          return (
            <div key={m.id} ref={el => { refs.current[m.id] = el; }}>
              <MilestoneGroup milestone={m} mIdx={mIdx} forceOpen={forceOpen} />
            </div>
          );
        })
      )}
    </div>
  );
}
