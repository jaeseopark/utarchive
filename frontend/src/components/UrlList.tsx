import { type z } from "zod";
import { UrlArraySchema } from "../api/schemas";

type UrlArrayType = z.infer<typeof UrlArraySchema>;

interface UrlListProps {
  urls?: UrlArrayType;
}

function UrlListComponent({ urls }: UrlListProps) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-between rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700 truncate transition hover:border-sky-400 hover:text-slate-900"
        >
          <span className="truncate">{url}</span>
          <span className="text-sky-400 flex-shrink-0 ml-2">→</span>
        </a>
      ))}
    </div>
  );
}

export default UrlListComponent;
