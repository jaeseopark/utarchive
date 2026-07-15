import { useCallback, useMemo } from "react";
import { EditAlbumModal } from "../../components/EditAlbumModal";
import { useSongSelectorModal } from "../../components/SongSelector";
import { Button } from "../../components/ui/Button";
import { SongActionsDropdown } from "../../components/SongTable";
import { buildAlbumQueue } from "../../lib/queueBuilder";
import { useUnlinkSongFromAlbum } from "../../hooks/useUnlinkSongFromAlbum";
import { useUpsertAlbumSong } from "../../hooks/useUpsertAlbumSong";
import { useSongSelection } from "../../hooks/useSongSelection";
import { toBrandId, type AlbumId, type SongId } from "../../types/brands";
import type { Album, Artist, Song } from "../../api/schemas";
import TrackRow from "./TrackRow";

interface TrackListSectionProps {
  album: Album;
  artists: Artist[];
  songDetailsMap: Record<string, Song>;
  expandedSongId: string | null;
  onToggleTree: (songId: string) => void;
  trackOperations: Map<number, { type: "linking" | "unlinking"; error?: string }>;
  onTrackOperationChange: (
    operations:
      | Map<number, { type: "linking" | "unlinking"; error?: string }>
      | ((prev: Map<number, { type: "linking" | "unlinking"; error?: string }>) => Map<number, { type: "linking" | "unlinking"; error?: string }>),
  ) => void;
  trackNumberForSongSelect: number | null;
  onTrackNumberForSongSelectChange: (trackNumber: number | null) => void;
  isPlayLoading: boolean;
  onPlayLoadingChange: (isLoading: boolean) => void;
  isEditModalOpen: boolean;
  onCloseEditModal: () => void;
  onOpenEditModal: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  play: (song: Song) => void;
}

const TrackListSection = ({
  album,
  artists,
  songDetailsMap,
  expandedSongId,
  onToggleTree,
  trackOperations,
  onTrackOperationChange,
  trackNumberForSongSelect,
  onTrackNumberForSongSelectChange,
  isPlayLoading,
  onPlayLoadingChange,
  isEditModalOpen,
  onCloseEditModal,
  onOpenEditModal,
  setQueue,
  play,
}: TrackListSectionProps) => {
  const trackRows = useMemo(() => album.tracks ?? [], [album]);

  // Get all songs from tracks for selection (registered songs only)
  const albumSongs = useMemo(
    () =>
      trackRows
        .filter((t) => t.isRegistered && t.song?.id)
        .map((t) => ({ id: toBrandId<SongId>(t.song!.id) })),
    [trackRows],
  );

  // Selection and bulk operations
  const { state: selectionState, toggleSelection, clearSelection } = useSongSelection(albumSongs);

  // Hooks - always call unconditionally
  const { unlinkSong } = useUnlinkSongFromAlbum();
  const { linkSongToTrack } = useUpsertAlbumSong();

  const handleSongSelected = useCallback(
    async (songId: string) => {
      if (!album || trackNumberForSongSelect === null) return;

      onTrackOperationChange(
        new Map(trackOperations).set(trackNumberForSongSelect, { type: "linking" }),
      );

      try {
        await linkSongToTrack(album.id, toBrandId<SongId>(songId), trackNumberForSongSelect);
        onTrackOperationChange((prev) => {
          const updated = new Map(prev);
          updated.delete(trackNumberForSongSelect);
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to link song";
        onTrackOperationChange(
          new Map(trackOperations).set(trackNumberForSongSelect, { type: "linking", error: message }),
        );
        console.error("Link error:", message);
      }
      onTrackNumberForSongSelectChange(null);
    },
    [
      album,
      trackNumberForSongSelect,
      linkSongToTrack,
      trackOperations,
      onTrackOperationChange,
      onTrackNumberForSongSelectChange,
    ],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongSelected: handleSongSelected,
    onClose: () => onTrackNumberForSongSelectChange(null),
  });

  const handleSelectExistingSong = useCallback(
    (trackNumber: number) => {
      onTrackNumberForSongSelectChange(trackNumber);
      songSelectorModal.open();
    },
    [songSelectorModal, onTrackNumberForSongSelectChange],
  );

  const handleUnlinkSong = useCallback(
    async (albumId: AlbumId, songId: SongId, trackNumber: number) => {
      onTrackOperationChange(
        new Map(trackOperations).set(trackNumber, { type: "unlinking" }),
      );
      try {
        await unlinkSong(albumId, songId);
        onTrackOperationChange((prev) => {
          const updated = new Map(prev);
          updated.delete(trackNumber);
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to unlink song";
        onTrackOperationChange(
          new Map(trackOperations).set(trackNumber, { type: "unlinking", error: message }),
        );
        console.error("Unlink error:", message);
      }
    },
    [trackOperations, onTrackOperationChange, unlinkSong],
  );

  const handlePlayAlbum = useCallback(async () => {
    if (!album || !album.tracks || !album.tracks.length) {
      return;
    }

    onPlayLoadingChange(true);
    try {
      const songs = await buildAlbumQueue(album.id);
      if (songs.length === 0) {
        console.warn("No playable songs in this album");
        return;
      }

      setQueue(songs, 0);
    } catch (err) {
      console.error("Failed to play album:", err);
    } finally {
      onPlayLoadingChange(false);
    }
  }, [album, setQueue, onPlayLoadingChange]);

  const hasPlayableTracks = useMemo(() => {
    if (!album || !album.tracks || !album.tracks.length) return false;
    return album.tracks.some((track) => {
      if (!track.isRegistered || !track.song?.id) return false;
      const fullSong = songDetailsMap[track.song.id];
      return fullSong?.filePath ? true : false;
    });
  }, [album, songDetailsMap]);

  return (
    <>
      <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Track list</h3>
          <div className="flex gap-3">
            {hasPlayableTracks && (
              <Button variant="primary" onClick={handlePlayAlbum} disabled={isPlayLoading}>
                {isPlayLoading ? "Loading…" : "▶ Play Album"}
              </Button>
            )}
            <Button variant="secondary" onClick={onOpenEditModal}>
              ✎ Edit Tracks
            </Button>
          </div>
        </div>
        {trackRows.length === 0 ? (
          <p className="mt-4 text-slate-600">No tracks are available for this album.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-300 text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Artists</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trackRows.map((track) => {
                  const songId = track.song?.id;
                  const fullSong = songId ? songDetailsMap[songId] : undefined;
                  return (
                    <TrackRow
                      key={`${track.trackNumber}-${songId ?? "unreg"}`}
                      track={track}
                      album={album}
                      artists={artists}
                      songDetail={fullSong}
                      isExpanded={expandedSongId === songId}
                      onToggleTree={() => {
                        if (track.song?.id) {
                          onToggleTree(track.song.id);
                        }
                      }}
                      onUnlinkSong={handleUnlinkSong}
                      onSelectExistingSong={handleSelectExistingSong}
                      trackOperation={trackOperations.get(track.trackNumber)}
                      onPlaySong={play}
                      onRowClick={() => {
                        if (track.song?.id) {
                          toggleSelection(track.song.id, false);
                        }
                      }}
                      onRowDoubleClick={() => {
                        if (track.isRegistered && track.song?.id) {
                          const fullSongData = songDetailsMap[track.song.id];
                          if (fullSongData?.filePath) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                            play(fullSongData as any);
                          }
                        }
                      }}
                      isSelected={track.song?.id ? selectionState.selectedIds.has(track.song.id) : false}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {Array.from(trackOperations.values()).some((op) => op.type === "linking" && op.error) && (
          <div className="mt-4 rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
            {Array.from(trackOperations.values()).find((op) => op.type === "linking" && op.error)
              ?.error}
          </div>
        )}
        {albumSongs.length > 0 && (
          <div className="mt-6">
            <SongActionsDropdown
              selectedSongIds={Array.from(selectionState.selectedIds)}
              onClose={clearSelection}
            />
          </div>
        )}
      </section>

      <EditAlbumModal
        album={{
          id: album.id,
          title: album.title,
          trackList: album.trackList,
          tracks: (album.tracks || []).map((t) => ({
            trackNumber: t.trackNumber,
            song: t.song ? { id: t.song.id, title: t.song.title } : null,
            referenceTitle: t.referenceTitle ?? null,
            isRegistered: t.isRegistered,
          })),
        }}
        isOpen={isEditModalOpen}
        onClose={onCloseEditModal}
      />

      {songSelectorModal.Component}
    </>
  );
};

export default TrackListSection;
