import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './AuthScreen.module.css';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const [mode, setMode]       = useState<Mode>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setError(error.message);
      else setMessage('Password reset link sent — check your email.');
    }

    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <img src="/am-logo.png" alt="A&M" className={styles.logo} />
          <div>
            <div className={styles.appName}>Meridian</div>
            <div className={styles.appSub}>Revenue Cycle Management</div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign In</button>
          <button className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create Account</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'reset' && (
            <p className={styles.resetNote}>Enter your email and we'll send a reset link.</p>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@alvarezandmarsal.com"
              required
              autoFocus
            />
          </div>

          {mode !== 'reset' && (
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {error   && <p role="alert" className={styles.error}>{error}</p>}
          {message && <p role="status" aria-live="polite" className={styles.success}>{message}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>

          {mode === 'signin' && (
            <button type="button" className={styles.link} onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>
              Forgot password?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" className={styles.link} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>
              ← Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
