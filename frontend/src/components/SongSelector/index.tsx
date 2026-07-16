import { useState } from "react";
import React from "react";
import { SongSelector } from "./SongSelector";

export { SongSelector } from "./SongSelector";

/**
 * Hook for managing song selector modal state and rendering
 * Returns an object with the modal Component, visibility state, and control functions
 * Automatically closes the modal when a song is selected (single-select mode)
 * Can optionally execute additional cleanup via onClose callback
 */
export function useSongSelectorModal(
  props: React.ComponentProps<typeof SongSelector> & { onClose?: () => void },
) {
  const [isOpen, setOpen] = useState(false);

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  // Wrap callbacks to close modal after selection
  const wrappedProps = React.useMemo(() => {
    const { onClose: additionalOnClose, ...selectorProps } = props;

    if ("onSongSelected" in selectorProps) {
      const originalCallback = selectorProps.onSongSelected;
      selectorProps.onSongSelected = (songId: string) => {
        originalCallback(songId);
        additionalOnClose?.();
        close();
      };
    }

    if ("onSongsSelected" in selectorProps) {
      const originalCallback = selectorProps.onSongsSelected;
      selectorProps.onSongsSelected = (songIds: string[]) => {
        originalCallback(songIds);
        additionalOnClose?.();
        close();
      };
    }

    return selectorProps;
  }, [props]);

  const Component = isOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 transition"
          aria-label="Close"
        >
          ✕
        </button>
        <SongSelector {...wrappedProps} />
      </div>
    </div>
  ) : null;

  return { Component, isOpen, open, close };
}
