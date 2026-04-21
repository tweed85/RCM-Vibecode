import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { getAllTasksFlat } from '../../utils/linkedItems';
import { ConfirmButton } from '../shared/ConfirmButton';
import type { DecisionItem, DecisionStatus } from '../../store/types';
import styles from './DecisionLog.module.css';

const STATUS_STYLES: Record<DecisionStatus, { bg: string; color: string }> = {
  approved: { bg: '#e8f5e8', color: '#29702A' },
  pending:  { bg: '#fff3d6', color: '#8a5500' },
  deferred: { bg: '#edf1f5', color: '#646464' },
};

const BLANK: Omit<DecisionItem, 'id'> = {
  title: '', description: '', rationale: '', alternatives: '',
  owner: '', date: '', status: 'pending', linkedTasks: [],
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '6px 9px',
  border: '1px solid var(--border)', borderRadius: 5,
  fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

export function DecisionLog() {
  const navigate = useNavigate();
  const { projects, activeProject, addDecision, updateDecision, deleteDecision } = useProjectStore();
  const proj = projects[activeProject];
  const decisions = proj.decisions ?? [];

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<DecisionItem, 'id'>>({ ...BLANK });
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'all'>('all');

  const filtered = filterStatus === 'all' ? decisions : decisions.filter(d => d.status === filterStatus);
  const allTasks = getAllTasksFlat(proj);

  function openEdit(d: DecisionItem) {
    setEditId(d.id);
    setForm({ ...d });
    setShowAdd(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      updateDecision(editId, form);
      setEditId(null);
    } else {
      addDecision(form);
      setShowAdd(false);
    }
    setForm({ ...BLANK });
  }

  function cancelForm() {
    setEditId(null);
    setShowAdd(false);
    setForm({ ...BLANK });
  }

  function toggleLinkedTask(tid: string) {
    setForm(f => ({
      ...f,
      linkedTasks: f.linkedTasks.includes(tid)
        ? f.linkedTasks.filter(x => x !== tid)
        : [...f.linkedTasks, tid],
    }));
  }

  const counts = (['all', 'approved', 'pending', 'deferred'] as const).reduce((acc, s) => {
    acc[s] = s === 'all' ? decisions.length : decisions.filter(d => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Decision Log</h1>
          <p className={styles.sub}>{decisions.length} decisions recorded</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...BLANK }); }}>
          + Log Decision
        </button>
      </div>

      <div className={styles.tabs}>
        {(['all', 'approved', 'pending', 'deferred'] as const).map(s => (
          <button
            key={s}
            className={`${styles.tab} ${filterStatus === s ? styles.tabActive : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {counts[s] > 0 && <span className={styles.tabCount}>{counts[s]}</span>}
          </button>
        ))}
      </div>

      {(showAdd || editId) && (
        <div className={styles.formCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
            {editId ? 'Edit Decision' : 'Log Decision'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Title *</label>
              <input style={fieldStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Decision title" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Description</label>
              <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was decided?" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Rationale</label>
              <textarea style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }} value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} placeholder="Why was this decided?" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Alternatives Considered</label>
              <input style={fieldStyle} value={form.alternatives} onChange={e => setForm(f => ({ ...f, alternatives: e.target.value }))} placeholder="Other options considered" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label className={styles.label}>Owner</label>
                <input style={fieldStyle} value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Decision owner" />
              </div>
              <div>
                <label className={styles.label}>Date</label>
                <input type="date" style={fieldStyle} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={styles.label}>Status</label>
                <select style={fieldStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DecisionStatus }))}>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="deferred">Deferred</option>
                </select>
              </div>
            </div>

            {/* Task linking */}
            {allTasks.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label className={styles.label}>Linked Tasks</label>
                <div className={styles.taskLinkGrid}>
                  {allTasks.map(ft => (
                    <label key={ft.tid} className={`${styles.taskLinkItem} ${form.linkedTasks.includes(ft.tid) ? styles.taskLinkChecked : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.linkedTasks.includes(ft.tid)}
                        onChange={() => toggleLinkedTask(ft.tid)}
                        style={{ accentColor: '#0085CA' }}
                      />
                      <span className={styles.taskLinkWbs}>{ft.wbs}</span>
                      <span className={styles.taskLinkText}>{ft.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className={styles.btnGhost} onClick={cancelForm}>Cancel</button>
              <button type="submit" className={styles.btnPrimary}>{editId ? 'Save' : 'Log Decision'}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>No decisions {filterStatus !== 'all' ? `with status "${filterStatus}"` : ''} yet.</div>
      ) : (
        filtered.map(d => {
          const ss = STATUS_STYLES[d.status];
          const linkedTaskObjs = allTasks.filter(ft => d.linkedTasks.includes(ft.tid));
          return (
            <div key={d.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ss.bg, color: ss.color, flexShrink: 0 }}>
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {d.owner && <span className={styles.ownerPill}>{d.owner}</span>}
                  {d.date && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.date}</span>}
                  <button className={styles.editBtn} onClick={() => openEdit(d)}>Edit</button>
                  <ConfirmButton className={styles.delBtn} onConfirm={() => deleteDecision(d.id)} confirmLabel="Delete?">×</ConfirmButton>
                </div>
              </div>
              {(d.description || d.rationale || d.alternatives) && (
                <div className={styles.cardBody}>
                  {d.description && <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{d.description}</p>}
                  {d.rationale && <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>↪ Rationale: {d.rationale}</p>}
                  {d.alternatives && <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0', fontStyle: 'italic' }}>Alternatives: {d.alternatives}</p>}
                </div>
              )}
              {linkedTaskObjs.length > 0 && (
                <div className={styles.linkedTasksRow}>
                  {linkedTaskObjs.map(ft => (
                    <button
                      key={ft.tid}
                      className={styles.linkedTaskChip}
                      title={`${ft.milestoneTitle} — click to open`}
                      onClick={() => navigate(`/tasks/${ft.tid}`)}
                    >
                      {ft.wbs} {ft.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
