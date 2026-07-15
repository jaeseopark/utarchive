import { Fragment, useMemo } from "react";
import FamilyTree from "../../components/FamilyTree";
import { useFamilyTree } from "../../hooks/useFamilyTree";
import { toBrandId, type AlbumId, type SongId } from "../../types/brands";
import type { Album, Artist, Song } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];
import TrackSongCell from "./TrackSongCell";
import TrackArtistsCell from "./TrackArtistsCell";
import TrackDurationCell from "./TrackDurationCell";
import TrackActionsCell from "./TrackActionsCell";

interface TrackRowProps {
  track: AlbumTrack;
  album: Album;
  artists: Artist[];
  songDetail: Song | undefined;
  isExpanded: boolean;
  onToggleTree: () => void;
  onUnlinkSong: (albumId: AlbumId, songId: SongId, trackNumber: number) => void;
  onSelectExistingSong: (trackNumber: number) => void;
  trackOperation: { type: "linking" | "unlinking"; error?: string } | undefined;
  onPlaySong: (song: Song) => void;
  onRowClick: () => void;
  onRowDoubleClick: () => void;
  isSelected: boolean;
}

const TrackRow = ({
  track,
  album,
  artists,
  songDetail,
  isExpanded,
  onToggleTree,
  onUnlinkSong,
  onSelectExistingSong,
  trackOperation,
  onPlaySong,
  onRowClick,
  onRowDoubleClick,
  isSelected,
}: TrackRowProps) => {
  // Always call the hook unconditionally
  const { tree, isLoading: treeLoading, error: treeError } = useFamilyTree(
    songDetail?.masterId || toBrandId<SongId>("0"),
    track.song?.id ? toBrandId<SongId>(track.song.id) : undefined,
  );

  const rowClassname = useMemo(
    () =>
      `border-b border-slate-300 last:border-b-0 ${
        isSelected ? "bg-blue-50 cursor-pointer" : "hover:bg-slate-50"
      } ${track.song?.id ? "cursor-pointer transition" : ""}`,
    [isSelected, track.song?.id],
  );

  return (
    <Fragment key={`${track.trackNumber}-${track.song?.id ?? "unreg"}`}>
      <tr
        onClick={onRowClick}
        onDoubleClick={onRowDoubleClick}
        className={rowClassname}
      >
        <td className="px-4 py-4 text-slate-700">{track.trackNumber}</td>
        <td className="px-4 py-4 text-slate-900 min-w-48">
          <TrackSongCell track={track} songDetail={songDetail} onPlaySong={onPlaySong} />
        </td>
        <td className="px-4 py-4 text-slate-600">
          <TrackArtistsCell track={track} artists={artists} songDetail={songDetail} />
        </td>
        <td className="px-4 py-4 text-slate-600 text-center">
          <TrackDurationCell track={track} album={album} songDetail={songDetail} />
        </td>
        <td className="px-4 py-4">
          <TrackActionsCell
            track={track}
            isExpanded={isExpanded}
            onToggleTree={onToggleTree}
            onUnlinkSong={onUnlinkSong}
            onSelectExistingSong={onSelectExistingSong}
            trackOperation={trackOperation}
            albumId={album.id}
          />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-slate-100/90 px-4 py-4">
            {treeLoading ? (
              <div className="text-slate-600">Loading tree…</div>
            ) : treeError ? (
              <div className="text-rose-600">Error loading tree: {treeError}</div>
            ) : tree ? (
              <FamilyTree masterId={tree.masterId} currentSongId={track.song?.id} />
            ) : null}
          </td>
        </tr>
      )}
    </Fragment>
  );
};

export default TrackRow;
