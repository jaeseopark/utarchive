import { Fragment, useCallback, useState } from "react";
import { Button } from "./ui/Button";
import { type NumberedTrack, hasSongId, isLiteralTrack } from "../types/album";
import clsx from "clsx";

interface TrackListEditorProps {
  tracks: NumberedTrack[];
  onTracksChange: (tracks: NumberedTrack[]) => void;
  onSelectExistingSong?: (trackNumber: number) => void;
  loading?: boolean;
  showLinkButton?: boolean;
}

/**
 * Editor for album track lists
 * Allows adding, removing, and editing individual tracks
 * Each track can be either a song ID reference or a literal track entry
 */
export function TrackListEditor({
  tracks,
  onTracksChange,
  onSelectExistingSong,
  loading = false,
  showLinkButton = true,
}: TrackListEditorProps) {
  // Track number being edited - kept for future UI enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingTrackNumber, setEditingTrackNumber] = useState<number | null>(null);

  const handleAddTrack = useCallback(() => {
    const newTrackNumber = Math.max(0, ...tracks.map((t) => t.trackNumber)) + 1;
    const newTrack: NumberedTrack = {
      trackNumber: newTrackNumber,
      title: "",
    };
    onTracksChange([...tracks, newTrack]);
  }, [tracks, onTracksChange]);

  const handleRemoveTrack = useCallback(
    (trackNumber: number) => {
      onTracksChange(tracks.filter((t) => t.trackNumber !== trackNumber));
    },
    [tracks, onTracksChange],
  );

  const handleUpdateTrack = useCallback(
    (trackNumber: number, updates: Partial<NumberedTrack>) => {
      const updatedTracks = tracks.map((track) => {
        if (track.trackNumber === trackNumber) {
          return { ...track, ...updates };
        }
        return track;
      });
      onTracksChange(updatedTracks);
    },
    [tracks, onTracksChange],
  );

  const handleSelectSong = useCallback(
    (trackNumber: number) => {
      onSelectExistingSong?.(trackNumber);
    },
    [onSelectExistingSong],
  );

  const handleUnlinkTrack = useCallback(
    (trackNumber: number) => {
      const updatedTracks = tracks.map((track) => {
        if (track.trackNumber === trackNumber) {
          // Convert from songId reference to literal track
          return {
            trackNumber: track.trackNumber,
            title: "",
            artists: undefined,
            duration: undefined,
          };
        }
        return track;
      });
      onTracksChange(updatedTracks);
    },
    [tracks, onTracksChange],
  );

  const handleFormatDuration = (seconds: number | undefined): string => {
    if (seconds === undefined) return "";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const handleParseDuration = (formatted: string): number | undefined => {
    if (!formatted) return undefined;
    const parts = formatted.split(":");
    if (parts.length === 1) {
      const seconds = parseInt(parts[0], 10);
      return isNaN(seconds) ? undefined : seconds;
    }
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (isNaN(minutes) || isNaN(seconds)) return undefined;
      return minutes * 60 + seconds;
    }
    return undefined;
  };

  if (tracks.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          No tracks yet. Add tracks after album creation or add them now.
        </p>
        <Button type="button" onClick={handleAddTrack} disabled={loading}>
          Add Track
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Track #</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Title</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Artists</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Duration</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <Fragment key={track.trackNumber}>
                <tr
                  className={clsx(
                    "border-b border-slate-200 hover:bg-slate-50",
                    editingTrackNumber === track.trackNumber && "bg-blue-50",
                  )}
                >
                  <td className="px-3 py-2 text-slate-900">{track.trackNumber}</td>
                  <td className="px-3 py-2">
                    {hasSongId(track) ? (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Song ID: {track.songId.slice(0, 8)}...
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={track.title || ""}
                        onChange={(e) =>
                          handleUpdateTrack(track.trackNumber, { title: e.target.value })
                        }
                        placeholder="Track title"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        disabled={loading}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isLiteralTrack(track) && (
                      <input
                        type="text"
                        value={track.artists || ""}
                        onChange={(e) =>
                          handleUpdateTrack(track.trackNumber, { artists: e.target.value })
                        }
                        placeholder="Artists"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        disabled={loading}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isLiteralTrack(track) && (
                      <input
                        type="text"
                        value={handleFormatDuration(track.duration)}
                        onChange={(e) =>
                          handleUpdateTrack(track.trackNumber, {
                            duration: handleParseDuration(e.target.value),
                          })
                        }
                        placeholder="mm:ss"
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        disabled={loading}
                      />
                    )}
                  </td>
                  <td className="space-x-1 px-3 py-2">
                    {showLinkButton && !hasSongId(track) && (
                      <button
                        type="button"
                        onClick={() => handleSelectSong(track.trackNumber)}
                        className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200 disabled:opacity-50"
                        disabled={loading}
                        title="Link to existing song"
                      >
                        Link Song
                      </button>
                    )}
                    {showLinkButton && hasSongId(track) && (
                      <button
                        type="button"
                        onClick={() => handleUnlinkTrack(track.trackNumber)}
                        className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                        disabled={loading}
                        title="Unlink from song"
                      >
                        Unlink Song
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(track.trackNumber)}
                      className="rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                      disabled={loading}
                      title="Remove track"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handleAddTrack} disabled={loading}>
          Add Track
        </Button>
      </div>
    </div>
  );
}
