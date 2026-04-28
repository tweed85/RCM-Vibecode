import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { parseSmartsheetXlsx, buildImportedProject } from '../../utils/importXlsx';
import type { Milestone } from '../../store/types';

interface Props {
  onClose: () => void;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 24,
};

const modal: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '28px 32px', width: '100%', maxWidth: 520,
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

type Mode = 'new' | 'append';

type ParseState =
  | { stage: 'idle' }
  | { stage: 'parsing' }
  | { stage: 'done'; milestones: Milestone[]; warnings: string[] }
  | { stage: 'error'; message: string };

export function ImportModal({ onClose }: Props) {
  const { projects, activeProject, addProject, appendMilestonesToProject } = useProjectStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>('new');
  const [projectName, setProjectName] = useState('');
  const [appendTarget, setAppendTarget] = useState<number>(activeProject);
  const [parseState, setParseState] = useState<ParseState>({ stage: 'idle' });
  const headingId = useRef(`import-modal-title-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setParseState({ stage: 'error', message: 'Only .xlsx files are supported.' });
      return;
    }
    setParseState({ stage: 'parsing' });
    try {
      const result = await parseSmartsheetXlsx(file);
      setParseState({ stage: 'done', milestones: result.milestones, warnings: result.warnings });
      if (!projectName) {
        setProjectName(file.name.replace(/\.xlsx$/i, '').replace(/[-_]/g, ' '));
      }
    } catch (err) {
      setParseState({ stage: 'error', message: String(err) });
    }
  }, [projectName]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (parseState.stage !== 'done') return;

    if (mode === 'new') {
      const name = projectName.trim() || 'Imported Project';
      addProject(buildImportedProject(name, parseState.milestones));
      onClose();
      navigate('/dashboard');
    } else {
      appendMilestonesToProject(appendTarget, parseState.milestones);
      onClose();
      navigate('/dashboard');
    }
  }

  const taskCount = parseState.stage === 'done'
    ? parseState.milestones.reduce((sum, m) => sum + m.tasks.length, 0)
    : 0;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', fontSize: 13, fontWeight: active ? 600 : 400,
    border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
    background: active ? '#0085CA' : 'transparent',
    color: active ? 'white' : 'var(--text2)',
    transition: 'all 0.15s',
  });

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        style={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId.current}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 id={headingId.current} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Import from SmartSheets XLSX</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text3)', padding: '0 4px' }}
          >×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button type="button" style={tabStyle(mode === 'new')} onClick={() => setMode('new')}>
            Create new project
          </button>
          <button type="button" style={tabStyle(mode === 'append')} onClick={() => setMode('append')}>
            Append to existing
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Drop an XLSX file here or press Enter to browse"
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '32px 16px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 20,
            background: dragging ? 'var(--hover)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Drop an <strong>.xlsx</strong> file here, or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Expected format: SmartSheets export with Milestone / Tasks / Key Decis columns
          </div>
        </div>

        {/* Status feedback */}
        {parseState.stage === 'parsing' && (
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Parsing…</div>
        )}

        {parseState.stage === 'error' && (
          <div role="alert" style={{ fontSize: 13, color: '#e53e3e', marginBottom: 16, padding: '8px 12px', background: '#fff5f5', borderRadius: 6 }}>
            {parseState.message}
          </div>
        )}

        {parseState.stage === 'done' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 6, marginBottom: 8,
              background: 'var(--hover)', fontSize: 13, color: 'var(--text)',
            }}>
              Found <strong>{parseState.milestones.length}</strong> milestone{parseState.milestones.length !== 1 ? 's' : ''} and <strong>{taskCount}</strong> task{taskCount !== 1 ? 's' : ''}
            </div>
            {parseState.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: '#b45309', padding: '6px 10px', background: '#fffbeb', borderRadius: 4, marginBottom: 4 }}>
                ⚠ {w}
              </div>
            ))}
          </div>
        )}

        {/* Mode-specific fields */}
        {parseState.stage === 'done' && mode === 'new' && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Project Name</label>
            <input
              style={fieldStyle}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Memorial Health System"
              autoFocus
            />
          </div>
        )}

        {parseState.stage === 'done' && mode === 'append' && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Append milestones to</label>
            <select
              style={fieldStyle}
              value={appendTarget}
              onChange={e => setAppendTarget(Number(e.target.value))}
            >
              {projects.map((p, i) => (
                <option key={i} value={i}>{p.config.clientName}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={{ fontSize: 13, padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
            onClick={onClose}
          >Cancel</button>
          {parseState.stage === 'done' && (
            <button
              type="button"
              style={{ fontSize: 13, padding: '6px 16px', border: 'none', borderRadius: 6, background: '#0085CA', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleSubmit}
            >{mode === 'new' ? 'Create Project' : 'Append Milestones'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
