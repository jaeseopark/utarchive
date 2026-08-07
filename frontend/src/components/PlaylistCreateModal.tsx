import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/Button";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";

interface PlaylistCreateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaylistCreateModal({ isOpen, onOpenChange }: PlaylistCreateModalProps) {
  const navigate = useNavigate();
  const createPlaylist = usePlaylistsStore((state) => state.createPlaylist);
  const subscribe = usePlaylistsStore((state) => state.subscribe);
  const unsubscribe = usePlaylistsStore((state) => state.unsubscribe);
  const [playlistName, setPlaylistName] = useState("");

  useEffect(() => {
    const handlePlaylistCreated = (id: string) => {
      setPlaylistName("");
      onOpenChange(false);
      navigate(`/playlists/${id}`);
    };

    subscribe({ event: 'created', callback: handlePlaylistCreated });

    return () => {
      unsubscribe({ event: 'created', callback: handlePlaylistCreated });
    };
  }, [navigate, subscribe, unsubscribe, onOpenChange]);

  const handleCreatePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createPlaylist(playlistName);
    } catch {
      // Error is already set in store
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-300 bg-slate-50 p-6 shadow-xl shadow-slate-200/40">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Add Playlist</h3>
          <button
            type="button"
            className="rounded-full border border-slate-400 bg-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-500 hover:bg-slate-300"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleCreatePlaylist}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="playlist-name">
            Playlist name
          </label>
          <input
            id="playlist-name"
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            className="w-full rounded-3xl border border-slate-400 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="My new playlist"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Playlist</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
