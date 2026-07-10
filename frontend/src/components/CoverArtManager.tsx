import React, { FC, useRef, useState, useCallback } from 'react';
import { Button } from './ui/Button';
import CoverArt from './CoverArt';
import { useUploadCoverArt } from '../hooks/useUploadCoverArt';
import { useSongUpdate } from '../hooks/useSongUpdate';
import { createSongId, type SongId } from '../types/brands';

interface CoverArtManagerProps {
  songId: string;
  coverArtId: string | null | undefined;
  size?: 128 | 1024;
  className?: string;
  onCoverArtChange?: (newCoverArtId: string | null) => void;
}

/**
 * CoverArtManager component for managing cover art independently from song editing.
 * Displays cover art with overlay buttons (Upload/Delete) on hover.
 * Upload and delete operations happen immediately without requiring form submission.
 */
export const CoverArtManager: FC<CoverArtManagerProps> = ({
  songId: songIdStr,
  coverArtId,
  size = 1024,
  className,
  onCoverArtChange,
}) => {
  // Convert string ID to branded type
  const songId: SongId = createSongId(songIdStr);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadCoverArt, isUploading } = useUploadCoverArt();
  const { updateSongData } = useSongUpdate();

  const handleCoverArtUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      const coverArt = await uploadCoverArt(file);

      if (coverArt) {
        // Update song with new cover art ID immediately
        await updateSongData(songId, { coverArtId: coverArt.id });
        onCoverArtChange?.(coverArt.id);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadError('Failed to upload image');
      }
    },
    [uploadCoverArt, updateSongData, songId, onCoverArtChange],
  );

  const handleDeleteCoverArt = useCallback(async () => {
    if (!coverArtId) return;

    try {
      setUploadError(null);
      // Update song to remove cover art ID
      await updateSongData(songId, { coverArtId: null });
      onCoverArtChange?.(null);
    } catch {
      setUploadError('Failed to delete image');
    }
  }, [coverArtId, songId, updateSongData, onCoverArtChange]);

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Cover Art Display */}
      <div className={className}>
        <CoverArt coverArtId={coverArtId} size={size} className="w-full h-full object-cover" />
      </div>

      {/* Overlay with Action Buttons */}
      {isHovering && (
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          {coverArtId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDeleteCoverArt}
              disabled={isUploading}
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

export default CoverArtManager;
