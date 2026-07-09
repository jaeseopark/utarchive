import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { SongTreeSchema, type SongTree } from '../api/schemas';
import FamilyTree from '../components/FamilyTree';
import UrlMap from '../components/UrlMap';
import { formatDate } from '../lib/format';
import { Button } from '../components/ui/Button';
import { useAlbumDetail } from '../hooks/useAlbumDetail';
import { useArtistsStore } from '../stores/useArtistsStore';
import { getArtistNames } from '../lib/artistNames';

const SongTreeResponseSchema = SongTreeSchema;

const AlbumDetailPage = () => {
  const { id } = useParams();
  const { album, isLoading, error } = useAlbumDetail(id || '');
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [tree, setTree] = useState<SongTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const artists = useArtistsStore((state) => state.artists);

  const toggleTree = (songId: string) => {
    if (expandedSongId === songId) {
      setExpandedSongId(null);
      setTree(null);
      setTreeError(null);
      return;
    }

    setExpandedSongId(songId);
    setTreeLoading(true);
    setTreeError(null);

    api
      .get(`/api/songs/${songId}/tree`, SongTreeResponseSchema)
      .then(setTree)
      .catch((err) => setTreeError(err instanceof Error ? err.message : String(err)))
      .finally(() => setTreeLoading(false));
  };

  const trackRows = useMemo(() => album?.tracks ?? [], [album]);

  const albumArtistNames = useMemo(() => {
    if (!album) return [];
    return getArtistNames(album.artistIds ?? [], artists);
  }, [album, artists]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Album detail</h2>
        <p className="mt-2 text-slate-600">View album metadata and the merged track list.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">Loading album…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">Error loading album: {error}</div>
      ) : album ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">{album.title}</h1>
                <div className="mt-2 text-slate-700">
                  Artist{albumArtistNames.length > 1 ? 's' : ''}{' '}
                  {albumArtistNames.length > 0 ? (
                    albumArtistNames.map((name, index) => (
                      <span key={index}>
                        {index > 0 && ', '}
                        <Link to={`/artists/${album.artistIds[index]}`} className="text-sky-500 hover:underline">
                          {name}
                        </Link>
                      </span>
                    ))
                  ) : (
                    'Unknown'
                  )}
                </div>
                <div className="mt-1 text-slate-700">Year: {album.yearReleased ?? '—'}</div>
              </div>
              <div className="rounded-3xl border border-slate-300 bg-slate-100/80 p-4 text-sm text-slate-700">
                Created: {formatDate(album.createdAt) ?? '—'}
              </div>
            </div>
            <div className="mt-6">
              <UrlMap urls={album.urls} />
            </div>
          </div>

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <h3 className="text-xl font-semibold text-slate-900">Track list</h3>
            {trackRows.length === 0 ? (
              <p className="mt-4 text-slate-600">No tracks are available for this album.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-300 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Reference Title</th>
                      <th className="px-4 py-3">Registered Song</th>
                      <th className="px-4 py-3">Family Tree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackRows.map((track) => {
                      const song = track.song;
                      const isRegistered = track.isRegistered && Boolean(song?.id);
                      const isExpanded = expandedSongId === song?.id;
                      return (
                        <Fragment key={`${track.trackNumber}-${song?.id ?? 'unreg'}`}>
                          <tr className="border-b border-slate-300 last:border-b-0">
                            <td className="px-4 py-4 text-slate-700">{track.trackNumber}</td>
                            <td className="px-4 py-4 text-slate-900">{track.referenceTitle ?? song?.title ?? '—'}</td>
                            <td className="px-4 py-4 text-slate-700">
                              {isRegistered && song ? (
                                <Link to={`/songs/${song.id}`} className="text-sky-500 hover:underline">
                                  {song.title}
                                </Link>
                              ) : (
                                <span className="text-slate-500">*(not registered)*</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {isRegistered && song ? (
                                <Button
                                  variant="secondary"
                                  onClick={() => toggleTree(song.id)}
                                  className="text-xs px-3 py-2"
                                >
                                  {isExpanded ? '▼ hide tree' : '▶ show tree'}
                                </Button>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr>
                              <td colSpan={4} className="bg-slate-100/90 px-4 py-4">
                                {treeLoading ? (
                                  <div className="text-slate-600">Loading tree…</div>
                                ) : treeError ? (
                                  <div className="text-rose-600">Error loading tree: {treeError}</div>
                                ) : tree ? (
                                  <FamilyTree masterId={tree.masterId} currentSongId={song.id} />
                                ) : null}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default AlbumDetailPage;
