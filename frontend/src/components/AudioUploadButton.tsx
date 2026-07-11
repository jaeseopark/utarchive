import React, { FC, useRef, useState, useCallback } from "react";
import { Button } from "./ui/Button";
import { useUploadAudio } from "../hooks/useUploadAudio";
import { useNotifications } from "../hooks/useNotifications";
import { type SongId } from "../types/brands";

interface AudioUploadButtonProps {
  songId: SongId;
}

/**
 * AudioUploadButton component for uploading audio files with drag-and-drop support
 *
 * Features:
 * - Click button to select audio file
 * - Drag and drop zone for local files
 * - Shows upload progress/status
 * - Supports common audio formats
 */
export const AudioUploadButton: FC<AudioUploadButtonProps> = ({ songId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadAudio, isUploading } = useUploadAudio();
  const { notifySuccess, notifyError } = useNotifications();

  const handleAudioUpload = useCallback(
    async (file: File) => {
      // Keep a reference to the file to prevent it from being GC'd during upload
      const fileRef = file;

      const result = await uploadAudio(songId, fileRef);

      if (result.success) {
        notifySuccess("Audio uploaded successfully");
        // Clear file input only after successful upload
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        notifyError(`Audio upload failed: ${result.error}`);
      }
    },
    [uploadAudio, songId, notifySuccess, notifyError],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleAudioUpload(file);
      }
    },
    [handleAudioUpload],
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      const audioFile = files[0];

      if (audioFile) {
        const isAudioFile =
          audioFile.type.startsWith("audio/") ||
          /\.(mp3|wav|flac|aac|ogg|m4a|wma)$/i.test(audioFile.name);

        if (isAudioFile) {
          void handleAudioUpload(audioFile);
        } else {
          notifyError("Please drop an audio file");
        }
      }
    },
    [handleAudioUpload, notifyError],
  );

  return (
    <div ref={dropZoneRef} onDragEnter={handleDragEnter} onDragOver={handleDragOver}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileInputChange}
        disabled={isUploading}
        className="hidden"
      />
      <div
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all ${isDragging ? "ring-2 ring-sky-400 rounded-lg" : ""}`}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Click to select or drag audio file here"
        >
          {isUploading ? "Uploading..." : "Upload Audio"}
        </Button>

        {/* Drag over overlay hint */}
        {isDragging && (
          <div className="absolute inset-0 bg-sky-400/10 rounded-lg flex items-center justify-center pointer-events-none">
            <span className="text-sm text-sky-600 font-medium">Drop audio file here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioUploadButton;
