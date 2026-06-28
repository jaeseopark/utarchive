import { type z } from 'zod';
import { UrlMapSchema } from '../api/schemas';

type UrlMap = z.infer<typeof UrlMapSchema>;

interface UrlMapProps {
  urls?: UrlMap;
}

function UrlMap({ urls }: UrlMapProps) {
  const entries = urls ? Object.entries(urls) : [];

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4 shadow-inner shadow-slate-950/20">
      <h3 className="text-lg font-semibold text-slate-100">Links</h3>
      <div className="mt-3 grid gap-2">
        {entries.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            <span>{label}</span>
            <span className="text-sky-400">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default UrlMap;
