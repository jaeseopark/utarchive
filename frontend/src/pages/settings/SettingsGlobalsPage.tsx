import { useUserConfigStore } from "../../stores/useUserConfigStore";

function SettingsGlobalsPage() {
  const config = useUserConfigStore((state) => state.config);
  const shuffle = config.playback?.shuffle ?? false;
  const repeat = config.playback?.repeat ?? "off";

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Global Configuration</h3>
        <p className="mt-2 text-slate-600">
          Placeholder module for settings. This reads current values from the Zustand user config
          store.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Playback Shuffle</p>
          <p className="mt-1 text-lg font-medium text-slate-900">{shuffle ? "Enabled" : "Off"}</p>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Playback Repeat</p>
          <p className="mt-1 text-lg font-medium text-slate-900">{repeat}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Raw config snapshot</p>
        <pre className="overflow-x-auto rounded-2xl border border-slate-300 bg-white p-4 text-xs text-slate-700">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </section>
  );
}

export default SettingsGlobalsPage;