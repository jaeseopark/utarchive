import { Button } from '../components/ui/Button';

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
        <h1 className="text-3xl font-semibold">Login</h1>
        <p className="mt-3 text-sm text-slate-400">This is a placeholder login page.</p>
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
            Auth UI will be implemented in PR 12.
          </div>
          <Button onClick={() => window.location.replace('/artists')}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
