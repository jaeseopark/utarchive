import { useCallback, useState } from 'react';
import { CoverArtSchema, type CoverArt } from '../api/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for uploading cover art images
 * Handles multipart/form-data file uploads to /api/cover-art
 */
export function useUploadCoverArt() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadCoverArt = useCallback(async (file: File): Promise<CoverArt | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const requestId = uuidv4();

      const response = await fetch('/api/cover-art', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Request-ID': requestId,
        },
        body: formData,
      });

      if (response.status === 401) {
        window.location.assign('/login');
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || response.statusText;
        throw new Error(message);
      }

      // Validate response
      const parseResult = CoverArtSchema.safeParse(data);
      if (!parseResult.success) {
        throw new Error('Invalid cover art response');
      }

      return parseResult.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload cover art';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadCoverArt, isUploading, error };
}
