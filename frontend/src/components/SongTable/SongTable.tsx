import type React from "react";
import { useState } from "react";
import { useSongSelection } from "../../hooks/useSongSelection";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import type { Song, SongListItem } from "../../api/schemas";
import type { SongId } from "../../types/brands";
import { SongContextMenu } from "./SongContextMenu";
import clsx from "clsx";

/**
 * Predefined column specifications for common song table columns.
 * These can be referenced by key instead of defining full ColumnDefinition.
 */
// eslint-disable-next-line no-restricted-syntax
const PREDEFINED_COLUMNS_SPEC = {
  title: {
    label: "Title",
    width: undefined,
    render: (song: Song | SongListItem) => (
      <div className="font-medium text-slate-900">
        {song.title}
        {song.playbackEnabled && (
          <span className="ml-2 text-xs font-semibold text-emerald-600">★</span>
        )}
      </div>
    ),
  },
  released: {
    label: "Released",
    width: undefined,
    render: (song: Song | SongListItem) => {
      if (song && "releasedAt" in song && typeof song.releasedAt === "string") {
        return <span>{new Date(song.releasedAt).toLocaleDateString()}</span>;
      }
      return <span>—</span>;
    },
  },
} as const;

/** Type-safe reference to predefined column keys */
export type PredefinedColumnKey = keyof typeof PREDEFINED_COLUMNS_SPEC;

export interface ColumnDefinition {
  key: string;
  label: string;
  width?: string;
  render?: (song: Song | SongListItem) => React.ReactNode;
}

/** Column input can be either a predefined key or a full custom definition */
export type ColumnInput = PredefinedColumnKey | ColumnDefinition;

export interface SongTableProps {
  songs: (Song | SongListItem)[];
  reorderable?: boolean;
  onReorder?: (reorderedSongs: (Song | SongListItem)[]) => void;
  /** Column definitions. Can use predefined keys ("title", "released") or custom definitions */
  columns?: ColumnInput[];
  actions?: RowAction[];
}

export interface RowAction {
  label: string;
  onClick: (songId: SongId) => void;
  className?: string;
}

/**
 * Expands column inputs to full column definitions.
 * - Converts predefined column keys to their full definitions
 * - Preserves order of first appearance
 * - Later definitions override earlier ones with the same key
 */
function expandColumns(columnInputs: ColumnInput[]): ColumnDefinition[] {
  const columnMap = new Map<string, ColumnDefinition>();

  // Populate map with all definitions
  for (const col of columnInputs) {
    if (typeof col === "string") {
      // Predefined column key
      columnMap.set(col, {
        key: col,
        ...PREDEFINED_COLUMNS_SPEC[col],
      });
    } else {
      // Custom column definition - overrides any predefined
      columnMap.set(col.key, col);
    }
  }

  // Return in order of first appearance in input
  const result: ColumnDefinition[] = [];
  const seen = new Set<string>();

  for (const col of columnInputs) {
    const key = typeof col === "string" ? col : col.key;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(columnMap.get(key)!);
    }
  }

  return result;
}

/**
 * Reusable, compact song table with row selection, click handling, and optional drag-and-drop.
 *
 * Features:
 * - Row highlighting for selected songs
 * - Click to select/deselect
 * - Shift+click for range selection
 * - Ctrl/Cmd+click to toggle individual selection
 * - Drag-and-drop reordering (if reorderable={true})
 * - Always compact display (tight spacing)
 * - Keyboard shortcuts (Ctrl+A/Cmd+A, Ctrl+D/Cmd+D)
 */
export function SongTable({
  songs,
  reorderable = false,
  onReorder,
  columns,
  actions,
}: SongTableProps) {
  // Selection management
  const {
    state: selectionState,
    isSelected,
    toggleSelection,
    toggleRange,
  } = useSongSelection(songs);

  // Drag-and-drop reordering (always called, enabled parameter gates functionality)
  const { handlers: dragHandlers } = useDragAndDrop(songs, onReorder || (() => {}), reorderable);

  // Context menu state
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Expand column inputs to full definitions, or use default title column
  const displayColumns = columns
    ? expandColumns(columns)
    : [
        {
          key: "title",
          ...PREDEFINED_COLUMNS_SPEC.title,
        },
      ];

  const handleRowClick = (e: React.MouseEvent, songId: SongId) => {
    // Prevent selection if clicking on action buttons
    const target = e.target;
    if (target instanceof HTMLElement && target.closest("button")) {
      return;
    }

    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;

    if (isRange && selectionState.lastClickedId) {
      toggleRange(selectionState.lastClickedId, songId);
    } else {
      toggleSelection(songId, isMulti);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, songId: SongId) => {
    e.preventDefault();

    // Select the song if not already selected
    if (!isSelected(songId)) {
      toggleSelection(songId, false);
    }

    // Show context menu at mouse position with small offset
    setContextMenuPos({
      x: e.clientX + 5,
      y: e.clientY + 5,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPos(null);
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/20">
      {songs.length === 0 ? (
        <div className="min-h-[240px] flex items-center justify-center text-slate-600">
          No songs found.
        </div>
      ) : (
        <>
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-300 text-slate-600 text-xs font-semibold">
              <tr>
                {displayColumns.map((col) => (
                  <th key={col.key} className="px-2 py-1.5" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th className="px-2 py-1.5 w-20 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody {...dragHandlers.onDragOver}>
              {songs.map((song, index) => (
                <tr
                  key={song.id}
                  draggable={reorderable}
                  onDragStart={(e) => {
                    // eslint-disable-next-line no-restricted-syntax
                    dragHandlers.onDragStart(e, song.id as SongId);
                  }}
                  onDragLeave={dragHandlers.onDragLeave}
                  onDrop={(e) => {
                    // eslint-disable-next-line no-restricted-syntax
                    const prevId = index === 0 ? null : (songs[index - 1]!.id as SongId);
                    dragHandlers.onDrop(e, prevId);
                  }}
                  onClick={(e) => {
                    // eslint-disable-next-line no-restricted-syntax
                    handleRowClick(e, song.id as SongId);
                  }}
                  onContextMenu={(e) => {
                    // eslint-disable-next-line no-restricted-syntax
                    handleContextMenu(e, song.id as SongId);
                  }}
                  className={clsx(
                    "border-b border-slate-300 last:border-b-0 transition",
                    "cursor-pointer select-none",
                    // eslint-disable-next-line no-restricted-syntax
                    isSelected(song.id as SongId)
                      ? "bg-blue-100 hover:bg-blue-200"
                      : "hover:bg-slate-100",
                  )}
                >
                  {displayColumns.map((col) => (
                    <td
                      key={`${song.id}-${col.key}`}
                      className="px-2 py-1.5"
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(song)
                        : typeof song === "object" && col.key in song
                          ? // eslint-disable-next-line no-restricted-syntax
                            String((song as Record<string, unknown>)[col.key])
                          : ""}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        {actions.map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // eslint-disable-next-line no-restricted-syntax
                              action.onClick(song.id as SongId);
                            }}
                            className={clsx(
                              "px-2 py-1 text-xs font-medium rounded transition",
                              action.className || "bg-slate-200 text-slate-700 hover:bg-slate-300",
                            )}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Context Menu */}
          <SongContextMenu
            selectedSongIds={Array.from(selectionState.selectedIds)}
            position={contextMenuPos}
            onClose={handleCloseContextMenu}
          />
        </>
      )}
    </div>
  );
}
