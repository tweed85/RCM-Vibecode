import { NavLink, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { colorMap } from '../../constants/colors';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',       color: '#1d9e75', title: 'Overview and milestone summary' },
  { to: '/tasks',      label: 'Tasks',            color: '#0f6e56', title: 'Manage tasks, subtasks and predecessors' },
  { to: '/timeline',   label: 'Project Timeline', color: '#185fa5', title: 'Gantt chart with WBS numbering' },
  { to: '/raid',       label: 'RAID Log',         color: '#534ab7', title: 'Risks, Actions, Issues, Dependencies' },
  { to: '/decisions',  label: 'Decision Log',     color: '#ba7517', title: 'Key decisions, owners and rationale' },
];

export function Sidebar() {
  const { projects, activeProject, setActiveFilter } = useProjectStore();
  const proj = projects[activeProject];
  const navigate = useNavigate();

  function handleWsClick(wsId: string) {
    setActiveFilter(wsId);
    navigate('/dashboard');
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionLabel}>Views</div>

      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.title}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <div className={styles.navDot} style={{ background: item.color }} />
          {item.label}
        </NavLink>
      ))}

      <div className={styles.sectionLabel} style={{ marginTop: 16 }}>
        Workstreams
        <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text3)', marginLeft: 5, textTransform: 'none', letterSpacing: 0 }}>→ filters dashboard</span>
      </div>

      {proj.config.workstreams.map(ws => {
        const col = colorMap[ws.color] ?? colorMap.blue;
        return (
          <button
            key={ws.id}
            className={styles.navItem}
            onClick={() => handleWsClick(ws.id)}
            title={ws.amOwner}
          >
            <div className={styles.navDot} style={{ background: col.text }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span>{ws.label}</span>
              {ws.amOwner && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ws.amOwner}</span>}
            </div>
          </button>
        );
      })}

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <NavLink
          to="/milestones"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          style={{ fontSize: 12, color: 'var(--blue)' }}
        >
          + Add Milestone
        </NavLink>
      </div>
    </aside>
  );
}
