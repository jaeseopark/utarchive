import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArtistNameList from "../components/ArtistNameList";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getArtistNames } from "../lib/artistNames";
import { Button } from "../components/ui/Button";
import { AddAlbumModal } from "../components/AddAlbumModal";
import { useAddAlbumModalStore } from "../stores/useAddAlbumModalStore";

function AlbumsPage() {
  const navigate = useNavigate();
  const albums = useAlbumsStore((state) => state.albums);
  const isLoaded = useAlbumsStore((state) => state.isLoaded);
  const error = useAlbumsStore((state) => state.error);
  const artists = useArtistsStore((state) => state.artists);
  const { openModal } = useAddAlbumModalStore();
  const subscribe = useAlbumsStore((state) => state.subscribe);
  const unsubscribe = useAlbumsStore((state) => state.unsubscribe);

  // Set up callback for when an album is created on this tab
  useEffect(() => {
    const handleAlbumCreated = (id: string) => {
      navigate(`/albums/${id}`);
    };

    subscribe({ event: 'created', callback: handleAlbumCreated });

    return () => {
      unsubscribe({ event: 'created', callback: handleAlbumCreated });
    };
  }, [navigate, subscribe, unsubscribe]);

  const albumsWithArtistNames = useMemo(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    return albums.map((album) => ({
      ...album,
      artistNames: getArtistNames(album.artistIds ?? [], artistMap),
    }));
  }, [albums, artists]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Albums</h2>
          <p className="mt-2 text-slate-600">Browse albums in the archive.</p>
        </div>
        <Button variant="primary" onClick={openModal}>
          Add Album
        </Button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
        {!isLoaded ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            Loading albums…
          </div>
        ) : error ? (
          <div className="min-h-[240px] rounded-2xl border border-rose-400 bg-rose-100/30 p-4 text-rose-700">
            Error loading albums: {error}
          </div>
        ) : albums.length === 0 ? (
          <div className="min-h-[240px] flex items-center justify-center text-slate-600">
            No albums found.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Year</th>
              </tr>
            </thead>
            <tbody>
              {albumsWithArtistNames.map((album) => (
                <tr key={album.id} className="border-b border-slate-300 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link
                      to={`/albums/${album.id}`}
                      className="text-slate-900 transition hover:text-sky-500"
                    >
                      {album.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <ArtistNameList
                      artistIds={album.artistIds}
                      artistNames={album.artistNames}
                    />
                  </td>
                  <td className="px-4 py-4 text-slate-700">{album.yearReleased ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddAlbumModal />
    </section>
  );
}

export default AlbumsPage;
