import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { THEME_KEY } from '../../constants/enums';
import { SaveIndicator, triggerSaveIndicator } from './SaveIndicator';
import { ProjectModal } from '../milestones/ProjectModal';
import { exportSlide } from '../../utils/export';
import { supabase } from '../../lib/supabase';
import styles from './Topbar.module.css';

export { triggerSaveIndicator };

export function Topbar() {
  const { projects, activeProject, setActiveProject, resetToDefaults } = useProjectStore();
  const proj = projects[activeProject];
  const cfg = proj.config;
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') ?? 'light'
  );
  const [projectModalMode, setProjectModalMode] = useState<'new' | 'edit' | null>(null);
  const [showProjMenu, setShowProjMenu] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const ehrLabel = cfg.ehr === 'Other' ? cfg.ehrCustom : cfg.ehr;

  function handleReset() {
    if (!window.confirm('Clear all saved data and reset to defaults? This cannot be undone.')) return;
    resetToDefaults();
    navigate('/dashboard');
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          <img src="/am-logo.png" alt="Alvarez & Marsal" className={styles.logo} />
          <div className={styles.meridianTitle}>Meridian</div>

          <div className={styles.projSwitcher}>
            <select
              className={styles.projSelect}
              value={activeProject}
              onChange={e => { setActiveProject(Number(e.target.value)); navigate('/dashboard'); }}
            >
              {projects.map((p, i) => (
                <option key={i} value={i}>
                  {p.config.clientName} · {p.config.engagementType}
                </option>
              ))}
            </select>
            {ehrLabel && <span className={styles.ehrBadge}>{ehrLabel}</span>}
          </div>
        </div>

        <div className={styles.actions}>
          <SaveIndicator />
          <button
            className={styles.btn}
            title="Toggle dark/light mode"
            style={{ fontSize: 16, padding: '4px 10px' }}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀' : '⏾'}
          </button>
          <div className={styles.separator} />
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleReset} title="Reset all data to defaults">Reset</button>
          <button className={styles.btn} onClick={() => supabase.auth.signOut()} title="Sign out">Sign Out</button>
          <button className={styles.btn} onClick={() => navigate('/config')}>Configure</button>
          <button className={styles.btn} onClick={() => exportSlide(proj)}>Export Slide</button>
          <div className={styles.separator} />
          <div className={styles.projMenuWrap}>
            <button
              className={styles.hamburger}
              title="Project actions"
              onClick={() => setShowProjMenu(v => !v)}
            >
              <span /><span /><span />
            </button>
            {showProjMenu && (
              <>
                <div className={styles.projMenuBackdrop} onClick={() => setShowProjMenu(false)} />
                <div className={styles.projMenu}>
                  <button className={styles.projMenuItem} onClick={() => { setShowProjMenu(false); setProjectModalMode('edit'); }}>Edit project</button>
                  <button className={styles.projMenuItem} onClick={() => { setShowProjMenu(false); setProjectModalMode('new'); }}>New project</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {projectModalMode && (
        <ProjectModal
          mode={projectModalMode}
          onClose={() => setProjectModalMode(null)}
        />
      )}
    </>
  );
}
