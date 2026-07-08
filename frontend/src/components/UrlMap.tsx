import { type z } from 'zod';
import { UrlMapSchema } from '../api/schemas';

type UrlMapType = z.infer<typeof UrlMapSchema>;

interface UrlMapProps {
  urls?: UrlMapType;
}

function UrlMapComponent({ urls }: UrlMapProps) {
  const entries = urls ? Object.entries(urls) : [];

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-inner shadow-slate-200/20">
      <h3 className="text-lg font-semibold text-slate-900">Links</h3>
      <div className="mt-3 grid gap-2">
        {entries.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-between rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:border-sky-400 hover:text-slate-900"
          >
            <span>{label}</span>
            <span className="text-sky-400">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default UrlMapComponent;
