import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSongSelection } from "../hooks/useSongSelection";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getArtistNames } from "../lib/artistNames";
import { Button } from "../components/ui/Button";
import { AddSongModal } from "../components/AddSongModal";
import { useAddSongModalStore } from "../stores/useAddSongModalStore";
import { SongTable, SongActionsDropdown } from "../components/SongTable";
import type { ColumnDefinition } from "../components/SongTable";
import { useSongsStore } from "../stores/useSongsStore";

function SongsPage() {
    const { songs, isLoaded, error } = useSongsStore();
  const artists = useArtistsStore((state) => state.artists);
  const { play, setQueue } = usePlayerStore();
  const { openModal } = useAddSongModalStore();

  // Selection and bulk operations
  const { state: selectionState, clearSelection } = useSongSelection(songs);
  // Note: useBulkOperations is used internally by SongActionsDropdown

  const handlePlayAll = useCallback(() => {
    // Filter only playable songs and set as queue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
    const playableSongs = songs.filter((song) => song.playbackEnabled) as any[];
    if (playableSongs.length > 0) {
      setQueue(playableSongs);
    }
  }, [songs, setQueue]);

  const handleDoubleClickRow = useCallback(
    (song: typeof songs[number]) => {
      // Only play if playback is enabled
      if (song.playbackEnabled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
        play(song as any);
      }
    },
    [play],
  );

  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        key: "play",
        label: "",
        width: "48px",
        render: (song) => {
          if (!song.playbackEnabled) {
            return null;
          }

          return (
            <button
              type="button"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                play(song as any);
              }}
              className="flex items-center justify-center w-6 h-6 rounded transition text-emerald-600 hover:bg-emerald-100"
              title="Play song"
            >
              ▶
            </button>
          );
        },
      },
      {
        key: "title",
        label: "Title",
        render: (song) => (
          <div>
            <Link
              to={`/songs/${song.id}`}
              className="font-medium text-slate-900 transition hover:text-sky-500"
            >
              {song.title}
              {song.playbackEnabled && (
                <span className="ml-2 text-xs font-semibold text-emerald-600">★</span>
              )}
            </Link>
          </div>
        ),
      },
      {
        key: "artistText",
        label: "Artist(s)",
        render: (song) => {
          const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
          const artistNames = getArtistNames(song.artistIds ?? [], artistMap);

          return (
            <div className="flex flex-wrap gap-1">
              {artistNames.length > 0
                ? artistNames.map((name, index) => {
                    const artistId = song.artistIds?.[index];
                    return (
                      <span key={index}>
                        {index > 0 && <span className="text-slate-400">,</span>}
                        {artistId ? (
                          <Link
                            to={`/artists/${artistId}`}
                            className="text-sky-500 hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </span>
                    );
                  })
                : "Unknown"}
            </div>
          );
        },
      },
      {
        key: "releasedYear",
        label: "Released",
        render: (song) => {
          const year = song.releasedAt ? new Date(song.releasedAt).getFullYear() : null;
          return <>{year ?? "—"}</>;
        },
      },
    ],
    [artists, play],
  );

  if (!isLoaded) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Songs</h2>
            <p className="mt-2 text-slate-600">Browse all songs in the archive.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled>
              Play All
            </Button>
            <Button variant="primary" onClick={openModal}>
              Add Song
            </Button>
          </div>
        </div>
        <div className="min-h-[240px] flex items-center justify-center text-slate-600">
          Loading songs…
        </div>
        <AddSongModal />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Songs</h2>
            <p className="mt-2 text-slate-600">Browse all songs in the archive.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePlayAll} disabled={songs.length === 0}>
              Play All
            </Button>
            <Button variant="primary" onClick={openModal}>
              Add Song
            </Button>
          </div>
        </div>
        <div className="min-h-[240px] rounded-2xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
          Error loading songs: {error}
        </div>
        <AddSongModal />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Songs</h2>
          <p className="mt-2 text-slate-600">Browse all songs in the archive.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePlayAll} disabled={songs.length === 0}>
            Play All
          </Button>
          <Button variant="primary" onClick={openModal}>
            Add Song
          </Button>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="min-h-[240px] flex items-center justify-center text-slate-600">
          No songs found.
        </div>
      ) : (
        <>
          <SongTable
            songs={songs}
            columns={columns}
            onDoubleClickRow={handleDoubleClickRow}
          />
          <SongActionsDropdown
            selectedSongIds={Array.from(selectionState.selectedIds)}
            onClose={clearSelection}
          />
        </>
      )}

      <AddSongModal />
    </section>
  );
}

export default SongsPage;
