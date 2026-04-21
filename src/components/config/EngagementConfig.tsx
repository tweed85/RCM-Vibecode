import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { EHR_OPTIONS, ENGAGEMENT_TYPES, PROJECT_STATUSES } from '../../constants/enums';
import type { WorkstreamColor, Role, Workstream } from '../../store/types';
import { uid } from '../../utils/uid';
import { showToast } from '../layout/Toast';
import { triggerSaveIndicator } from '../layout/Topbar';
import styles from './EngagementConfig.module.css';

const COLORS: WorkstreamColor[] = ['blue', 'green', 'purple', 'amber', 'coral', 'teal', 'pink', 'red'];
const COLOR_HEX: Record<WorkstreamColor, string> = {
  blue: '#0085CA', green: '#29702A', purple: '#470858',
  amber: '#CF7F00', coral: '#A6192E', teal: '#00677F',
  pink: '#e91e8c', red: '#A6192E',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
  boxSizing: 'border-box',
};

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  function add() {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setVal('');
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            {t}
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, lineHeight: 1, padding: 0 }}
              onClick={() => onChange(tags.filter(x => x !== t))}
            >×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...fieldStyle, flex: 1 }}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} style={{ padding: '7px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>Add</button>
      </div>
    </div>
  );
}

export function EngagementConfig() {
  const { projects, activeProject, updateProjectConfig } = useProjectStore();
  const cfg = projects[activeProject].config;

  const [clientName, setClientName] = useState(cfg.clientName);
  const [ehr, setEhr] = useState(cfg.ehr);
  const [engagementType, setEngagementType] = useState(cfg.engagementType);
  const [ehrCustom, setEhrCustom] = useState(cfg.ehrCustom ?? '');
  const [projectStatus, setProjectStatus] = useState(cfg.projectStatus ?? 'On Track');
  const [startDate, setStartDate] = useState(cfg.startDate ?? '');
  const [managingDirector, setManagingDirector] = useState(cfg.managingDirector ?? '');
  const [lead, setLead] = useState(cfg.lead ?? '');
  const [roles, setRoles] = useState<Role[]>(cfg.roles.map(r => ({ ...r })));
  const [workstreams, setWorkstreams] = useState<Workstream[]>(cfg.workstreams.map(w => ({ ...w })));
  const [payers, setPayers] = useState<string[]>([...cfg.payers]);
  const [denials, setDenials] = useState<string[]>([...cfg.denials]);

  function saveAll() {
    updateProjectConfig({ clientName, ehr, engagementType, ehrCustom, projectStatus: projectStatus as typeof cfg.projectStatus, startDate, managingDirector, lead, roles, workstreams, payers, denials });
    showToast('Configuration saved');
    triggerSaveIndicator();
  }

  function addRole() {
    setRoles(r => [...r, { key: '', clientRole: '' }]);
  }

  function updateRole(idx: number, field: keyof Role, val: string) {
    setRoles(r => r.map((x, i) => i === idx ? { ...x, [field]: val } : x));
  }

  function removeRole(idx: number) {
    setRoles(r => r.filter((_, i) => i !== idx));
  }

  function addWorkstream() {
    setWorkstreams(w => [...w, { id: uid(), label: '', color: 'blue', amOwner: '' }]);
  }

  function updateWs(idx: number, updates: Partial<Workstream>) {
    setWorkstreams(w => w.map((x, i) => i === idx ? { ...x, ...updates } : x));
  }

  function removeWs(idx: number) {
    setWorkstreams(w => w.filter((_, i) => i !== idx));
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Engagement Configuration</h1>
          <p className={styles.sub}>{cfg.clientName}</p>
        </div>
        <button className={styles.btnPrimary} onClick={saveAll}>Save Configuration</button>
      </div>

      <div className={styles.grid}>
        {/* Left column */}
        <div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Project Details</h2>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Client / Project Name</label>
              <input style={fieldStyle} value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>EHR Platform</label>
                <select style={fieldStyle} value={ehr} onChange={e => setEhr(e.target.value as typeof cfg.ehr)}>
                  {EHR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Engagement Type</label>
                <select style={fieldStyle} value={engagementType} onChange={e => setEngagementType(e.target.value as typeof cfg.engagementType)}>
                  {ENGAGEMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {ehr === 'Other' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Custom EHR</label>
                <input style={fieldStyle} value={ehrCustom} onChange={e => setEhrCustom(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Project Status</label>
                <select style={fieldStyle} value={projectStatus} onChange={e => setProjectStatus(e.target.value)}>
                  {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Start Date</label>
                <input type="date" style={fieldStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Managing Director</label>
              <input style={fieldStyle} value={managingDirector} onChange={e => setManagingDirector(e.target.value)} placeholder="Name, title" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Engagement Lead</label>
              <input style={fieldStyle} value={lead} onChange={e => setLead(e.target.value)} placeholder="Name, title" />
            </div>
          </div>

          <div className={styles.card} style={{ marginTop: 16 }}>
            <h2 className={styles.cardTitle}>Payers</h2>
            <TagInput tags={payers} onChange={setPayers} placeholder="Add payer name…" />
          </div>

          <div className={styles.card} style={{ marginTop: 16 }}>
            <h2 className={styles.cardTitle}>Top Denial Reasons</h2>
            <TagInput tags={denials} onChange={setDenials} placeholder="Add denial reason…" />
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>Client Roles</h2>
              <button className={styles.addBtn} onClick={addRole}>+ Add</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Map A&M role labels to your client's actual role titles.
            </p>
            {roles.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  style={fieldStyle}
                  value={r.key}
                  onChange={e => updateRole(i, 'key', e.target.value)}
                  placeholder="A&M label (e.g. Auth Lead)"
                />
                <input
                  style={fieldStyle}
                  value={r.clientRole}
                  onChange={e => updateRole(i, 'clientRole', e.target.value)}
                  placeholder="Client title"
                />
                <button
                  onClick={() => removeRole(i)}
                  style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text3)', fontSize: 14, fontWeight: 700 }}
                >×</button>
              </div>
            ))}
          </div>

          <div className={styles.card} style={{ marginTop: 16 }}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>Workstreams</h2>
              <button className={styles.addBtn} onClick={addWorkstream}>+ Add</button>
            </div>
            {workstreams.map((w, i) => (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  style={fieldStyle}
                  value={w.label}
                  onChange={e => updateWs(i, { label: e.target.value })}
                  placeholder="Workstream name"
                />
                <input
                  style={fieldStyle}
                  value={w.amOwner}
                  onChange={e => updateWs(i, { amOwner: e.target.value })}
                  placeholder="A&M owner"
                />
                <select
                  style={{ ...fieldStyle, width: 'auto', paddingLeft: 8 }}
                  value={w.color}
                  onChange={e => updateWs(i, { color: e.target.value as WorkstreamColor })}
                  title="Color"
                >
                  {COLORS.map(c => (
                    <option key={c} value={c} style={{ background: COLOR_HEX[c], color: 'white' }}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeWs(i)}
                  style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text3)', fontSize: 14, fontWeight: 700 }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className={styles.btnPrimary} onClick={saveAll}>Save Configuration</button>
      </div>
    </div>
  );
}
