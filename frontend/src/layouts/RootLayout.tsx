import { useCallback, useState, type DragEvent } from "react";
import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { Button } from "../components/ui/Button";
import { CollapsibleGroup } from "../components/ui/CollapsibleGroup";
import { NotificationCenter } from "../components/NotificationCenter";
import { GlobalPlayer } from "../components/GlobalPlayer";
import { useSession } from "../context/SessionContext";
import { usePlaylists } from "../hooks/usePlaylists";
import { useNotifications } from "../hooks/useNotifications";
import { SONG_IDS_DRAG_MIME, parseDraggedSongIds } from "../lib/songDragPayload";
import { useDraggedSongsStore } from "../stores/useDraggedSongsStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { type PlaylistId } from "../types/brands";

const navItems = [
  { to: "/artists", label: "Artists" },
  { to: "/albums", label: "Albums" },
  { to: "/songs", label: "Songs" },
  { to: "/search", label: "Search" },
  { to: "/settings", label: "Settings" },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? "bg-slate-300 text-slate-900"
      : "text-slate-700 hover:bg-slate-300/70 hover:text-slate-900"
  }`;

const subNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-slate-300 text-slate-900"
      : "text-slate-700 hover:bg-slate-300/70 hover:text-slate-900"
  }`;

function RootLayout() {
  const { logout } = useSession();
  const { playlists, isLoading, error } = usePlaylists();
  const draggedSongIds = useDraggedSongsStore((state) => state.draggedSongIds);
  const clearDraggedSongIds = useDraggedSongsStore((state) => state.clearDraggedSongIds);
  const addSongToPlaylist = usePlaylistsStore((state) => state.addSongToPlaylist);
  const { notifySuccess, notifyError } = useNotifications();
  const [hoveredPlaylistId, setHoveredPlaylistId] = useState<PlaylistId | undefined>(undefined);

  const sortedPlaylists = playlists.slice().sort((a, b) => a.name.localeCompare(b.name));

  const handlePlaylistDragOver = useCallback(
    (event: DragEvent<HTMLElement>, playlistId: PlaylistId) => {
      if (draggedSongIds.length === 0 && !event.dataTransfer.types.includes(SONG_IDS_DRAG_MIME)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setHoveredPlaylistId(playlistId);
    },
    [draggedSongIds.length],
  );

  const handlePlaylistDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (event.currentTarget === event.target) {
      setHoveredPlaylistId(undefined);
    }
  }, []);

  const handlePlaylistDrop = useCallback(
    async (event: DragEvent<HTMLElement>, playlistId: PlaylistId, playlistName: string) => {
      event.preventDefault();
      setHoveredPlaylistId(undefined);

      const payload = event.dataTransfer.getData(SONG_IDS_DRAG_MIME);
      const parsedSongIds = payload ? parseDraggedSongIds(payload) : [];
      const songIdsToAdd = parsedSongIds.length > 0 ? parsedSongIds : draggedSongIds;

      if (songIdsToAdd.length === 0) {
        clearDraggedSongIds();
        return;
      }

      let successCount = 0;
      for (const songId of songIdsToAdd) {
        try {
          await addSongToPlaylist(playlistId, songId);
          successCount += 1;
        } catch {
          // Keep adding remaining songs and summarize failures below.
        }
      }

      const failedCount = songIdsToAdd.length - successCount;
      if (successCount > 0) {
        const suffix = failedCount > 0 ? `, ${failedCount} failed` : "";
        notifySuccess(`Added ${successCount} song(s) to ${playlistName}${suffix}`);
      } else {
        notifyError(`Failed to add songs to ${playlistName}`);
      }

      clearDraggedSongIds();
    },
    [addSongToPlaylist, clearDraggedSongIds, draggedSongIds, notifyError, notifySuccess],
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-slate-300 bg-slate-50/90 p-5 shadow-xl shadow-slate-200/40">
          <div className="flex-shrink-0">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">utarchive</p>
          </div>

          {/* Global Player - centered, grows to fill available space */}
          <GlobalPlayer />

          {/* Action buttons - right side */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <NotificationCenter />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-300 bg-slate-50/80 p-5 shadow-xl shadow-slate-200/20">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              ))}

              <CollapsibleGroup
                title="Playlists"
                defaultOpen
                contentClassName="space-y-1"
                accessory={sortedPlaylists.length}
              >
                <NavLink to="/playlists" className={subNavLinkClassName}>
                  All Playlists
                </NavLink>

                {isLoading && sortedPlaylists.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-slate-500">Loading playlists…</div>
                ) : error ? (
                  <div className="px-4 py-2 text-sm text-rose-600">Unable to load playlists.</div>
                ) : sortedPlaylists.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-slate-500">No playlists yet.</div>
                ) : (
                  sortedPlaylists.map((playlist) => (
                    <NavLink
                      key={playlist.id}
                      to={`/playlists/${playlist.id}`}
                      className={(props) =>
                        clsx(
                          subNavLinkClassName(props),
                          hoveredPlaylistId === playlist.id &&
                            "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
                        )
                      }
                      onDragOver={(event) => handlePlaylistDragOver(event, playlist.id)}
                      onDragLeave={handlePlaylistDragLeave}
                      onDrop={(event) => handlePlaylistDrop(event, playlist.id, playlist.name)}
                    >
                      {playlist.name}
                    </NavLink>
                  ))
                )}
              </CollapsibleGroup>
            </nav>
          </aside>

          <main className="rounded-3xl border border-slate-300 bg-slate-50/90 p-6 shadow-xl shadow-slate-200/30">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default RootLayout;
