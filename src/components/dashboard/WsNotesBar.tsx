import { useState } from 'react';
import type { Workstream } from '../../store/types';
import { wsColorHex } from '../../constants/colors';
import { useProjectStore } from '../../store/useProjectStore';

interface Props { workstreams: Workstream[]; }

export function WsNotesBar({ workstreams }: Props) {
  const [open, setOpen] = useState(false);
  const { updateProjectConfig, projects, activeProject } = useProjectStore();
  const cfg = projects[activeProject].config;

  function saveNote(wsId: string, note: string) {
    const wss = cfg.workstreams.map(w => w.id === wsId ? { ...w, note } : w);
    updateProjectConfig({ workstreams: wss });
  }

  function saveExport(wsId: string, checked: boolean) {
    const wss = cfg.workstreams.map(w => w.id === wsId ? { ...w, noteExport: checked } : w);
    updateProjectConfig({ workstreams: wss });
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1rem', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Workstream status updates</span>
        <span style={{ fontSize: 12, color: 'var(--text3)', transform: open ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }}>›</span>
      </div>

      {open && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 8 }}>
            {workstreams.map(ws => {
              const wc = wsColorHex[ws.color] ?? '#0085CA';
              return (
                <div key={ws.id} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: wc, flexShrink: 0 }} />
                    {ws.label}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', cursor: 'pointer', fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={ws.noteExport ?? false}
                        onChange={e => saveExport(ws.id, e.target.checked)}
                      />
                      include in slide
                    </label>
                  </div>
                  <textarea
                    defaultValue={ws.note ?? ''}
                    placeholder={`Add a status update for ${ws.label}…`}
                    onBlur={e => saveNote(ws.id, e.target.value)}
                    style={{
                      width: '100%', padding: '5px 8px',
                      border: '1px solid var(--border)', borderRadius: 6,
                      fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
                      resize: 'none', minHeight: 52, lineHeight: 1.5,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
