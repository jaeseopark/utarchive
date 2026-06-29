import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AlbumDetailSchema, type AlbumDetail, type SongTree } from '../api/schemas';
import { z } from 'zod';
import FamilyTree from '../components/FamilyTree';
import UrlMap from '../components/UrlMap';
import { formatDate } from '../lib/format';
import { Button } from '../components/ui/Button';

const AlbumDetailResponseSchema = AlbumDetailSchema;
const SongTreeResponseSchema = z.object({
  masterId: z.string().uuid(),
  nodes: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    parentId: z.string().uuid().nullable().optional(),
    depth: z.number().int(),
    artistIds: z.array(z.string().uuid()),
    artistNames: z.array(z.string()),
    coverArtId: z.string().uuid().nullable().optional(),
    preferred: z.boolean(),

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [tree, setTree] = useState<SongTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    api.get(`/api/albums/${id}`, AlbumDetailResponseSchema)
      .then(setAlbum)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Album detail</h2>
        <p className="mt-2 text-slate-400">View album metadata and the merged track list.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">Loading album…</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-600 bg-rose-950/30 p-6 text-rose-100">Error loading album: {error}</div>
      ) : album ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-100">{album.title}</h1>
                <div className="mt-2 text-slate-300">
                  Artist:{' '}
                  {album.artistName ? (
                    <Link to={`/artists/${album.artistId}`} className="text-sky-300 hover:underline">
                      {album.artistName}
                    </Link>
                  ) : (
                    'Unknown'
                  )}
                </div>
                <div className="mt-1 text-slate-300">Year: {album.yearReleased ?? '—'}</div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200">
                Created: {formatDate(album.createdAt) ?? '—'}
              </div>
            </div>
            <div className="mt-6">
              <UrlMap urls={album.urls} />
            </div>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
            <h3 className="text-xl font-semibold text-slate-100">Track list</h3>
            {trackRows.length === 0 ? (
              <p className="mt-4 text-slate-400">No tracks are available for this album.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="border-b border-slate-700 text-slate-400">
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
                          <tr className="border-b border-slate-800 last:border-b-0">
                            <td className="px-4 py-4 text-slate-300">{track.trackNumber}</td>
                            <td className="px-4 py-4 text-slate-100">{track.referenceTitle ?? song?.title ?? '—'}</td>
                            <td className="px-4 py-4 text-slate-300">
                              {isRegistered && song ? (
                                <Link to={`/songs/${song.id}`} className="text-sky-300 hover:underline">
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
                              <td colSpan={4} className="bg-slate-900/90 px-4 py-4">
                                {treeLoading ? (
                                  <div className="text-slate-400">Loading tree…</div>
                                ) : treeError ? (
                                  <div className="text-rose-300">Error loading tree: {treeError}</div>
                                ) : tree ? (
                                  <FamilyTree nodes={tree.nodes} currentSongId={song.id} />
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
