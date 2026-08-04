import { NavLink, Outlet } from "react-router-dom";
import { SETTINGS_ROUTES } from "./settings/routes";

function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-slate-600">
          Configure global preferences and application behavior.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
          <nav className="space-y-2" aria-label="Settings sections">
            {SETTINGS_ROUTES.map((route) => (
              <NavLink
                key={route.path}
                to={`/settings/${route.path}`}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-300 text-slate-900"
                      : "text-slate-700 hover:bg-slate-300/70 hover:text-slate-900"
                  }`
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
          <Outlet />
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
