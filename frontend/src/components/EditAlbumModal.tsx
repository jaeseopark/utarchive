import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { useUpdateAlbum } from "../hooks/useUpdateAlbum";
import { useUpsertAlbumSong } from "../hooks/useUpsertAlbumSong";
import { TrackListEditor } from "./TrackListEditor";
import { useSongSelectorModal } from "./SongSelector";
import { type NumberedTrack, hasSongId, isLiteralTrack } from "../types/album";
import { toBrandId, type AlbumId, type SongId } from "../types/brands";

interface EditAlbumModalProps {
  album: {
    id: AlbumId;
    title: string;
    trackList: Array<{ number: number; title: string; duration?: number }>;
    tracks: Array<{
      trackNumber: number;
      song: { id: string; title: string } | null;
      referenceTitle: string | null;
      isRegistered: boolean;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function EditAlbumModal({ album, isOpen, onClose }: EditAlbumModalProps) {
  const { updateAlbumData, isLoading, error: updateError } = useUpdateAlbum();
  const { linkSongToTrack } = useUpsertAlbumSong();

  const [tracks, setTracks] = useState<NumberedTrack[]>([]);
  const [trackNumberForSongSelect, setTrackNumberForSongSelect] = useState<number | null>(null);
  const [linkingTrackNumber, setLinkingTrackNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializedAlbumId, setInitializedAlbumId] = useState<AlbumId | null>(null);

  const handleSongSelected = useCallback(
    async (songId: string) => {
      if (trackNumberForSongSelect !== null) {
        setError(null);
        setLinkingTrackNumber(trackNumberForSongSelect);

        try {
          await linkSongToTrack(
            album.id,
            toBrandId<SongId>(songId),
            trackNumberForSongSelect,
          );
          setLinkingTrackNumber(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to link song");
          setLinkingTrackNumber(null);
        }
      }
      setTrackNumberForSongSelect(null);
    },
    [trackNumberForSongSelect, album.id, linkSongToTrack],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongSelected: handleSongSelected,
    onClose: () => setTrackNumberForSongSelect(null),
  });

  // Initialize tracks from album data when modal opens for a new album
  useEffect(() => {
    if (isOpen && album && album.id !== initializedAlbumId) {
      // Convert trackList to NumberedTrack format
      const trackData: NumberedTrack[] = album.trackList.map((track) => ({
        trackNumber: track.number,
        title: track.title,
        duration: track.duration,
      }));
      setTracks(trackData);
      setInitializedAlbumId(album.id);
      setError(null);
      setLinkingTrackNumber(null);
    }
  }, [isOpen, album.id]);

  const handleSelectExistingSong = useCallback((trackNumber: number) => {
    setTrackNumberForSongSelect(trackNumber);
    songSelectorModal.open();
  }, [songSelectorModal]);

  const validateTracks = useCallback((): boolean => {
    // Check that each literal track has a non-empty title
    for (const track of tracks) {
      if (hasSongId(track)) {
        // Song references are valid
        continue;
      }

      if (isLiteralTrack(track)) {
        // Literal tracks must have a non-empty title
        if (!track.title?.trim()) {
          return false;
        }
        continue;
      }

      // Track is in an invalid state
      return false;
    }
    return true;
  }, [tracks]);

  const handleSaveTrackList = useCallback(async () => {
    setError(null);
    try {
      // Validate tracks before saving
      if (!validateTracks()) {
        throw new Error("All literal tracks must have a title. Either reference an existing song or provide a title for each track.");
      }

      const trackListData: Array<{ number: number; title: string; duration?: number }> = [];
      
      for (const track of tracks) {
        // Only save literal tracks, not song associations
        if (!Object.prototype.hasOwnProperty.call(track, "songId")) {
          // eslint-disable-next-line no-restricted-syntax
          const literalTrack = track as { trackNumber: number; title?: string; duration?: number };
          trackListData.push({
            number: literalTrack.trackNumber,
            title: literalTrack.title || "",
            duration: literalTrack.duration,
          });
        }
      }

      await updateAlbumData(album.id, { trackList: trackListData });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save track list");
    }
  }, [tracks, album.id, updateAlbumData, onClose, validateTracks]);

  if (!isOpen) {
    return null;
  }

  const isOperationInProgress = isLoading || linkingTrackNumber !== null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">Edit Album Tracks</h2>

          <div className="space-y-6">
            {/* Track List Editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Track Information
              </label>
              <p className="mb-3 text-xs text-slate-600">
                Edit track titles, artists, and duration. Use the Link Song button to associate existing songs.
              </p>
              <TrackListEditor
                tracks={tracks}
                onTracksChange={setTracks}
                onSelectExistingSong={handleSelectExistingSong}
                loading={isOperationInProgress}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {updateError && (
              <div className="rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
                {updateError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
              <Button
                onClick={onClose}
                disabled={isOperationInProgress}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTrackList}
                disabled={isOperationInProgress}
              >
                {isLoading ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Song Select Modal */}
      {songSelectorModal.Component}
    </>
  );
}
