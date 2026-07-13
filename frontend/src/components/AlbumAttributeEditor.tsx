import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CreatableSelect from "react-select/creatable";
import { Button } from "./ui/Button";
import { type AlbumDetail } from "../api/schemas";
import { useUpdateAlbum } from "../hooks/useUpdateAlbum";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getChangedProperties } from "../lib/compareObjects";
import { z } from "zod";
import clsx from "clsx";

// Define the update schema - only editable fields
const AlbumUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  yearReleased: z.number().int().nullable().optional(),
  artistIds: z.array(z.string().uuid()).optional(),
  urls: z.array(z.string()).optional(),
});

type AlbumUpdateInput = z.infer<typeof AlbumUpdateSchema>;

/**
 * Helper function to convert an Album to form values
 * Used for both defaultValues and reset operations
 */
function getFormValuesFromAlbum(album: AlbumDetail): AlbumUpdateInput {
  return {
    title: album.title,
    yearReleased: album.yearReleased ?? null,
    artistIds: album.artistIds ?? [],
    urls: album.urls ?? [],
  };
}

type ArtistOption = {
  value: string;
  label: string;
};

type UrlOption = {
  value: string;
  label: string;
};

function isArtistOptionArray(value: unknown): value is ArtistOption[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null && "value" in item && "label" in item)
  );
}

function isUrlOptionArray(value: unknown): value is UrlOption[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null && "value" in item && "label" in item)
  );
}

interface AlbumAttributesEditorProps {
  album: AlbumDetail;
  mode: "view" | "edit";
  onExitEditMode: () => void;
}

function AlbumAttributesEditorContent({
  album,
  mode,
  onExitEditMode,
}: AlbumAttributesEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<UrlOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { updateAlbumData } = useUpdateAlbum();
  const artists = useArtistsStore((state) => state.artists);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlbumUpdateInput>({
    resolver: zodResolver(AlbumUpdateSchema),
    mode: "onBlur",
    defaultValues: getFormValuesFromAlbum(album),
  });

  // Sync form and component state with album data
  useEffect(() => {
    reset(getFormValuesFromAlbum(album));

    // Sync selectedArtists with album.artistIds
    const artistIds = album.artistIds ?? [];
    const selectedArtistsList: ArtistOption[] = artistIds
      .map((id) => {
        const artist = artists.find((a) => a.id === id);
        return artist ? { value: String(id), label: artist.name } : null;
      })
      .filter((item): item is ArtistOption => item !== null);
    setSelectedArtists(selectedArtistsList);

    // Sync selectedUrls with album.urls
    const urls = album.urls ?? [];
    const selectedUrlsList = urls.map((url) => ({ value: url, label: url }));
    setSelectedUrls(selectedUrlsList);

    setError(null);
  }, [album, reset, artists]);

  const onSubmit = useCallback(
    async (data: AlbumUpdateInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        // Override form data with current selections from component state
        // This ensures URLs and artistIds reflect what the user selected in the CreatableSelect components
        data.urls = selectedUrls.map((u) => u.value);
        data.artistIds = selectedArtists.map((a) => a.value);

        // Get only the properties that changed
        const originalValues = getFormValuesFromAlbum(album);
        const changedData = getChangedProperties(originalValues, data);

        if (Object.keys(changedData).length === 0) {
          onExitEditMode();
          return;
        }

        await updateAlbumData(album.id, changedData);
        onExitEditMode();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update album";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [album, updateAlbumData, onExitEditMode, selectedUrls, selectedArtists],
  );

  if (mode === "view") {
    return (
      <div className="space-y-4 text-sm text-slate-700">
        <div>
          <span className="font-medium">Title:</span> {album.title}
        </div>
        <div>
          <span className="font-medium">Year Released:</span> {album.yearReleased ?? "—"}
        </div>
        <div>
          <span className="font-medium">Artists:</span>{" "}
          {album.artistIds && album.artistIds.length > 0
            ? album.artistIds
                .map((id) => {
                  const artist = artists.find((a) => a.id === id);
                  return artist?.name ?? id;
                })
                .join(", ")
            : "—"}
        </div>
        <div>
          <span className="font-medium">URLs:</span>{" "}
          {album.urls && album.urls.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {album.urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-500 hover:underline break-all"
                >
                  {url}
                </a>
              ))}
            </div>
          ) : (
            "—"
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
        <input
          type="text"
          {...register("title")}
          className={clsx(
            "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
            errors.title
              ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-400 focus:ring-sky-200",
          )}
          disabled={isSubmitting}
        />
        {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
      </div>

      {/* Year Released */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Year Released</label>
        <input
          type="number"
          {...register("yearReleased", { valueAsNumber: true })}
          placeholder="e.g., 2024"
          className={clsx(
            "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
            errors.yearReleased
              ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-400 focus:ring-sky-200",
          )}
          disabled={isSubmitting}
        />
        {errors.yearReleased && (
          <p className="mt-1 text-xs text-rose-600">{errors.yearReleased.message}</p>
        )}
      </div>

      {/* Artists */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Artists</label>
        <CreatableSelect
          isMulti
          isClearable
          isDisabled={isSubmitting}
          options={artists.map((a) => ({ value: a.id, label: a.name }))}
          value={selectedArtists}
          onChange={(newValue) => {
            if (isArtistOptionArray(newValue)) {
              const selectedValues = newValue.map((v) => v.value);
              setSelectedArtists(
                selectedValues.map((id) => {
                  const artist = artists.find((a) => a.id === id);
                  return artist ? { value: id, label: artist.name } : { value: id, label: id };
                }),
              );
            } else {
              setSelectedArtists([]);
            }
          }}
          className="text-sm"
          classNamePrefix="react-select"
        />
      </div>

      {/* URLs */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">URLs</label>
        <CreatableSelect
          isMulti
          isClearable
          isDisabled={isSubmitting}
          value={selectedUrls}
          onChange={(newValue) => {
            if (isUrlOptionArray(newValue)) {
              const selectedValues = newValue.map((v) => v.value);
              setSelectedUrls(selectedValues.map((url) => ({ value: url, label: url })));
            } else {
              setSelectedUrls([]);
            }
          }}
          className="text-sm"
          classNamePrefix="react-select"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onExitEditMode}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

interface UseAlbumAttributesEditorReturn {
  Component: React.ReactNode;
  enterEditMode: () => void;
  mode: "view" | "edit";
}

/**
 * Hook that manages the edit mode state for AlbumAttributeEditor
 *
 * Usage:
 * const { Component, enterEditMode, mode } = useAlbumAttributeEditor(album);
 *
 * Then render Component somewhere, and call enterEditMode() to enable editing
 *
 * Note: Always call this hook unconditionally, even if album is null.
 * The hook handles null albums internally.
 */
export function useAlbumAttributeEditor(album: AlbumDetail | null): UseAlbumAttributesEditorReturn {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const exitEditMode = useCallback(() => setMode("view"), []);
  const enterEditMode = useCallback(() => setMode("edit"), []);

  const Component = album ? (
    <AlbumAttributesEditorContent album={album} mode={mode} onExitEditMode={exitEditMode} />
  ) : null;

  return { Component, enterEditMode, mode };
}

export function AlbumAttributeEditor({ album }: { album: AlbumDetail }) {
  const { Component } = useAlbumAttributeEditor(album);
  return <>{Component}</>;
}
