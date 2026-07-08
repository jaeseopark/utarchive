import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type { SongTreeNode } from '../api/schemas';
import { getArtistNames } from '../lib/artistNames';
import { useArtistsStore } from '../stores/useArtistsStore';
import { PlaybackEnabledToggle } from './PlaybackEnabledToggle';

interface FamilyTreeProps {
  nodes: SongTreeNode[];
  currentSongId: string;
  onPlaybackEnabledChange?: (nodeId: string, newPlaybackEnabled: boolean) => void;
}

function FamilyTree({ nodes: nodesWithoutArtistNames, currentSongId, onPlaybackEnabledChange }: FamilyTreeProps) {
  const artists = useArtistsStore((state) => state.artists);

  const nodes = useMemo(() => {
    const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));
    return nodesWithoutArtistNames.map((node) => ({
      ...node,
      artistNames: getArtistNames(node.artistIds, artistMap),
    }));
  }, [nodesWithoutArtistNames, artists]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-inner shadow-slate-200/20">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="px-3 py-2">Depth</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Artists</th>
            <th className="px-3 py-2">Released</th>
            <th className="px-3 py-2">Playback Enabled</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => {
            const isCurrent = node.id === currentSongId;
            return (
              <tr
                key={node.id}
                className={isCurrent ? 'bg-slate-100/90 font-semibold text-slate-900' : 'border-t border-slate-300 text-slate-700'}
              >
                <td className="px-3 py-3 align-top text-slate-600">{node.depth}</td>
                <td className="px-3 py-3 align-top">
                  <Link
                    to={`/songs/${node.id}`}
                    className="block truncate text-slate-900 transition hover:text-sky-500"
                    style={{ paddingLeft: `${Math.min(node.depth * 18, 72)}px` }}
                  >
                    {node.title}
                  </Link>
                </td>
                <td className="px-3 py-3 align-top text-slate-700">
                  {node.artistNames.join(', ') || 'Unknown'}
                </td>
                <td className="px-3 py-3 align-top text-slate-700">{node.releasedAt ? new Date(node.releasedAt).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-3 align-middle">
                  <div className="h-6">
                    <PlaybackEnabledToggle
                      songId={node.id}
                      isEnabled={node.playbackEnabled}
                      onPlaybackEnabledChange={onPlaybackEnabledChange}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FamilyTree;
