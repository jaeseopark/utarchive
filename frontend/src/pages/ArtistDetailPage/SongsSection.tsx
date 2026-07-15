import { Link } from "react-router-dom";
import { createPlaybackEnabledColumn } from "../../lib/songColumnDefinitions";
import { SongTable } from "../../components/SongTable";
import type { SongListItem } from "../../api/schemas";

interface SongsSectionProps {
  songs: SongListItem[];
  onPlaybackEnabledChange: (songId: string, enabled: boolean) => void; // TODO: this should not need to drill.
}

export function SongsSection({
  songs,
  onPlaybackEnabledChange,
}: SongsSectionProps) {
  if (songs.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
        </div>
        <p className="mt-4 text-slate-600">No songs found for this artist.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
      </div>

      <div className="mt-4">
        <SongTable
          songs={songs}
          columns={[
            {
              key: "title",
              label: "Title",
              render: (song) => (
                <Link
                  to={`/songs/${song.id}`}
                  className="text-slate-900 transition hover:text-sky-500"
                >
                  {song.title}
                </Link>
              ),
            },
            "released",
            createPlaybackEnabledColumn(onPlaybackEnabledChange),
          ]}
        />
      </div>
    </section>
  );
}
