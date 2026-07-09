import React, { FC, useRef, useState, useCallback } from 'react';
import { Button } from './ui/Button';
import CoverArt from './CoverArt';
import { useUploadCoverArt } from '../hooks/useUploadCoverArt';
import { useSongUpdate } from '../hooks/useSongUpdate';
import { useAlbumUpdate } from '../hooks/useAlbumUpdate';
import { useResolveCoverArt } from '../hooks/useResolveCoverArt';
import { useSongDetail } from '../hooks/useSongDetail';
import { useAlbumDetail } from '../hooks/useAlbumDetail';

interface CoverArtDisplayProps {
  owner: {
    songId?: string;
    albumId?: string;
  };
  size?: 128 | 1024;
  className?: string;
}

/**
 * Reusable CoverArtDisplay component for songs and albums.
 *
 * Features:
 * - Displays cover art with upload/delete overlay buttons
 * - Automatic tree traversal for songs (checks song → albums → parent recursively)
 * - Direct album cover art display
 * - Upload/delete operations affect only the immediate owner
 * - Falls back to placeholder if no cover art found
 */
export const CoverArtDisplay: FC<CoverArtDisplayProps> = ({
  owner,
  size = 1024,
  className,
}) => {
  const { songId, albumId } = owner;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Resolve cover art with tree traversal
  const { resolvedCoverArtId, isLoading: isResolvingCoverArt } = useResolveCoverArt(owner);

  // Get owner's direct cover art ID
  const { song } = useSongDetail(songId ?? '');
  const { album } = useAlbumDetail(albumId ?? '');
  const ownerCoverArtId = songId ? song?.coverArtId ?? null : (albumId ? album?.coverArtId ?? null : null);

  const { uploadCoverArt, isUploading } = useUploadCoverArt();
  const { updateSongData } = useSongUpdate();
  const { updateAlbumData } = useAlbumUpdate();

  const handleCoverArtUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      const coverArt = await uploadCoverArt(file);

      if (coverArt) {
        // Update the immediate owner (song or album) with new cover art ID
        if (songId) {
          const result = await updateSongData(songId, { coverArtId: coverArt.id });
          if (!result.success) {
            setUploadError(result.error || 'Failed to update cover art');
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else if (albumId) {
          const result = await updateAlbumData(albumId, { coverArtId: coverArt.id });
          if (!result.success) {
            setUploadError(result.error || 'Failed to update cover art');
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        setUploadError('Failed to upload image');
      }
    },
    [uploadCoverArt, songId, albumId, updateSongData, updateAlbumData],
  );

  const handleDeleteCoverArt = useCallback(async () => {
    try {
      setUploadError(null);

      // Delete only removes the assignment from the owner (song/album)
      // The underlying cover art entry and files remain in the system
      // This allows the image to be reused by other songs/albums
      if (songId) {
        const result = await updateSongData(songId, { coverArtId: null });
        if (!result.success) {
          setUploadError(result.error || 'Failed to delete image');
        }
      } else if (albumId) {
        const result = await updateAlbumData(albumId, { coverArtId: null });
        if (!result.success) {
          setUploadError(result.error || 'Failed to delete image');
        }
      }
    } catch {
      setUploadError('Failed to delete image');
    }
  }, [albumId, songId, updateSongData, updateAlbumData]);

  // Show the resolved cover art ID
  const displayCoverArtId = resolvedCoverArtId;
  
  // Delete button is visible when there's any cover art, but only enabled if owner has it directly
  const showDeleteButton = displayCoverArtId !== null;
  const canDeleteCoverArt = ownerCoverArtId !== null;

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Cover Art Display */}
      <div className={className}>
        {isResolvingCoverArt ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <div className="text-slate-500 text-sm">Loading...</div>
          </div>
        ) : (
          <CoverArt
            coverArtId={displayCoverArtId}
            size={size}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Overlay with Action Buttons */}
      {isHovering && !isResolvingCoverArt && (
        <div className="absolute inset-0 bg-black/40 flex items-end justify-center gap-2 p-3 rounded-lg">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverArtUpload}
            disabled={isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          {showDeleteButton && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDeleteCoverArt}
              disabled={isUploading || !canDeleteCoverArt}
              title={!canDeleteCoverArt ? 'Cannot delete transitive cover art' : 'Delete cover art'}
              className="flex-1"
            >
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-xs p-2 text-center rounded-b-lg">
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default CoverArtDisplay;
