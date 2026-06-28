import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useLocation, type Location } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { ApiError } from '../api/client';
import { useSession } from '../context/SessionContext';

const loginSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit code'),
});

type LocationState = {
  from?: Location;
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useSession();
  const [formState, setFormState] = useState({ id: '', password: '', totpCode: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/artists';

  const handleChange = (field: keyof typeof formState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({ ...current, [field]: event.target.value }));
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parseResult = loginSchema.safeParse(formState);
    if (!parseResult.success) {
      setError(parseResult.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(parseResult.data);
      navigate(from, { replace: true });
    } catch (errorValue) {
      const message =
        errorValue instanceof ApiError
          ? errorValue.status === 401
            ? 'Invalid credentials or TOTP code'
            : errorValue.message
          : errorValue instanceof Error
          ? errorValue.message
          : 'Login failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
        <h1 className="text-3xl font-semibold">Login</h1>
        <p className="mt-3 text-sm text-slate-400">Enter your credentials to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-300">
            ID
            <input
              type="text"
              value={formState.id}
              onChange={handleChange('id')}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Password
            <input
              type="password"
              value={formState.password}
              onChange={handleChange('password')}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            TOTP Code
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={formState.totpCode}
              onChange={handleChange('totpCode')}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>

          {error ? <div className="rounded-2xl bg-rose-950/80 px-4 py-3 text-sm text-rose-300">{error}</div> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
