import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDate } from "../lib/format";
import { useArtistDetail } from "../hooks/useArtistDetail";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { useSongSelection } from "../hooks/useSongSelection";
import { PlaybackEnabledToggle } from "../components/PlaybackEnabledToggle";
import { useArtistAttributesEditor } from "../components/ArtistAttributesEditor";
import { Button } from "../components/ui/Button";
import { SongTable, SongActionsDropdown } from "../components/SongTable";
import { toBrandId, type ArtistId } from "../types/brands";
import type { Artist } from "../api/schemas";
import { useArtistSongsStore } from "../stores/useArtistSongsStore";

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

  const artistId = toBrandId<ArtistId>(id || "");
  const { fetchArtistSongs, getArtistSongs, updateArtistSong } = useArtistSongsStore();
  const songs = getArtistSongs(artistId) ?? [];
  const songsLoading = useArtistSongsStore((state) => state.isLoading[artistId] ?? false);
  const songsError = useArtistSongsStore((state) => state.error[artistId] ?? null);

  const { albums, isLoading: albumsLoading, error: albumsError } = useArtistAlbums(artistId);

  // Selection and bulk operations
  const { state: selectionState, clearSelection } = useSongSelection(songs);
  // Note: useBulkOperations is used internally by SongActionsDropdown

  useEffect(() => {
    if (!id) return;
    fetchArtistSongs(artistId).catch(() => {
      // Error is handled by the store
    });
  }, [id, artistId, fetchArtistSongs]);

  const handlePlaybackEnabledChange = (songId: string, newPlaybackEnabled: boolean) => {
    updateArtistSong(artistId, songId, { playbackEnabled: newPlaybackEnabled });
  };

  const isLoading = artistLoading || songsLoading || albumsLoading;
  const error = artistError || songsError || albumsError;

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
              <>
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
                      {
                        key: "released",
                        label: "Released",
                        render: (song) => <>{formatDate(song.releasedAt) ?? "—"}</>,
                      },
                      {
                        key: "playback",
                        label: "Playback Enabled",
                        render: (song) => (
                          <div className="h-6">
                            <PlaybackEnabledToggle
                              songId={song.id}
                              isEnabled={song.playbackEnabled}
                              onPlaybackEnabledChange={handlePlaybackEnabledChange}
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
                <SongActionsDropdown
                  selectedSongIds={Array.from(selectionState.selectedIds)}
                  onClose={clearSelection}
                />
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <h3 className="text-xl font-semibold text-slate-900">Albums</h3>

            {albums.length === 0 ? (
              <p className="mt-4 text-slate-600">No albums found for this artist.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {albums.map((album) => (
                  <Link
                    key={album.id}
                    to={`/albums/${album.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:shadow-md"
                  >
                    {album.coverArtId && (
                      <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={`/api/cover-art/${album.coverArtId}`}
                          alt={album.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h4 className="font-semibold text-slate-900 group-hover:text-sky-600">
                      {album.title}
                    </h4>
                    {album.yearReleased && (
                      <p className="mt-1 text-sm text-slate-600">{album.yearReleased}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ArtistDetailPage;
