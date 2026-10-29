import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOME_BY_ROLE } from '../components/layout/ProtectedRoute';
import styles from './Login.module.css';

export default function Login() {
  const { login, status, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signed-in') return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message ?? 'Could not sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={`card card-pad ${styles.panel}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1>TOSS</h1>
            <p>Table-Side Ordering &amp; Service System</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.hint}>Ask your manager for an account if you don&apos;t have one yet.</p>
      </div>
    </div>
  );
}
