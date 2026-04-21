import { Routes, Route, Navigate } from 'react-router-dom';
import { Topbar } from './components/layout/Topbar';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/layout/Toast';
import { Dashboard } from './components/dashboard/Dashboard';
import { TasksView } from './components/tasks/TasksView';
import { TaskDetail } from './components/tasks/TaskDetail';
import { Timeline } from './components/timeline/Timeline';
import { RaidLog } from './components/raid/RaidLog';
import { DecisionLog } from './components/decisions/DecisionLog';
import { EngagementConfig } from './components/config/EngagementConfig';
import { AddMilestone } from './components/milestones/AddMilestone';
import { AuthScreen } from './components/auth/AuthScreen';
import { useAuth } from './hooks/useAuth';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import styles from './App.module.css';

function AppShell() {
  return (
    <>
      <Topbar />
      <div className={styles.appLayout}>
        <Sidebar />
        <main className={styles.main}>
          <Routes>
            <Route path="/"            element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/tasks"       element={<TasksView />} />
            <Route path="/tasks/:tid"  element={<TaskDetail />} />
            <Route path="/timeline"    element={<Timeline />} />
            <Route path="/raid"        element={<RaidLog />} />
            <Route path="/decisions"   element={<DecisionLog />} />
            <Route path="/config"      element={<EngagementConfig />} />
            <Route path="/milestones"  element={<AddMilestone />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  useSupabaseSync(user);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading…</div>
    </div>
  );

  if (!user) return <AuthScreen />;

  return <AppShell />;
}
