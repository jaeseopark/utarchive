import { NavLink, Outlet } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ConnectionStatusIndicator } from "../components/ConnectionStatusIndicator";
import { GlobalPlayer } from "../components/GlobalPlayer";
import { useSession } from "../context/SessionContext";
import { AddSongModal } from "../components/AddSongModal";
import { useAddSongModalStore } from "../stores/useAddSongModalStore";

const navItems = [
  { to: "/artists", label: "Artists" },
  { to: "/albums", label: "Albums" },
  { to: "/playlists", label: "Playlists" },
  { to: "/songs", label: "Songs" },
  { to: "/search", label: "Search" },
];

function RootLayout() {
  const { logout } = useSession();
  const { openModal } = useAddSongModalStore();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-slate-300 bg-slate-50/90 p-5 shadow-xl shadow-slate-200/40">
          <div className="flex-shrink-0">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">utarchive</p>
          </div>

          {/* Global Player - centered, grows to fill available space */}
          <GlobalPlayer />

          {/* Action buttons - right side */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <ConnectionStatusIndicator />
            <div className="flex gap-2">
              <Button variant="primary" onClick={openModal}>
                Add Song
              </Button>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-300 bg-slate-50/80 p-5 shadow-xl shadow-slate-200/20">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-300 text-slate-900"
                        : "text-slate-700 hover:bg-slate-300/70 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="rounded-3xl border border-slate-300 bg-slate-50/90 p-6 shadow-xl shadow-slate-200/30">
            <Outlet />
          </main>
        </div>
      </div>

      <AddSongModal />
    </div>
  );
}

export default RootLayout;
