import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { SidebarNav } from "../components/SidebarNav";
import { PlaylistCreateModal } from "../components/PlaylistCreateModal";
import { NotificationCenter } from "../components/NotificationCenter";
import { GlobalPlayer } from "../components/GlobalPlayer";
import { HeaderSearchBar } from "../components/HeaderSearchBar";

function RootLayout() {
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
            <Link
              to="/settings"
              className="p-2 rounded-lg transition-colors hover:bg-slate-100"
              title="Settings"
              aria-label="Settings"
            >
              {/* Gear Icon */}
              <svg
                className="w-6 h-6 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
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