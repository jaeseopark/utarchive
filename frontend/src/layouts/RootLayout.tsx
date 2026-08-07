import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { SidebarNav } from "../components/SidebarNav";
import { PlaylistCreateModal } from "../components/PlaylistCreateModal";
import { NotificationCenter } from "../components/NotificationCenter";
import { GlobalPlayer } from "../components/GlobalPlayer";
import { HeaderSearchBar } from "../components/HeaderSearchBar";
import { useSession } from "../context/SessionContext";

function RootLayout() {
  const { logout } = useSession();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-slate-300 bg-slate-50/90 p-5 shadow-xl shadow-slate-200/40">
          <div className="flex-shrink-0">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">utarchive</p>
          </div>

          {/* Global Player - centered, grows to fill available space */}
          <GlobalPlayer />

          {/* Header Search Bar - far right, before action buttons */}
          <HeaderSearchBar className="w-64" />

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
            <SidebarNav onAddPlaylistClick={() => setIsPlaylistModalOpen(true)} />
          </aside>

          <main className="rounded-3xl border border-slate-300 bg-slate-50/90 p-6 shadow-xl shadow-slate-200/30">
            <Outlet />
          </main>
        </div>
      </div>

      <PlaylistCreateModal
        isOpen={isPlaylistModalOpen}
        onOpenChange={setIsPlaylistModalOpen}
      />
    </div>
  );
}

export default RootLayout;