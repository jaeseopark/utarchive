import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSession } from '../context/SessionContext';

const navItems = [
  { to: '/artists', label: 'Artists' },
  { to: '/albums', label: 'Albums' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/search', label: 'Search' },
];

function RootLayout() {
  const { logout } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/40">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">utarchive</p>
            <h1 className="mt-2 text-3xl font-semibold">Music Archive Shell</h1>
          </div>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/30">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default RootLayout;
