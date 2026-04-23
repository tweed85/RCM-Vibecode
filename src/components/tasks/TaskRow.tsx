import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../store/types';
import { useProjectStore } from '../../store/useProjectStore';
import { getWbs } from '../../utils/wbs';
import { WbsBadge } from '../shared/WbsBadge';
import { ConfirmButton } from '../shared/ConfirmButton';
import { SubtaskRow } from './SubtaskRow';
import styles from './TaskRow.module.css';

interface Props {
  task: Task;
  tIdx: number;
  mIdx: number;
  milestoneId: string;
  allTasks: Task[];
}

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const IconNote = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const IconSub = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="5" x2="21" y2="5"/>
    <line x1="9" y1="12" x2="21" y2="12"/>
    <line x1="9" y1="19" x2="21" y2="19"/>
    <polyline points="3 12 6 9 3 12 6 15"/>
  </svg>
);

const IconPred = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

// Badge icons — slightly smaller (11px)
const IconRaid = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconDec = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconPredBadge = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 5 12 12 19"/>
  </svg>
);

function isTaskOverdue(t: Task, done: boolean): boolean {
  if (done || !t.endDate) return false;
  return new Date(t.endDate + 'T00:00:00') < getToday();
}

function fmtDate(s: string): string {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateRange(start: string, end: string): string {
  if (start && end) return `${fmtDate(start)} – ${fmtDate(end)}`;
  if (start) return `From ${fmtDate(start)}`;
  if (end) return `Due ${fmtDate(end)}`;
  return '';
}

export function TaskRow({ task: t, tIdx, mIdx, milestoneId, allTasks }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteVal, setNoteVal] = useState(t.note ?? '');
  const [addSubText, setAddSubText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showPredPanel, setShowPredPanel] = useState(false);

  const {
    toggleTask, updateTask, deleteTask, moveTask,
    addSubtask, addPredecessor, removePredecessor,
    projects, activeProject,
  } = useProjectStore();

  const proj = projects[activeProject];
  const navigate = useNavigate();

  const effectiveDone = t.subtasks?.length
    ? t.subtasks.every(s => s.done)
    : t.done;

  const overdue = isTaskOverdue(t, effectiveDone);

  function handleToggle() { toggleTask(milestoneId, t.id); }

  function saveNote() {
    updateTask(milestoneId, t.id, { note: noteVal });
    setEditNote(false);
  }

  function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!addSubText.trim()) return;
    addSubtask(milestoneId, t.id, { text: addSubText.trim(), done: false, owners: [], startDate: '', endDate: '' });
    setAddSubText('');
    setAddingSubtask(false);
  }

  const predTasks = allTasks.filter(x => (t.predecessors ?? []).includes(x.id));
  const availPreds = allTasks.filter(x => x.id !== t.id && !(t.predecessors ?? []).includes(x.id));

  const raidLinked = proj.raid.filter(r => r.linkedTasks.includes(t.id));
  const decLinked = proj.decisions.filter(d => d.linkedTasks.includes(t.id));

  return (
    <div className={`${styles.row} ${effectiveDone ? styles.done : ''} ${overdue ? styles.overdue : ''}`}>
      <div className={styles.main}>
        <div className={styles.left}>
          <button
            className={styles.reorder}
            onClick={() => moveTask(milestoneId, t.id, -1)}
            title="Move up"
            disabled={tIdx === 0}
          >▲</button>
          <button
            className={styles.reorder}
            onClick={() => moveTask(milestoneId, t.id, 1)}
            title="Move down"
            disabled={tIdx === allTasks.length - 1}
          >▼</button>

          <input
            type="checkbox"
            className={styles.checkbox}
            checked={effectiveDone}
            onChange={handleToggle}
          />

          <WbsBadge wbs={getWbs(mIdx, tIdx)} small />

          {overdue && (
            <span className={styles.overdueTag} title="Past due date">Overdue</span>
          )}

          <span
            className={`${styles.text} ${effectiveDone ? styles.strikethrough : ''}`}
            onClick={() => navigate(`/tasks/${t.id}`)}
            title="View task detail"
          >
            {t.text}
          </span>
        </div>

        <div className={styles.right}>
          {/* Slot 1: date range — fixed width, always present */}
          <div className={styles.slotDate}>
            {(t.startDate || t.endDate) && (
              <span className={styles.datePill} style={{ color: overdue ? 'var(--red)' : undefined }}>
                {dateRange(t.startDate, t.endDate)}
              </span>
            )}
          </div>

          {/* Slot 2: owner — fixed width, always present */}
          <div className={styles.slotOwner}>
            {t.owners?.length > 0 && <span className={styles.ownerPill}>{t.owners.join(', ')}</span>}
          </div>

          {/* Slot 3: indicator badges — fixed width, always present */}
          <div className={styles.slotBadges}>
            {raidLinked.length > 0 && (
              <span
                className={styles.raidBadge}
                onClick={() => navigate('/raid')}
                title={raidLinked.map(r => r.title).join(', ')}
              ><IconRaid />{raidLinked.length}</span>
            )}
            {decLinked.length > 0 && (
              <span
                className={styles.decBadge}
                onClick={() => navigate('/decisions')}
                title={decLinked.map(d => d.title).join(', ')}
              ><IconDec />{decLinked.length}</span>
            )}
            {t.predecessors?.length > 0 && (
              <span className={styles.predBadge} title={`Predecessors: ${predTasks.map(p => p.text).join(', ')}`}>
                <IconPredBadge />{t.predecessors.length}
              </span>
            )}
          </div>

          {/* Slot 4: action buttons — always present, separated by divider */}
          <div className={styles.slotActions}>
            <button
              className={`${styles.iconBtn} ${t.note?.trim() ? styles.iconBtnActive : ''}`}
              title={t.note?.trim() ? 'View / edit note' : 'Add note'}
              onClick={() => { setShowNote(v => !v); if (!showNote) setEditNote(false); }}
            ><IconNote /></button>

            <button
              className={`${styles.iconBtn} ${t.subtasks?.length ? styles.iconBtnActive : ''}`}
              title={t.subtasks?.length ? `${t.subtasks.length} subtask${t.subtasks.length > 1 ? 's' : ''}` : 'Add subtasks'}
              onClick={() => setExpanded(v => !v)}
            >
              <IconSub />
              {t.subtasks?.length ? <span style={{ fontSize: 10, marginLeft: 2 }}>{t.subtasks.length}</span> : null}
            </button>

            <button
              className={`${styles.iconBtn} ${showPredPanel ? styles.iconBtnActive : ''}`}
              title={t.predecessors?.length ? `${t.predecessors.length} predecessor${t.predecessors.length > 1 ? 's' : ''}` : 'Add predecessors'}
              onClick={() => setShowPredPanel(v => !v)}
            ><IconPred /></button>

            <ConfirmButton
              className={styles.iconBtnDanger}
              onConfirm={() => deleteTask(milestoneId, t.id)}
              confirmLabel="Delete?"
            >×</ConfirmButton>
          </div>
        </div>
      </div>

      {showNote && (
        <div className={styles.noteArea}>
          {editNote ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea
                autoFocus
                className={styles.noteInput}
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                rows={3}
              />
              <button className={styles.btnSm} onClick={saveNote}>Save</button>
              <button className={styles.btnSmGhost} onClick={() => { setEditNote(false); setNoteVal(t.note ?? ''); }}>Cancel</button>
            </div>
          ) : (
            <div className={styles.noteText} onClick={() => setEditNote(true)} title="Click to edit">
              {t.note?.trim() ? t.note : <em style={{ color: 'var(--text3)' }}>No note yet — click to add</em>}
            </div>
          )}
        </div>
      )}

      {showPredPanel && (
        <div className={styles.predPanel}>
          <div className={styles.predTitle}>Predecessor Tasks</div>
          {predTasks.length > 0 ? (
            predTasks.map(p => (
              <div key={p.id} className={styles.predItem}>
                <span>{p.text}</span>
                <button className={styles.btnSmDanger} onClick={() => removePredecessor(milestoneId, t.id, p.id)}>Remove</button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>No predecessors set.</p>
          )}
          {availPreds.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <select
                className={styles.predSelect}
                defaultValue=""
                onChange={e => { if (e.target.value) { addPredecessor(milestoneId, t.id, e.target.value); e.target.value = ''; } }}
              >
                <option value="">— Add predecessor —</option>
                {availPreds.map(p => (
                  <option key={p.id} value={p.id}>{p.text.slice(0, 60)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className={styles.subtaskArea}>
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

          {addingSubtask ? (
            <form onSubmit={handleAddSubtask} className={styles.addSubRow}>
              <input
                autoFocus
                className={styles.addSubInput}
                value={addSubText}
                onChange={e => setAddSubText(e.target.value)}
                placeholder="New subtask…"
              />
              <button type="submit" className={styles.btnSm}>Add</button>
              <button type="button" className={styles.btnSmGhost} onClick={() => { setAddingSubtask(false); setAddSubText(''); }}>Cancel</button>
            </form>
          ) : (
            <button className={styles.addSubBtn} onClick={() => setAddingSubtask(true)}>+ Add subtask</button>
          )}
        </div>
      )}
    </div>
  );
}
