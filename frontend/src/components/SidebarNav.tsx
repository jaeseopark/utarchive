import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { CollapsibleGroup } from "./ui/CollapsibleGroup";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { usePlaylistDragDrop } from "../hooks/usePlaylistDragDrop";

const navItems = [
  { to: "/artists", label: "Artists" },
  { to: "/albums", label: "Albums" },
  { to: "/songs", label: "Songs" },
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

interface SidebarNavProps {
  onAddPlaylistClick: () => void;
}

export function SidebarNav({ onAddPlaylistClick }: SidebarNavProps) {
  const { playlists, isLoading } = usePlaylistsStore();
  const { hoveredPlaylistId, handlePlaylistDragOver, handlePlaylistDragLeave, handlePlaylistDrop } =
    usePlaylistDragDrop();

  const sortedPlaylists = playlists.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
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
        actions={
          <button
            type="button"
            onClick={onAddPlaylistClick}
            className="rounded-lg border border-slate-400 bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
            aria-label="Add playlist"
          >
            +
          </button>
        }
      >
        {isLoading && sortedPlaylists.length === 0 ? (
          <div className="px-4 py-2 text-sm text-slate-500">Loading playlists…</div>
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
  );
}
