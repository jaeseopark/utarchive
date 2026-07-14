import { useState } from "react";
import React from "react";
import { SongSelector } from "./SongSelector";

export { SongSelector } from "./SongSelector";

/**
 * Hook for managing song selector modal state and rendering
 * Returns an object with the modal Component, visibility state, and control functions
 */
export function useSongSelectorModal(props: React.ComponentProps<typeof SongSelector>) {
  const [isOpen, setOpen] = useState(false);

  const open = () => setOpen(true);
  const close = () => setOpen(false);

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
        <SongSelector {...props} />
      </div>
    </div>
  ) : null;

  return { Component, isOpen, open, close };
}
