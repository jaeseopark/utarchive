import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePlaylistsStore } from "../../stores/usePlaylistsStore";
import { useBulkOperations } from "../../hooks/useBulkOperations";
import type { SongId, PlaylistId } from "../../types/brands";
import clsx from "clsx";

export interface SongContextMenuProps {
  selectedSongIds: SongId[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

/**
 * Context menu for bulk song operations (add to playlist).
 * Displayed on right-click with position based on mouse coordinates.
 */
export function SongContextMenu({ selectedSongIds, position, onClose }: SongContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const playlists = usePlaylistsStore((state) => state.playlists);
  const bulkOps = useBulkOperations(selectedSongIds);

  // Close on click outside
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (menuRef.current && target instanceof Node && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    // Close on Escape key
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [position, onClose]);

  if (!position || selectedSongIds.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[200px] z-50"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {bulkOps.state.error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">
          {bulkOps.state.error}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          bulkOps.initiateAddToPlaylist();
          setShowPlaylistPicker(true);
        }}
        disabled={bulkOps.state.isLoading}
        className={clsx(
          "w-full text-left px-4 py-3 text-sm font-medium transition",
          "hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        Add to playlist
      </button>

      {/* Playlist Picker Modal */}
      {showPlaylistPicker && bulkOps.state.showPlaylistPicker && (
        <PlaylistPickerModal
          playlists={playlists}
          isLoading={bulkOps.state.isLoading}
          onSelect={(playlistId) => {
            bulkOps.confirmAddToPlaylist(playlistId);
            onClose();
          }}
          onClose={() => {
            bulkOps.cancelOperation();
            setShowPlaylistPicker(false);
            onClose();
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
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Select Playlist</h2>

        {playlists.length === 0 ? (
          <p className="text-slate-600 text-sm">No playlists available. Create one first.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => onSelect(playlist.id)}
                disabled={isLoading}
                className={clsx(
                  "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition",
                  "border border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {playlist.name}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-200 hover:bg-slate-300 text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
