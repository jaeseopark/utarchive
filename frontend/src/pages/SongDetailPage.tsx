import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import CoverArtDisplay from "../components/CoverArtDisplay";
import FamilyTree from "../components/FamilyTree";
import AudioUploadButton from "../components/AudioUploadButton";
import { useSongAttributesEditor } from "../components/SongAttributesEditor";
import { useArtistsStore } from "../stores/useArtistsStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { getArtistNames } from "../lib/artistNames";
import { useSongDetail } from "../hooks/useSongDetail";
import { toBrandId, type SongId } from "../types/brands";
import type { Song } from "../api/schemas";

interface SongHeaderProps {
  song: Song;
}

function SongHeader({ song }: SongHeaderProps) {
  // Hook call is now unconditional within this component
  const songEditorState = useSongAttributesEditor(song);
  const artists = useArtistsStore((state) => state.artists);
  const { play } = usePlayerStore();

  const artistList = useMemo(() => {
    const artistNames = getArtistNames(song.artistIds ?? [], artists);
    return artistNames.map((name, index) => ({
      id: song.artistIds?.[index] ?? "",
      name,
    }));
  }, [song, artists]);

  const handlePlay = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
    play(song as any);
  };

  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-shrink-0">
            <CoverArtDisplay
              owner={{ songId: song.id }}
              size={128}
              className="h-32 w-32 rounded-2xl border border-slate-300 bg-slate-50/80 object-cover shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{song.title}</h1>
            <div className="mt-3 text-sm text-slate-600">
              {artistList.length > 0 ? (
                <span>
                  Artists:{" "}
                  {artistList.map((artist, index) => (
                    <span key={artist.id}>
                      <Link to={`/artists/${artist.id}`} className="text-sky-500 hover:underline">
                        {artist.name}
                      </Link>
                      {index < artistList.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              ) : (
                "Artists: Unknown"
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {song.filePath && (
            <Button variant="secondary" onClick={handlePlay}>
              Play
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={songEditorState.enterEditMode}
            disabled={songEditorState.mode === "edit"}
          >
            Edit
          </Button>
          <AudioUploadButton songId={song.id} />
        </div>
      </div>

      {/* Song Attributes Editor - replaces metadata cards */}
      <div className="mt-6">
        <songEditorState.Component />
      </div>
    </div>
  );
}

function SongDetailPage() {
  const { id } = useParams<"id">();
  const { song: songData, isLoading, error } = useSongDetail(toBrandId<SongId>(id || ""));

  // Use song data from hook
  const song = songData;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Song detail</h2>
        <p className="mt-2 text-slate-600">View metadata and the family tree for this song.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading song…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading song: {error}
        </div>
      ) : song ? (
        <div className="space-y-6">
          <SongHeader song={song} />

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <h3 className="text-xl font-semibold text-slate-900">Family tree</h3>
            {song.masterId ? (
              <div className="mt-4">
                <FamilyTree masterId={song.masterId} currentSongId={song.id} />
              </div>
            ) : (
              <p className="mt-4 text-slate-600">No family tree available.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default SongDetailPage;
