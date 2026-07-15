import { Link } from "react-router-dom";
import type { AlbumPreview } from "../../hooks/useArtistAlbums";

interface AlbumsSectionProps {
  albums: AlbumPreview[];
}

export function AlbumsSection({ albums }: AlbumsSectionProps) {
  if (albums.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
        <h3 className="text-xl font-semibold text-slate-900">Albums</h3>
        <p className="mt-4 text-slate-600">No albums found for this artist.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <h3 className="text-xl font-semibold text-slate-900">Albums</h3>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            to={`/albums/${album.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:shadow-md"
          >
            {album.coverArtId && (
              <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-slate-100">
                <img
                  src={`/api/cover-art/${album.coverArtId}`}
                  alt={album.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
            )}
            <h4 className="font-semibold text-slate-900 group-hover:text-sky-600">
              {album.title}
            </h4>
            {album.yearReleased && (
              <p className="mt-1 text-sm text-slate-600">{album.yearReleased}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
