import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: 'ava@keystone.app', password: 'keystone123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = String(form.email).trim();

    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!String(form.password).trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login({ ...form, email: trimmedEmail });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blueprint-grid relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="auth-card w-full max-w-md p-7 md:p-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="font-serif text-3xl leading-none text-ink">Keystone</p>
            <p className="mt-2 text-[13px] text-muted">Sign in to your project workspace.</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blueprint to-blueprintDeep text-[14px] font-bold text-[var(--on-accent)] ">
            K
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] text-muted">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="premium-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] text-muted">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="premium-input"
            />
          </div>

          {error ? <p className="text-[13px] text-rust">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="premium-button w-full rounded-2xl px-4 py-3 text-[14px] disabled:opacity-70"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-[14px] text-muted">
          Need an account?{' '}
          <Link to="/signup" className="font-medium text-blueprint hover:text-blueprintDeep">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
