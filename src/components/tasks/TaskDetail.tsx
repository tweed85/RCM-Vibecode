import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { getWbs } from '../../utils/wbs';
import { WbsBadge } from '../shared/WbsBadge';
import { WorkstreamBadge } from '../shared/WorkstreamBadge';
import { SubtaskRow } from './SubtaskRow';
import { triggerSaveIndicator } from '../layout/Topbar';
import styles from './TaskDetail.module.css';

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

export function TaskDetail() {
  const { tid } = useParams<{ tid: string }>();
  const navigate = useNavigate();
  const { projects, activeProject, updateTask, addSubtask } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;

  // Find the task across all milestones
  let foundMilestoneId: string | null = null;
  let foundTask = null;
  let mIdx = 0;
  let tIdx = 0;
  for (const m of proj.milestones) {
    for (let ti = 0; ti < m.tasks.length; ti++) {
      if (m.tasks[ti].id === tid) {
        foundMilestoneId = m.id;
        foundTask = m.tasks[ti];
        mIdx = proj.milestones.indexOf(m);
        tIdx = ti;
        break;
      }
    }
    if (foundTask) break;
  }

  const [addSubText, setAddSubText] = useState('');

  if (!foundTask || foundMilestoneId === null) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)' }}>
        Task not found.
        <button style={{ marginLeft: 12, fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>← Back to Tasks</button>
      </div>
    );
  }

  const t = foundTask;
  const milestoneId = foundMilestoneId;
  const milestone = proj.milestones.find(m => m.id === milestoneId)!;
  const ws = cfg.workstreams.find(w => w.id === milestone.workstream);
  const effectiveDone = t.subtasks?.length ? t.subtasks.every(s => s.done) : t.done;

  function update(updates: Parameters<typeof updateTask>[2]) {
    updateTask(milestoneId, t.id, updates);
    triggerSaveIndicator();
  }

  function handleAddSub(e: React.FormEvent) {
    e.preventDefault();
    if (!addSubText.trim()) return;
    addSubtask(milestoneId, t.id, { text: addSubText.trim(), done: false, owner: '', startDate: '', endDate: '' });
    setAddSubText('');
  }

  const raidLinked = proj.raid.filter(r => r.linkedTasks.includes(t.id));
  const decLinked = proj.decisions.filter(d => d.linkedTasks.includes(t.id));

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <button className={styles.backBtn} onClick={() => navigate('/tasks')}>← Tasks</button>
        <WbsBadge wbs={getWbs(mIdx, tIdx)} />
        {ws && <WorkstreamBadge label={ws.label} color={ws.color} />}
        <span style={{ fontSize: 12, color: effectiveDone ? 'var(--green)' : 'var(--text3)' }}>
          {effectiveDone ? '✓ Complete' : 'In Progress'}
        </span>
        {!(t.subtasks?.length) && (
          <button
            style={{
              marginLeft: 'auto', fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: effectiveDone ? 'var(--surface2)' : '#0085CA',
              color: effectiveDone ? 'var(--text2)' : 'white',
            }}
            onClick={() => update({ done: !t.done })}
          >{effectiveDone ? 'Mark Incomplete' : 'Mark Complete'}</button>
        )}
      </div>

      <h1 className={styles.title}>{t.text}</h1>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.5rem' }}>
        Milestone: <strong style={{ color: 'var(--text2)' }}>{milestone.title}</strong>
      </p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Task Details</h3>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Title</label>
            <input
              style={fieldStyle}
              defaultValue={t.text}
              onBlur={e => update({ text: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Start Date</label>
              <input type="date" style={fieldStyle} defaultValue={t.startDate} onBlur={e => update({ startDate: e.target.value })} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>End Date</label>
              <input type="date" style={fieldStyle} defaultValue={t.endDate} onBlur={e => update({ endDate: e.target.value })} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Owner</label>
            <input style={fieldStyle} defaultValue={t.owner} placeholder="Assignee name" onBlur={e => update({ owner: e.target.value })} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Notes</label>
            <textarea
              style={{ ...fieldStyle, minHeight: 90, resize: 'vertical' }}
              defaultValue={t.note}
              placeholder="Add notes…"
              onBlur={e => update({ note: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Subtasks ({t.subtasks?.length ?? 0})</h3>
            {(t.subtasks ?? []).map((st, sIdx) => (
              <SubtaskRow
                key={st.id}
                subtask={st}
                sIdx={sIdx}
                mIdx={mIdx}
                tIdx={tIdx}
                milestoneId={milestoneId}
                taskId={t.id}
                taskStartDate={t.startDate}
                taskEndDate={t.endDate}
              />
            ))}
            <form onSubmit={handleAddSub} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                style={{ ...fieldStyle, flex: 1 }}
                value={addSubText}
                onChange={e => setAddSubText(e.target.value)}
                placeholder="Add subtask…"
              />
              <button type="submit" style={{ padding: '6px 14px', background: '#0085CA', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Add</button>
            </form>
          </div>

          {(raidLinked.length > 0 || decLinked.length > 0) && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <h3 className={styles.cardTitle}>Linked Items</h3>
              {raidLinked.map(r => (
                <div key={r.id} className={styles.linkedItem} onClick={() => navigate('/raid')}>
                  <span style={{ fontSize: 10, background: 'var(--red-bg)', color: 'var(--red)', padding: '1px 6px', borderRadius: 3 }}>{r.type.toUpperCase()}</span>
                  <span style={{ fontSize: 13 }}>{r.title}</span>
                </div>
              ))}
              {decLinked.map(d => (
                <div key={d.id} className={styles.linkedItem} onClick={() => navigate('/decisions')}>
                  <span style={{ fontSize: 10, background: 'var(--amber-bg)', color: 'var(--amber)', padding: '1px 6px', borderRadius: 3 }}>DECISION</span>
                  <span style={{ fontSize: 13 }}>{d.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
