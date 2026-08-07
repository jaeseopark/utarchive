import { useSession } from "../../context/SessionContext";
import { Button } from "../../components/ui/Button";

function SettingsAccountPage() {
  const { logout } = useSession();

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Account</h3>
        <p className="mt-2 text-slate-600">Manage your account settings and preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-300 bg-white px-4 py-4">
          <h4 className="mb-2 text-sm font-medium text-slate-700">Session</h4>
          <p className="mb-3 text-sm text-slate-600">Sign out from your account.</p>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </section>
  );
}

export default SettingsAccountPage;
