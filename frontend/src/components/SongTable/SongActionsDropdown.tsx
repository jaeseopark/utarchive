import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePlaylistsStore } from "../../stores/usePlaylistsStore";
import { useBulkOperations } from "../../hooks/useBulkOperations";
import type { SongId, PlaylistId } from "../../types/brands";
import clsx from "clsx";

export interface SongActionsDropdownProps {
  selectedSongIds: SongId[];
  onClose: () => void;
}

/**
 * Anchored dropdown menu for bulk song operations (add to playlist).
 * Displayed when songs are selected.
 */
export function SongActionsDropdown({ selectedSongIds, onClose }: SongActionsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const playlists = usePlaylistsStore((state) => state.playlists);
  const bulkOps = useBulkOperations(selectedSongIds);

  // Close dropdown when no songs are selected
  useEffect(() => {
    if (!bulkOps.canExecute) {
      setIsOpen(false);
    }
  }, [bulkOps.canExecute]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (dropdownRef.current && target instanceof Node && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!bulkOps.canExecute) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={dropdownRef}>
      {/* Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "px-4 py-3 rounded-full font-medium transition shadow-lg",
          "bg-blue-500 text-white hover:bg-blue-600",
          "flex items-center gap-2",
        )}
        disabled={bulkOps.state.isLoading}
      >
        {bulkOps.state.isLoading && (
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M4 12a8 8 0 0 1 8-8" />
          </svg>
        )}
        <span>{selectedSongIds.length} selected</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[200px]">
          {bulkOps.state.error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">
              {bulkOps.state.error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              bulkOps.initiateAddToPlaylist();
              setIsOpen(false);
            }}
            disabled={bulkOps.state.isLoading}
            className={clsx(
              "w-full text-left px-4 py-3 text-sm font-medium transition",
              "hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed",
              "border-b border-slate-200 last:border-b-0",
            )}
          >
            Add to playlist
          </button>
        </div>
      )}

      {/* Playlist Picker Modal */}
      {bulkOps.state.showPlaylistPicker && (
        <PlaylistPickerModal
          playlists={playlists}
          isLoading={bulkOps.state.isLoading}
          onSelect={(playlistId) => {
            bulkOps.confirmAddToPlaylist(playlistId);
            onClose();
          }}
          onClose={() => {
            bulkOps.cancelOperation();
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface PlaylistPickerModalProps {
  playlists: Array<{ id: PlaylistId; name: string }>;
  isLoading: boolean;
  onSelect: (playlistId: PlaylistId) => void;
  onClose: () => void;
}

function PlaylistPickerModal({
  playlists,
  isLoading,
  onSelect,
  onClose,
}: PlaylistPickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current === e.target) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add to Playlist</h2>
        </div>

        {playlists.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-600">
            <p>No playlists found.</p>
            <p className="text-sm mt-2">Create a playlist to add songs.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => onSelect(playlist.id)}
                disabled={isLoading}
                className={clsx(
                  "w-full text-left px-6 py-3 border-b border-slate-200 last:border-b-0 transition",
                  "hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {playlist.name}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition",
              "bg-slate-200 text-slate-900 hover:bg-slate-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
