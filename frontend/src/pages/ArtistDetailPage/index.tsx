import { useParams } from "react-router-dom";
import { useArtistDetail } from "../../hooks/useArtistDetail";
import { useArtistAlbums } from "../../hooks/useArtistAlbums";
import { useArtistSongs } from "../../hooks/useArtistSongs";
import { toBrandId, type ArtistId } from "../../types/brands";
import { ArtistHeader } from "./ArtistHeader";
import { SongsSection } from "./SongsSection";
import { AlbumsSection } from "./AlbumsSection";

function ArtistDetailPage() {
  const { id } = useParams<"id">();
  const artistId = toBrandId<ArtistId>(id || "");
  
  const {
    artist,
    isLoading: artistLoading,
    error: artistError,
  } = useArtistDetail(artistId);

  const { songs, isLoading: songsLoading, error: songsError, updateSong } = useArtistSongs(artistId);
  const { albums, isLoading: albumsLoading, error: albumsError } = useArtistAlbums(artistId);

  const handlePlaybackEnabledChange = (songId: string, newPlaybackEnabled: boolean) => {
    updateSong(songId, { playbackEnabled: newPlaybackEnabled });
  };

  const isLoading = artistLoading || songsLoading || albumsLoading;
  const error = artistError || songsError || albumsError;

  const getContent = () => {
    if (isLoading) {
      return (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading artist…
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading artist: {error}
        </div>
      );
    }

    if (!artist) {
      return null;
    }

    return (
      <div className="space-y-6">
        <ArtistHeader artist={artist} />
        <SongsSection
          songs={songs}
          onPlaybackEnabledChange={handlePlaybackEnabledChange}
        />
        <AlbumsSection albums={albums} />
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Artist detail</h2>
      </div>
      {getContent()}
    </section>
  );
}

export default ArtistDetailPage;
