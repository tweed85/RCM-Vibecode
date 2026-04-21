import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { raidTypeColors } from '../../constants/colors';
import { raidStatusLabels } from '../../constants/enums';
import { getAllTasksFlat } from '../../utils/linkedItems';
import { ConfirmButton } from '../shared/ConfirmButton';
import type { RaidItem, RaidType, RaidStatus, RaidPriority } from '../../store/types';
import styles from './RaidLog.module.css';

const TABS = ['all', 'risk', 'action', 'issue', 'dependency'] as const;
const PRIORITIES: RaidPriority[] = ['high', 'medium', 'low'];
const STATUSES: RaidStatus[] = ['open', 'inprogress', 'closed'];

const BLANK: Omit<RaidItem, 'id'> = {
  type: 'risk', priority: 'medium', title: '', description: '', mitigation: '',
  owner: '', dueDate: '', status: 'open', linkedTasks: [],
};

const PRIORITY_COLORS: Record<RaidPriority, string> = {
  high: '#A6192E', medium: '#CF7F00', low: '#29702A',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '6px 9px',
  border: '1px solid var(--border)', borderRadius: 5,
  fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

export function RaidLog() {
  const navigate = useNavigate();
  const { projects, activeProject, setActiveRaidTab, addRaidItem, updateRaidItem, deleteRaidItem } = useProjectStore();
  const proj = projects[activeProject];
  const tab = proj.activeRaidTab;

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RaidItem, 'id'>>({ ...BLANK });
  const [showAdd, setShowAdd] = useState(false);

  const PRIORITY_ORDER: Record<RaidPriority, number> = { high: 0, medium: 1, low: 2 };
  const items = proj.raid ?? [];
  const filtered = (tab === 'all' ? items : items.filter(r => r.type === tab))
    .slice()
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const allTasks = getAllTasksFlat(proj);

  function openEdit(r: RaidItem) {
    setEditId(r.id);
    setForm({ ...r });
    setShowAdd(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      updateRaidItem(editId, form);
      setEditId(null);
    } else {
      addRaidItem(form);
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

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === 'all' ? items.length : items.filter(r => r.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>RAID Log</h1>
          <p className={styles.sub}>Risks · Actions · Issues · Dependencies</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...BLANK }); }}>
          + Add Item
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveRaidTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {counts[t] > 0 && <span className={styles.tabCount}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      {(showAdd || editId) && (
        <div className={styles.formCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
            {editId ? 'Edit RAID Item' : 'New RAID Item'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label className={styles.label}>Type</label>
                <select style={fieldStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RaidType }))}>
                  <option value="risk">Risk</option>
                  <option value="action">Action</option>
                  <option value="issue">Issue</option>
                  <option value="dependency">Dependency</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>Priority</label>
                <select style={fieldStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as RaidPriority }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.label}>Status</label>
                <select style={fieldStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RaidStatus }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{raidStatusLabels[s]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Title *</label>
              <input style={fieldStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Brief title" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Description</label>
              <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details…" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className={styles.label}>Mitigation / Response</label>
              <textarea style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }} value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Mitigation steps…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label className={styles.label}>Owner</label>
                <input style={fieldStyle} value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Assignee" />
              </div>
              <div>
                <label className={styles.label}>Due Date</label>
                <input type="date" style={fieldStyle} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
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
              <button type="submit" className={styles.btnPrimary}>{editId ? 'Save' : 'Add Item'}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>No {tab === 'all' ? 'RAID' : tab} items.</div>
      ) : (
        filtered.map(r => {
          const tc = raidTypeColors[r.type] ?? { bg: 'var(--surface2)', text: 'var(--text2)' };
          const pc = PRIORITY_COLORS[r.priority];
          const linkedTaskObjs = allTasks.filter(ft => r.linkedTasks.includes(ft.tid));
          return (
            <div key={r.id} className={`${styles.card} ${r.status === 'closed' ? styles.closed : ''}`}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: tc.bg, color: tc.text }}>
                    {r.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: pc }}>● {r.priority}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: r.status === 'closed' ? 'var(--surface2)' : r.status === 'inprogress' ? 'var(--amber-bg)' : 'var(--red-bg)',
                    color: r.status === 'closed' ? 'var(--text3)' : r.status === 'inprogress' ? 'var(--amber)' : 'var(--red)',
                  }}>{raidStatusLabels[r.status]}</span>
                  {r.owner && <span className={styles.ownerPill}>{r.owner}</span>}
                  {r.dueDate && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.dueDate}</span>}
                  <button className={styles.editBtn} onClick={() => openEdit(r)}>Edit</button>
                  <ConfirmButton className={styles.delBtn} onConfirm={() => deleteRaidItem(r.id)} confirmLabel="Delete?">×</ConfirmButton>
                </div>
              </div>
              {(r.description || r.mitigation) && (
                <div className={styles.cardBody}>
                  {r.description && <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{r.description}</p>}
                  {r.mitigation && <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0', fontStyle: 'italic' }}>↪ {r.mitigation}</p>}
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
