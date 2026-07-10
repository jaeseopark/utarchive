import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { SongListItemSchema, type SongListItem } from "../api/schemas";
import { z } from "zod";
import { formatDate } from "../lib/format";
import { useArtistDetail } from "../hooks/useArtistDetail";
import { PlaybackEnabledToggle } from "../components/PlaybackEnabledToggle";
import { useArtistAttributesEditor } from "../components/ArtistAttributesEditor";
import { Button } from "../components/ui/Button";
import { toBrandId, type ArtistId } from "../types/brands";
import type { Artist } from "../api/schemas";

const ArtistSongsSchema = z.array(SongListItemSchema);

interface ArtistHeaderProps {
  artist: Artist;
}

function ArtistHeader({ artist }: ArtistHeaderProps) {
  // Hook call is now unconditional within this component
  const artistEditorState = useArtistAttributesEditor(artist);

  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-slate-900">{artist.name}</h3>
        <Button
          variant="secondary"
          onClick={artistEditorState.enterEditMode}
          disabled={artistEditorState.mode === "edit"}
        >
          Edit
        </Button>
      </div>
      <artistEditorState.Component />
    </div>
  );
}

function ArtistDetailPage() {
  const { id } = useParams<"id">();
  const {
    artist,
    isLoading: artistLoading,
    error: artistError,
  } = useArtistDetail(toBrandId<ArtistId>(id || ""));
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setSongsLoading(true);
    setSongsError(null);

    api
      .get(`/api/artists/${id}/songs`, ArtistSongsSchema)
      .then((artistSongs) => {
        setSongs(
          [...artistSongs].sort((a, b) => {
            if (a.releasedAt === b.releasedAt) {
              return a.title.localeCompare(b.title);
            }
            if (!a.releasedAt) return 1;
            if (!b.releasedAt) return -1;
            return b.releasedAt.localeCompare(a.releasedAt);
          }),
        );
      })
      .catch((err) => setSongsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSongsLoading(false));
  }, [id]);

  const handlePlaybackEnabledChange = (songId: string, newPlaybackEnabled: boolean) => {
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId ? { ...song, playbackEnabled: newPlaybackEnabled } : song,
      ),
    );
  };

  const isLoading = artistLoading || songsLoading;
  const error = artistError || songsError;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Artist detail</h2>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading artist…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading artist: {error}
        </div>
      ) : artist ? (
        <div className="space-y-6">
          <ArtistHeader artist={artist} />

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Songs</h3>
              <span className="text-sm text-slate-600">Sorted by released date</span>
            </div>

            {songs.length === 0 ? (
              <p className="mt-4 text-slate-600">No songs found for this artist.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-300 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Released</th>
                      <th className="px-4 py-3">Playback Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => (
                      <tr key={song.id} className="border-b border-slate-300 last:border-b-0">
                        <td className="px-4 py-4">
                          <Link
                            to={`/songs/${song.id}`}
                            className="text-slate-900 transition hover:text-sky-500"
                          >
                            {song.title}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDate(song.releasedAt) ?? "—"}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="h-6">
                            <PlaybackEnabledToggle
                              songId={song.id}
                              isEnabled={song.playbackEnabled}
                              onPlaybackEnabledChange={handlePlaybackEnabledChange}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ArtistDetailPage;
