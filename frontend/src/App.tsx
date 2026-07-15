import { Route, Routes, Navigate } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useWebSocketMessageHandling } from "./hooks/useWebSocketIntegration";
import { useInitializePlayerWithConfig } from "./hooks/useUserConfig";
import LoginPage from "./pages/LoginPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import SongDetailPage from "./pages/SongDetailPage";
import SongsPage from "./pages/SongsPage";
import AlbumsPage from "./pages/AlbumsPage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import SearchPage from "./pages/SearchPage";
import { NotificationsPage } from "./pages/NotificationsPage";

function App() {
  // Initialize WebSocket message handlers and cleanup
  useWebSocketMessageHandling();

  // Initialize player with user config settings and setup multi-tab sync
  useInitializePlayerWithConfig();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
     <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/songs" replace />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistDetailPage />} />
        <Route path="songs" element={<SongsPage />} />
        <Route path="songs/:id" element={<SongDetailPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumDetailPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlists/:id" element={<PlaylistDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/songs" replace />} />
    </Routes>
  );
}

export default App;
