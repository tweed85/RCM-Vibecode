import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { EHR_OPTIONS, ENGAGEMENT_TYPES } from '../../constants/enums';
import { uid } from '../../utils/uid';
import type { ProjectConfig } from '../../store/types';

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

export function ProjectModal({ mode, onClose }: Props) {
  const { projects, activeProject, updateProjectConfig, addProject } = useProjectStore();
  const existing = projects[activeProject].config;

  const [form, setForm] = useState<ProjectConfig>(
    mode === 'edit' ? { ...existing } : { ...BLANK_CONFIG }
  );
  const [copyFrom, setCopyFrom] = useState<number>(-1);

  function set<K extends keyof ProjectConfig>(key: K, val: ProjectConfig[K]) {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim()) return;
    if (mode === 'edit') {
      updateProjectConfig(form);
    } else {
      addProject({
        config: form,
        milestones: [],
        activeFilter: 'all',
        editingId: null,
        activeRaidTab: 'all',
        raid: [],
        decisions: [],
        tasksFilterWs: 'all',
        tasksFilterStatus: 'all',
      });
    }
    onClose();
  }

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
            title="Close"
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'new' && projects.length > 0 && (
            <Field label="Copy settings from">
              <select
                style={fieldStyle}
                value={copyFrom}
                onChange={e => handleCopyFrom(Number(e.target.value))}
              >
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
              onChange={e => set('clientName', e.target.value)}
              placeholder="e.g. Memorial Health System"
              required
              autoFocus
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="EHR Platform">
              <select style={fieldStyle} value={form.ehr} onChange={e => set('ehr', e.target.value as ProjectConfig['ehr'])}>
                {EHR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Engagement Type">
              <select style={fieldStyle} value={form.engagementType} onChange={e => set('engagementType', e.target.value as ProjectConfig['engagementType'])}>
                {ENGAGEMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          {form.ehr === 'Other' && (
            <Field label="Custom EHR Name">
              <input style={fieldStyle} value={form.ehrCustom} onChange={e => set('ehrCustom', e.target.value)} placeholder="EHR name" />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Managing Director">
              <input style={fieldStyle} value={form.managingDirector} onChange={e => set('managingDirector', e.target.value)} placeholder="Name, title" />
            </Field>
            <Field label="Engagement Lead *">
              <input style={fieldStyle} value={form.lead} onChange={e => set('lead', e.target.value)} placeholder="Name, title" required />
            </Field>
          </div>

          <Field label="Start Date">
            <input type="date" style={fieldStyle} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
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
