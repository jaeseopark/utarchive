import { Link } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { getArtistNames } from "../lib/artistNames";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useSongsStore } from "../stores/useSongsStore";
import { useFamilyTree } from "../hooks/useFamilyTree";
import { PlaybackEnabledToggle } from "./PlaybackEnabledToggle";
import { AddChildModal } from "./AddChildModal";
import { toBrandId, type SongId } from "../types/brands";

interface FamilyTreeProps {
  masterId: string;
  currentSongId?: string;
}

function FamilyTree({ masterId, currentSongId }: FamilyTreeProps) {
  const artists = useArtistsStore((state) => state.artists);
  const { updateSong } = useSongsStore();
  const { tree, isLoading, error, refetch } = useFamilyTree(
    toBrandId<SongId>(masterId),
    currentSongId ? toBrandId<SongId>(currentSongId) : undefined,
  );
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [selectedParentForChild, setSelectedParentForChild] = useState<string | null>(null);

  const nodesBeforeArtistNameSubstituted = tree?.nodes ?? [];

  const nodes = useMemo(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    return nodesBeforeArtistNameSubstituted.map((node) => ({
      ...node,
      artistNames: getArtistNames(node.artistIds, artistMap),
    }));
  }, [nodesBeforeArtistNameSubstituted, artists]);

  const handlePlaybackEnabledChange = useCallback(
    (songId: string, newPlaybackEnabled: boolean) => {
      updateSong(toBrandId<SongId>(songId), { playbackEnabled: newPlaybackEnabled });
    },
    [updateSong],
  );

  const handleAddChildClick = useCallback((parentSongId: string) => {
    setSelectedParentForChild(parentSongId);
    setAddChildModalOpen(true);
  }, []);

  const handleChildAdded = useCallback(async () => {
    // Refetch the tree to reflect the newly added child
    await refetch();
    setAddChildModalOpen(false);
    setSelectedParentForChild(null);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-4 text-center text-slate-600">
        Loading family tree…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
        Error loading family tree: {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-inner shadow-slate-200/20">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Artists</th>
              <th className="px-3 py-2">Released</th>
              <th className="px-3 py-2">Playback Enabled</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => {
              const isCurrent = node.id === currentSongId;
              return (
                <tr
                  key={node.id}
                  className={
                    isCurrent
                      ? "bg-slate-100/90 font-semibold text-slate-900"
                      : "border-t border-slate-300 text-slate-700"
                  }
                >
                  <td className="px-3 py-3 align-top">
                    {isCurrent ? (
                      <span
                        className="block truncate text-slate-900"
                        style={{ paddingLeft: `${Math.min(node.depth * 18, 72)}px` }}
                      >
                        {node.title}
                      </span>
                    ) : (
                      <Link
                        to={`/songs/${node.id}`}
                        className="block truncate text-slate-900 transition hover:text-sky-500"
                        style={{ paddingLeft: `${Math.min(node.depth * 18, 72)}px` }}
                      >
                        {node.title}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-700">
                    {node.artistNames.join(", ") || "Unknown"}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-700">
                    {node.releasedAt ? new Date(node.releasedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="h-6">
                      <PlaybackEnabledToggle
                        songId={node.id}
                        isEnabled={node.playbackEnabled}
                        onPlaybackEnabledChange={handlePlaybackEnabledChange}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <button
                      onClick={() => handleAddChildClick(node.id)}
                      className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600"
                    >
                      + Add child
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Child Modal */}
      <AddChildModal
        isOpen={addChildModalOpen}
        parentSongId={selectedParentForChild ?? ""}
        onClose={() => {
          setAddChildModalOpen(false);
          setSelectedParentForChild(null);
        }}
        onChildAdded={handleChildAdded}
      />
    </>
  );
}

export default FamilyTree;
