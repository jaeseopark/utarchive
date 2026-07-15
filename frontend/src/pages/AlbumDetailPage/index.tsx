import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAlbumsStore } from "../../stores/useAlbumsStore";
import { useEditAlbumModalStore } from "../../stores/useEditAlbumModalStore";
import { useSongsStore } from "../../stores/useSongsStore";
import { useArtistsStore } from "../../stores/useArtistsStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { toBrandId, type AlbumId } from "../../types/brands";
import type { Song } from "../../api/schemas";
import AlbumInfoSection from "./AlbumInfoSection";
import TrackListSection from "./TrackListSection";

const AlbumDetailPage = () => {
  const { id } = useParams();
  const albumId = toBrandId<AlbumId>(id || "");

  // Album data - always call hooks unconditionally
  const album = useAlbumsStore((state) => state.getAlbum(albumId));
  const fetchAlbumDetail = useAlbumsStore((state) => state.fetchAlbumDetail);
  const error = useAlbumsStore((state) => state.error);

  // Song details - always subscribe to trigger re-renders
  // eslint-disable-next-line no-restricted-syntax
  const songDetailsMap = useSongsStore((state) => state.songDetails) as Record<string, Song>;

  // Store selectors
  const artists = useArtistsStore((state) => state.artists);

  // Modal and player state
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } =
    useEditAlbumModalStore();
  const { setQueue, play } = usePlayerStore();

  // Local loading state
  const [isLoading, setIsLoading] = useState(false);

  // Track which song's tree is currently expanded
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  // Track operations (linking/unlinking) per track number
  const [trackOperations, setTrackOperations] = useState<
    Map<number, { type: "linking" | "unlinking"; error?: string }>
  >(new Map());

  // Track which track is waiting for song selection
  const [trackNumberForSongSelect, setTrackNumberForSongSelect] = useState<number | null>(null);

  // Play album loading state
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  // Fetch full album detail when page loads
  useEffect(() => {
    if (!albumId || album?.tracks) return;

    setIsLoading(true);
    fetchAlbumDetail(albumId).finally(() => {
      setIsLoading(false);
    });
  }, [albumId, fetchAlbumDetail, album?.tracks]);

  // Handle loading state
  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading album…
        </div>
      </section>
    );
  }

  // Handle error state
  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading album: {error}
        </div>
      </section>
    );
  }

  // Handle not found state
  if (!album) {
    return (
      <section className="space-y-6">
        <div>Album not found</div>
      </section>
    );
  }

  // Render album detail
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Album Detail</h2>
      </div>
      <div className="space-y-6">
        <AlbumInfoSection album={album} onEditClick={openEditModal} />
        <TrackListSection
          album={album}
          artists={artists}
          songDetailsMap={songDetailsMap}
          expandedSongId={expandedSongId}
          onToggleTree={(songId) =>
            setExpandedSongId(expandedSongId === songId ? null : songId)
          }
          trackOperations={trackOperations}
          onTrackOperationChange={setTrackOperations}
          trackNumberForSongSelect={trackNumberForSongSelect}
          onTrackNumberForSongSelectChange={setTrackNumberForSongSelect}
          isPlayLoading={isPlayLoading}
          onPlayLoadingChange={setIsPlayLoading}
          isEditModalOpen={isEditModalOpen}
          onCloseEditModal={closeEditModal}
          onOpenEditModal={openEditModal}
          setQueue={setQueue}
          play={play}
        />
      </div>
    </section>
  );
};

export default AlbumDetailPage;
