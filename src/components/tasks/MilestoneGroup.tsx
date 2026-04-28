import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Milestone } from '../../store/types';
import { useProjectStore } from '../../store/useProjectStore';
import { colorMap, statusColors, statusBgColors } from '../../constants/colors';
import { statusLabels } from '../../constants/enums';
import { calcProgress, isOverdue } from '../../utils/progress';
import { getWbs } from '../../utils/wbs';
import { ProgressBar } from '../shared/ProgressBar';
import { WorkstreamBadge } from '../shared/WorkstreamBadge';
import { WbsBadge } from '../shared/WbsBadge';
import { TaskRow } from './TaskRow';
import styles from './MilestoneGroup.module.css';

interface Props {
  milestone: Milestone;
  mIdx: number;
  forceOpen?: boolean;
}

export function MilestoneGroup({ milestone: m, mIdx, forceOpen }: Props) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState('');
  const { projects, activeProject, addTask } = useProjectStore();
  const cfg = projects[activeProject].config;
  const navigate = useNavigate();

  const ws = cfg.workstreams.find(w => w.id === m.workstream) ?? { label: m.workstream, color: 'blue' as const };
  const col = colorMap[ws.color] ?? colorMap.blue;
  const prog = calcProgress(m);
  const od = m.dueDate ? isOverdue(m.dueDate, m.status) : false;
  const totalT = m.tasks.length;
  const doneT = m.tasks.filter(t => {
    const s = t.subtasks ?? [];
    return s.length ? s.every(x => x.done) : t.done;
  }).length;

  function submitNewTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    addTask(m.id, { text: newTask.trim(), done: false, startDate: '', endDate: '', note: '', owners: [], subtasks: [], predecessors: [] });
    setNewTask('');
    setAddingTask(false);
  }

  return (
    <div className={styles.group}>
      <div className={styles.header} style={{ borderLeft: `3px solid ${col.text}` }}>
        <div
          className={styles.headerLeft}
          onClick={() => setOpen(o => !o)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={`${m.title}, ${open ? 'collapse' : 'expand'}`}
        >
          <span className={styles.chevron} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <WbsBadge wbs={getWbs(mIdx)} />
          <div
            className={styles.statusDot}
            style={{ background: statusColors[m.status] }}
            title={statusLabels[m.status]}
            aria-label={`Status: ${statusLabels[m.status]}`}
            role="img"
          />
          <span className={styles.msTitle}>{m.title}</span>
          <WorkstreamBadge label={ws.label} color={ws.color} />
          <span
            style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
              background: statusBgColors[m.status], color: statusColors[m.status],
            }}
          >{statusLabels[m.status]}</span>
        </div>
        <div className={styles.headerRight}>
          <span style={{ fontSize: 12, color: doneT === totalT && totalT > 0 ? 'var(--green)' : 'var(--text3)' }}>
            {doneT}/{totalT} tasks
          </span>
          {m.owners?.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.owners.join(', ')}</span>
          )}
          {m.dueDate && (
            <span style={{ fontSize: 12, color: od ? 'var(--red)' : 'var(--text3)' }}>
              Due: <strong>{m.dueDate}</strong>{od ? ' ⚠' : ''}
            </span>
          )}
          <button
            className={styles.btn}
            onClick={e => { e.stopPropagation(); navigate('/milestones', { state: { editId: m.id } }); }}
          >Edit</button>
          <button
            className={styles.collapseBtn}
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            title={open ? 'Collapse' : 'Expand'}
            aria-label={open ? 'Collapse milestone' : 'Expand milestone'}
            aria-expanded={open}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      <ProgressBar pct={prog} />

      {open && (
        <div>
          {m.tasks.map((t, tIdx) => (
            <TaskRow
              key={t.id}
              task={t}
              tIdx={tIdx}
              mIdx={mIdx}
              milestoneId={m.id}
              allTasks={m.tasks}
            />
          ))}

          {addingTask ? (
            <form onSubmit={submitNewTask} className={styles.addTaskRow}>
              <input
                autoFocus
                className={styles.addTaskInput}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="New task description…"
              />
              <button type="submit" className={styles.btnAdd}>Add</button>
              <button type="button" className={styles.btnCancel} onClick={() => { setAddingTask(false); setNewTask(''); }}>Cancel</button>
            </form>
          ) : (
            <button className={styles.addBtn} onClick={() => setAddingTask(true)}>
              + Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
