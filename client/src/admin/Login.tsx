import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../api';
import { Spinner } from '../components/PageState';
import { useAuth } from './auth';
import { Field, Notice } from './ui';

export default function Login() {
  const { state, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (state.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith('/admin') ? from : '/admin'} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400 ? 'Enter your username and password.' : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="panel p-8 md:rounded-[2rem]" aria-labelledby="login-title">
          <p className="eyebrow mb-4">Admin</p>
          <h1 id="login-title" className="mb-8 text-3xl text-cream">
            Sign <span className="font-serif italic">in.</span>
          </h1>
          <Notice>{error}</Notice>
          <div className="space-y-5">
            <Field label="Username">
              <input className="input" name="username" autoComplete="username" autoCapitalize="none" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          <button type="submit" className="btn-primary mt-8 w-full py-3" disabled={busy}>
            {busy && <Spinner className="border-black/30 border-t-black" />}
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-500">
          <Link to="/" className="transition-colors duration-200 hover:text-cream">
            ← Back to the portfolio
          </Link>
        </p>
      </div>
    </main>
  );
}
