import { useState } from 'react';
import type { Subtask } from '../../store/types';
import { useProjectStore } from '../../store/useProjectStore';
import { getWbs } from '../../utils/wbs';
import { WbsBadge } from '../shared/WbsBadge';
import styles from './SubtaskRow.module.css';

interface Props {
  subtask: Subtask;
  sIdx: number;
  mIdx: number;
  tIdx: number;
  milestoneId: number;
  taskId: string;
  taskStartDate?: string;
  taskEndDate?: string;
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

export function SubtaskRow({ subtask: st, sIdx, mIdx, tIdx, milestoneId, taskId, taskStartDate = '', taskEndDate = '' }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(st.text);
  const [editingDates, setEditingDates] = useState(false);
  const { toggleSubtask, updateSubtask, deleteSubtask } = useProjectStore();

  const effectiveStart = st.startDate || taskStartDate;
  const effectiveEnd = st.endDate || taskEndDate;
  const inherited = !st.startDate && !st.endDate && (effectiveStart || effectiveEnd);
  const display = dateRange(effectiveStart, effectiveEnd);

  function save() {
    if (val.trim()) updateSubtask(milestoneId, taskId, st.id, { text: val.trim() });
    setEditing(false);
  }

  function saveDate(field: 'startDate' | 'endDate', value: string) {
    updateSubtask(milestoneId, taskId, st.id, { [field]: value });
  }

  return (
    <div className={`${styles.row} ${st.done ? styles.done : ''}`}>
      <div className={styles.left}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={st.done}
          onChange={() => toggleSubtask(milestoneId, taskId, st.id)}
        />
        <WbsBadge wbs={getWbs(mIdx, tIdx, sIdx)} small />
        {editing ? (
          <input
            autoFocus
            className={styles.editInput}
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(st.text); } }}
          />
        ) : (
          <span
            className={`${styles.text} ${st.done ? styles.strikethrough : ''}`}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
          >
            {st.text}
          </span>
        )}
      </div>

      <div className={styles.right}>
        <div className={styles.slotDate}>
          {editingDates ? (
            <div className={styles.dateInputs}>
              <input type="date" className={styles.dateInput} defaultValue={st.startDate} placeholder={taskStartDate} onBlur={e => saveDate('startDate', e.target.value)} />
              <span className={styles.dateSep}>–</span>
              <input type="date" className={styles.dateInput} defaultValue={st.endDate} placeholder={taskEndDate} onBlur={e => saveDate('endDate', e.target.value)} />
              <button className={styles.dateClose} onClick={() => setEditingDates(false)}>✕</button>
            </div>
          ) : (
            <span
              className={`${styles.dateDisplay} ${inherited ? styles.dateInherited : ''}`}
              onClick={() => setEditingDates(true)}
              title={inherited ? 'Using parent task dates — click to set own dates' : 'Click to edit dates'}
            >
              {display || <span className={styles.dateEmpty}>set dates</span>}
            </span>
          )}
        </div>

        <div className={styles.slotOwner}>
          {st.owner && <span className={styles.ownerPill}>{st.owner}</span>}
        </div>

        <div className={styles.slotActions}>
          <button className={styles.del} onClick={() => deleteSubtask(milestoneId, taskId, st.id)} title="Delete subtask">×</button>
        </div>
      </div>
    </div>
  );
}
