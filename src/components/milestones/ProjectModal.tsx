import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { EHR_OPTIONS, ENGAGEMENT_TYPES } from '../../constants/enums';
import { uid } from '../../utils/uid';
import { parseSmartsheetXlsx } from '../../utils/importXlsx';
import type { ProjectConfig, Milestone } from '../../store/types';

interface Props {
  mode: 'new' | 'edit';
  onClose: () => void;
}

const BLANK_CONFIG: ProjectConfig = {
  clientName: '',
  ehr: 'Epic',
  ehrCustom: '',
  engagementType: 'Implementation',
  projectStatus: 'On Track',
  startDate: '',
  managingDirector: '',
  lead: '',
  payers: [],
  denials: [],
  roles: [],
  workstreams: [{ id: uid(), label: 'Workstream 1', color: 'blue', amOwner: '' }],
  clientRoster: [],
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 24,
};

const modal: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '28px 32px', width: '100%', maxWidth: 560,
  maxHeight: '90vh', overflowY: 'auto',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

type ImportState =
  | { stage: 'idle' }
  | { stage: 'parsing' }
  | { stage: 'done'; milestones: Milestone[]; warnings: string[] }
  | { stage: 'error'; message: string };

export function ProjectModal({ mode, onClose }: Props) {
  const { projects, activeProject, updateProjectConfig, addProject, deleteProject, appendMilestonesToProject } = useProjectStore();
  const navigate = useNavigate();
  const existing = projects[activeProject].config;

  const [form, setForm] = useState<ProjectConfig>(
    mode === 'edit' ? { ...existing } : { ...BLANK_CONFIG }
  );
  const [copyFrom, setCopyFrom] = useState<number>(-1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ stage: 'idle' });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof ProjectConfig>(key: K, val: ProjectConfig[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleCopyFrom(idx: number) {
    setCopyFrom(idx);
    if (idx >= 0) {
      const src = projects[idx].config;
      setForm(f => ({
        ...f,
        ehr: src.ehr,
        ehrCustom: src.ehrCustom,
        engagementType: src.engagementType,
        roles: src.roles.map(r => ({ ...r })),
        workstreams: src.workstreams.map(w => ({ ...w, id: uid() })),
        payers: [...src.payers],
        denials: [...src.denials],
      }));
    }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setImportState({ stage: 'error', message: 'Only .xlsx files are supported.' });
      return;
    }
    setImportState({ stage: 'parsing' });
    try {
      const result = await parseSmartsheetXlsx(file);
      setImportState({ stage: 'done', milestones: result.milestones, warnings: result.warnings });
    } catch (err) {
      setImportState({ stage: 'error', message: String(err) });
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim()) return;

    const importedMilestones = importState.stage === 'done' ? importState.milestones : [];

    if (mode === 'edit') {
      updateProjectConfig(form);
      if (importedMilestones.length > 0) {
        appendMilestonesToProject(activeProject, importedMilestones);
      }
    } else {
      // Ensure the 'imported' workstream exists if we have imported milestones
      const config = { ...form };
      if (importedMilestones.length > 0 && !config.workstreams.find(w => w.id === 'imported')) {
        config.workstreams = [...config.workstreams, { id: 'imported', label: 'Imported', color: 'blue', amOwner: '' }];
      }
      addProject({
        config,
        milestones: importedMilestones,
        activeFilter: 'all',
        activeRaidTab: 'all',
        raid: [],
        decisions: [],
        tasksFilterWs: 'all',
        tasksFilterStatus: 'all',
      });
    }
    onClose();
    navigate('/dashboard');
  }

  const importedCount = importState.stage === 'done' ? importState.milestones.length : 0;
  const taskCount = importState.stage === 'done'
    ? importState.milestones.reduce((s, m) => s + m.tasks.length, 0)
    : 0;

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {mode === 'new' ? 'New Project' : 'Edit Project'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text3)', padding: '0 4px' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'new' && projects.length > 0 && (
            <Field label="Copy settings from">
              <select style={fieldStyle} value={copyFrom} onChange={e => handleCopyFrom(Number(e.target.value))}>
                <option value={-1}>— Start blank —</option>
                {projects.map((p, i) => (
                  <option key={i} value={i}>{p.config.clientName}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Client / Project Name *">
            <input
              style={fieldStyle}
              value={form.clientName}
              onChange={e => setField('clientName', e.target.value)}
              placeholder="e.g. Memorial Health System"
              required
              autoFocus
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {form.engagementType !== 'Internal' && (
              <Field label="EHR Platform">
                <select style={fieldStyle} value={form.ehr} onChange={e => setField('ehr', e.target.value as ProjectConfig['ehr'])}>
                  {EHR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            )}
            <Field label="Engagement Type">
              <select
                style={fieldStyle}
                value={form.engagementType}
                onChange={e => {
                  const t = e.target.value as ProjectConfig['engagementType'];
                  setField('engagementType', t);
                  if (t === 'Internal') { setField('ehr', 'Other'); setField('ehrCustom', ''); }
                }}
              >
                {ENGAGEMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          {form.engagementType !== 'Internal' && form.ehr === 'Other' && (
            <Field label="Custom EHR Name">
              <input style={fieldStyle} value={form.ehrCustom} onChange={e => setField('ehrCustom', e.target.value)} placeholder="EHR name" />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Managing Director">
              <input style={fieldStyle} value={form.managingDirector} onChange={e => setField('managingDirector', e.target.value)} placeholder="Name, title" />
            </Field>
            <Field label="Engagement Lead *">
              <input style={fieldStyle} value={form.lead} onChange={e => setField('lead', e.target.value)} placeholder="Name, title" required />
            </Field>
          </div>

          <Field label="Start Date">
            <input type="date" style={fieldStyle} value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
          </Field>

          {/* ── XLSX Import section ── */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16, marginBottom: 4 }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>
              Import milestones from XLSX
              <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--text3)' }}>
                — {mode === 'edit' ? 'appends to this project' : 'pre-fills new project'}
              </span>
            </div>

            <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {importState.stage !== 'done' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '14px 16px', textAlign: 'center',
                  cursor: 'pointer', background: dragging ? 'var(--hover)' : 'transparent',
                  fontSize: 12, color: 'var(--text3)', transition: 'all 0.15s',
                }}
              >
                {importState.stage === 'parsing'
                  ? 'Parsing…'
                  : importState.stage === 'error'
                    ? <span style={{ color: '#e53e3e' }}>{importState.message}</span>
                    : 'Drop a SmartSheets .xlsx here, or click to browse'}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, padding: '8px 12px', background: 'var(--hover)', borderRadius: 6, fontSize: 12, color: 'var(--text)' }}>
                  <strong>{importedCount}</strong> milestone{importedCount !== 1 ? 's' : ''}, <strong>{taskCount}</strong> task{taskCount !== 1 ? 's' : ''}
                  {importState.warnings.length > 0 && (
                    <span style={{ marginLeft: 8, color: '#b45309' }}>· {importState.warnings.length} warning{importState.warnings.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                <button
                  type="button"
                  style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text3)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => { setImportState({ stage: 'idle' }); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >Clear</button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, alignItems: 'center' }}>
            {mode === 'edit' && projects.length > 1 && (
              confirmDelete ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 'auto' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Delete this project?</span>
                  <button
                    type="button"
                    style={{ fontSize: 13, padding: '5px 12px', border: 'none', borderRadius: 6, background: '#e53e3e', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => { deleteProject(activeProject); onClose(); navigate('/dashboard'); }}
                  >Yes, delete</button>
                  <button
                    type="button"
                    style={{ fontSize: 12, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
                    onClick={() => setConfirmDelete(false)}
                  >Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{ fontSize: 13, padding: '5px 12px', border: '1px solid #e53e3e', borderRadius: 6, background: 'transparent', color: '#e53e3e', cursor: 'pointer', marginRight: 'auto' }}
                  onClick={() => setConfirmDelete(true)}
                >Delete project</button>
              )
            )}
            <button
              type="button"
              style={{ fontSize: 13, padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
              onClick={onClose}
            >Cancel</button>
            <button
              type="submit"
              style={{ fontSize: 13, padding: '6px 16px', border: 'none', borderRadius: 6, background: '#0085CA', color: 'white', cursor: 'pointer', fontWeight: 600 }}
            >{mode === 'new' ? 'Create Project' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
