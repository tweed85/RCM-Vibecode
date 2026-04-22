import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { statusColors, statusBgColors } from '../../constants/colors';
import { MILESTONE_STATUSES, statusLabels, IMPACT_TYPES } from '../../constants/enums';
import type { Milestone, ImpactItem, ImpactType } from '../../store/types';
import { showToast } from '../layout/Toast';
import { ConfirmButton } from '../shared/ConfirmButton';
import styles from './AddMilestone.module.css';

const BLANK_MILESTONE: Omit<Milestone, 'id'> = {
  title: '', workstream: '', status: 'notstarted', owner: '',
  dueDate: '', tasks: [], impact: [], note: '', noteExport: false,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

export function AddMilestone() {
  const { projects, activeProject, addMilestone, updateMilestone, deleteMilestone } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;
  const milestones = proj.milestones;
  const location = useLocation();
  const navigate = useNavigate();
  const editId = (location.state as { editId?: string })?.editId ?? null;
  const editCardRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<Omit<Milestone, 'id'>>({ ...BLANK_MILESTONE });
  const [editingId, setEditingId] = useState<string | null>(editId);
  const [impactRows, setImpactRows] = useState<ImpactItem[]>([{ type: '', projected: '', realized: '' }]);

  useEffect(() => {
    if (editId != null) {
      const m = milestones.find(x => x.id === editId);
      if (m) openEdit(m);
      setTimeout(() => editCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function openEdit(m: Milestone) {
    setEditingId(m.id);
    setForm({ title: m.title, workstream: m.workstream, status: m.status, owner: m.owner, dueDate: m.dueDate, tasks: m.tasks, impact: m.impact, note: m.note, noteExport: m.noteExport });
    setImpactRows(m.impact?.length ? m.impact.map(i => ({ ...i })) : [{ type: '', projected: '', realized: '' }]);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...BLANK_MILESTONE });
    setImpactRows([{ type: '', projected: '', realized: '' }]);
    navigate('/milestones', { replace: true, state: {} });
  }

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const impact = impactRows.filter(i => i.type && i.projected.trim());
    if (editingId != null) {
      updateMilestone(editingId, { ...form, impact });
      showToast('Milestone updated');
    } else {
      addMilestone({ ...form, impact });
      showToast('Milestone added');
    }
    resetForm();
  }

  function handleDelete(id: string) {
    deleteMilestone(id);
    if (editingId === id) resetForm();
    showToast('Milestone deleted');
  }

  const ownerRoles = cfg.roles.map(r => r.key);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{editingId != null ? 'Edit Milestone' : 'Add Milestone'}</h1>
          <p className={styles.sub}>{cfg.clientName} · {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</p>
        </div>
        {editingId != null && (
          <button className={styles.btnGhost} onClick={resetForm}>+ New Milestone</button>
        )}
      </div>

      <div className={styles.grid}>
        {/* Form */}
        <div className={styles.card} ref={editCardRef}>
          <h2 className={styles.cardTitle}>{editingId != null ? 'Edit Milestone' : 'New Milestone'}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Milestone Title *</label>
              <input style={fieldStyle} value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Prior authorization workflow consolidation" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Workstream *</label>
                <select style={fieldStyle} value={form.workstream} onChange={e => set('workstream', e.target.value)} required>
                  <option value="">— Select —</option>
                  {cfg.workstreams.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Status</label>
                <select style={fieldStyle} value={form.status} onChange={e => set('status', e.target.value as Milestone['status'])}>
                  {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Owner</label>
                <select style={fieldStyle} value={form.owner} onChange={e => set('owner', e.target.value)}>
                  <option value="">— Select —</option>
                  {ownerRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Due Date</label>
                <input type="date" style={fieldStyle} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Note</label>
              <textarea style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Status update or note…" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', marginTop: 5, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.noteExport} onChange={e => set('noteExport', e.target.checked)} />
                Include note in slide export
              </label>
            </div>

            {/* Impact */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} style={{ marginBottom: 8 }}>Impact Metrics</label>
              {impactRows.map((imp, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select style={fieldStyle} value={imp.type} onChange={e => setImpactRows(rows => rows.map((r, ri) => ri === i ? { ...r, type: e.target.value as ImpactType } : r))}>
                    <option value="">— Type —</option>
                    {IMPACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input style={fieldStyle} value={imp.projected} onChange={e => setImpactRows(rows => rows.map((r, ri) => ri === i ? { ...r, projected: e.target.value } : r))} placeholder="Projected (e.g. +12%)" />
                  <input style={fieldStyle} value={imp.realized} onChange={e => setImpactRows(rows => rows.map((r, ri) => ri === i ? { ...r, realized: e.target.value } : r))} placeholder="Realized" />
                  <button type="button" style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text3)', fontSize: 14, fontWeight: 700 }} onClick={() => setImpactRows(rows => rows.filter((_, ri) => ri !== i))}>×</button>
                </div>
              ))}
              <button type="button" className={styles.addImpactBtn} onClick={() => setImpactRows(r => [...r, { type: '', projected: '', realized: '' }])}>
                + Add impact metric
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              {editingId != null && <button type="button" className={styles.btnGhost} onClick={resetForm}>Cancel</button>}
              <button type="submit" className={styles.btnPrimary}>{editingId != null ? 'Save Changes' : 'Add Milestone'}</button>
            </div>
          </form>
        </div>

        {/* Milestone list */}
        <div>
          <h2 className={styles.cardTitle} style={{ marginBottom: 10 }}>Milestones ({milestones.length})</h2>
          {milestones.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No milestones yet.</p>
          ) : (
            milestones.map(m => {
              const ws = cfg.workstreams.find(w => w.id === m.workstream);
              return (
                <div key={m.id} className={`${styles.msCard} ${editingId === m.id ? styles.msCardActive : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[m.status], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                    {ws && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: statusBgColors[m.status], color: statusColors[m.status], flexShrink: 0 }}>
                        {statusLabels[m.status]}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className={styles.editBtn} onClick={() => openEdit(m)}>Edit</button>
                    <ConfirmButton className={styles.delBtn} onConfirm={() => handleDelete(m.id)} confirmLabel="Delete?">×</ConfirmButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
