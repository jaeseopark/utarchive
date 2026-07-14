import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CreatableSelect from "react-select/creatable";
import { Button } from "./ui/Button";
import { type Song } from "../api/schemas";
import { useSongUpdate } from "../hooks/useSongUpdate";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useCreateArtist } from "../hooks/useCreateArtist";
import { formatDate } from "../lib/format";
import { getChangedProperties } from "../lib/compareObjects";
import UrlListComponent from "./UrlList";
import { z } from "zod";
import clsx from "clsx";

// Define the update schema - only editable fields (excludes coverArtId which is managed separately)
const SongUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  releasedAt: z.string().nullable().optional(),
  urls: z.array(z.string()).optional(),
  description: z.string().nullable().optional(),
  playbackEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  artistIds: z.array(z.string().uuid()).optional(),
});

type SongUpdateInput = z.infer<typeof SongUpdateSchema>;

/**
 * Helper function to convert a Song to form values
 * Used for both defaultValues and reset operations
 */
function getFormValuesFromSong(song: Song): SongUpdateInput {
  return {
    title: song.title,
    releasedAt: song.releasedAt ?? "",
    urls: song.urls ?? [],
    description: song.description ?? "",
    playbackEnabled: song.playbackEnabled ?? false,
    tags: song.tags ?? [],
    artistIds: song.artistIds ?? [],
  };
}

type ArtistOption = {
  value: string;
  label: string;
  isNew?: boolean;
};

type TagOption = {
  value: string;
  label: string;
};

type UrlOption = {
  value: string;
  label: string;
};

interface SongAttributesEditorProps {
  song: Song;
  mode: "view" | "edit";
  onExitEditMode: () => void;
}

function SongAttributesEditorContent({ song, mode, onExitEditMode }: SongAttributesEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<UrlOption[]>([]);
  const { updateSongData } = useSongUpdate();
  const artists = useArtistsStore((state) => state.artists);
  const isLoading = useArtistsStore((state) => state.isLoading);
  const { createArtist } = useCreateArtist();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SongUpdateInput>({
    resolver: zodResolver(SongUpdateSchema),
    mode: "onBlur",
    defaultValues: getFormValuesFromSong(song),
  });

  // Sync form and component state with song data
  // Only reset when song ID changes to avoid losing edits during view mode
  useEffect(() => {
    reset(getFormValuesFromSong(song));

    // Sync selectedArtists with song.artistIds
    if (artists.length > 0) {
      const artistIds = song.artistIds ?? [];
      // eslint-disable-next-line no-restricted-syntax
      const selected = artistIds
        .map((id) => {
          const artist = artists.find((a) => a.id === id);
          return artist ? { value: artist.id, label: artist.name } : null;
        })
        .filter((a) => a !== null) as ArtistOption[];
      setSelectedArtists(selected);
    } else if ((song.artistIds ?? []).length === 0) {
      // If song has no artists, clear the selection
      setSelectedArtists([]);
    }

    // Sync selectedTags with song.tags
    const tags = song.tags ?? [];
    const selectedTagsList = tags.map((tag) => ({ value: tag, label: tag }));
    setSelectedTags(selectedTagsList);

    // Sync selectedUrls with song.urls
    const urls = song.urls ?? [];
    const selectedUrlsList = urls.map((url) => ({ value: url, label: url }));
    setSelectedUrls(selectedUrlsList);
  }, [song.id, artists, reset]);
  // Note: song is used in body but only song.id in deps - effect runs only when song ID changes

  const onSubmit = useCallback(
    async (data: SongUpdateInput) => {
      setIsSubmitting(true);
      try {
        // Step 1: Normalize the form data (convert empty strings to null)
        // Override artistIds and tags with the current selections from CreatableSelect
        const cleanedFormData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          cleanedFormData[key] = value === "" ? null : value;
        });

        // Override with current selections from component state
        cleanedFormData.artistIds = selectedArtists.map((a) => a.value);
        cleanedFormData.tags = selectedTags.map((t) => t.value);
        cleanedFormData.urls = selectedUrls.map((u) => u.value);

        // Step 2: Create a normalized version of the original song for comparison
        // Use the same shape as the form data so we can compare them directly
        const originalSongNormalized: Record<string, unknown> = {
          title: song.title,
          releasedAt: song.releasedAt ?? null,
          urls: song.urls ?? [],
          description: song.description ?? null,
          playbackEnabled: song.playbackEnabled ?? false,

          tags: song.tags ?? [],
          artistIds: song.artistIds ?? [],
        };

        // Step 3: Get only the properties that have changed
        const changedProperties = getChangedProperties(originalSongNormalized, cleanedFormData);

        // Step 4: If nothing changed, just close edit mode
        if (Object.keys(changedProperties).length === 0) {
          onExitEditMode();
          return;
        }

        // Step 5: Send only the changed properties to the backend
        // eslint-disable-next-line no-restricted-syntax
        const result = await updateSongData(song.id, changedProperties as Partial<Song>);
        if (result.success) {
          onExitEditMode();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [song, selectedArtists, selectedTags, selectedUrls, updateSongData],
  );

  const handleCancel = () => {
    onExitEditMode();
    reset();
  };

  const handleCreateArtist = useCallback(
    async (inputValue: string) => {
      setIsCreatingArtist(true);
      try {
        const newArtist = await createArtist({ name: inputValue });
        const newOption: ArtistOption = {
          value: newArtist.id,
          label: newArtist.name,
        };
        setSelectedArtists([...selectedArtists, newOption]);
      } catch (error) {
        console.error("Failed to create artist:", error);
      } finally {
        setIsCreatingArtist(false);
      }
    },
    [selectedArtists, createArtist],
  );

  // Define attributes to display in view mode
  // Always includes Date Added, plus any other non-empty attributes
  const allAttributes = [
    {
      key: "createdAt",
      label: "Date Added",
      value: formatDate(song.createdAt),
    },
    {
      key: "releasedAt",
      label: "Released",
      value: song.releasedAt ? formatDate(song.releasedAt) : null,
    },
    {
      key: "urls",
      label: "External URLs",
      value: song.urls && song.urls.length > 0 ? song.urls.join(", ") : null,
    },
    ...(song.filePath
      ? [
          {
            key: "playbackEnabled",
            label: "Playback Enabled",
            value: song.playbackEnabled ? "Yes" : "No",
          },
        ]
      : []),
    {
      key: "description",
      label: "Description",
      value: song.description,
    },
    {
      key: "tags",
      label: "Tags",
      value: song.tags?.length ? song.tags.join(", ") : null,
    },
  ];

  if (mode === "edit") {
    const artistOptions: ArtistOption[] = artists.map((artist) => ({
      value: artist.id,
      label: artist.name,
    }));

    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4">
          <table className="min-w-full border-collapse text-sm">
            <tbody>
              {/* Title */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 w-40">Title</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    {...register("title")}
                    className={clsx(
                      "w-full px-3 py-2 rounded-lg border",
                      errors.title ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white",
                    )}
                  />
                  {errors.title && (
                    <div className="mt-1 text-xs text-rose-600">{errors.title.message}</div>
                  )}
                </td>
              </tr>

              {/* Artists */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 align-top">Artists</td>
                <td className="px-4 py-3">
                  {isLoading ? (
                    <p className="text-sm text-slate-500">Loading artists...</p>
                  ) : (
                    <CreatableSelect
                      isMulti
                      isClearable
                      isDisabled={isCreatingArtist}
                      isLoading={isCreatingArtist}
                      options={artistOptions}
                      value={selectedArtists}
                      onChange={(newValue) => {
                        setSelectedArtists(newValue ? Array.from(newValue) : []);
                      }}
                      onCreateOption={handleCreateArtist}
                      formatCreateLabel={(inputValue) => `Create artist "${inputValue}"`}
                      placeholder="Select or create artists..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor: base.borderColor,
                          boxShadow: state.isFocused ? "0 0 0 1px #0ea5e9" : "none",
                          borderRadius: "0.5rem",
                          minHeight: "2.5rem",
                        }),
                        multiValue: (base) => ({
                          ...base,
                          backgroundColor: "#dbeafe",
                          borderRadius: "0.375rem",
                        }),
                        multiValueLabel: (base) => ({
                          ...base,
                          color: "#1e40af",
                        }),
                      }}
                    />
                  )}
                </td>
              </tr>

              {/* Released */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600">Released</td>
                <td className="px-4 py-3">
                  <input
                    type="datetime-local"
                    {...register("releasedAt")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </td>
              </tr>

              {/* Playback Enabled - only show if file exists */}
              {song.filePath && (
                <tr className="border-b border-slate-300">
                  <td className="px-4 py-3 font-medium text-slate-600">Playback Enabled</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      {...register("playbackEnabled")}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                </tr>
              )}

              {/* Description */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 align-top">Description</td>
                <td className="px-4 py-3">
                  <textarea
                    {...register("description")}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </td>
              </tr>

              {/* External URLs */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 align-top">External URLs</td>
                <td className="px-4 py-3">
                  <CreatableSelect
                    isMulti
                    isClearable
                    options={[]}
                    value={selectedUrls}
                    onChange={(newValue) => {
                      setSelectedUrls(newValue ? Array.from(newValue) : []);
                    }}
                    onCreateOption={(inputValue) => {
                      const newUrl: UrlOption = {
                        value: inputValue,
                        label: inputValue,
                      };
                      setSelectedUrls([...selectedUrls, newUrl]);
                    }}
                    formatCreateLabel={(inputValue) => `Create URL "${inputValue}"`}
                    placeholder="Add URLs (e.g., https://spotify.com/...)"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: base.borderColor,
                        boxShadow: state.isFocused ? "0 0 0 1px #0ea5e9" : "none",
                        borderRadius: "0.5rem",
                        minHeight: "2.5rem",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#dbeafe",
                        borderRadius: "0.375rem",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "#1e40af",
                      }),
                    }}
                  />
                </td>
              </tr>

              {/* Tags */}
              <tr>
                <td className="px-4 py-3 font-medium text-slate-600 align-top">Tags</td>
                <td className="px-4 py-3">
                  <CreatableSelect
                    isMulti
                    isClearable
                    options={[]}
                    value={selectedTags}
                    onChange={(newValue) => {
                      setSelectedTags(newValue ? Array.from(newValue) : []);
                    }}
                    onCreateOption={(inputValue) => {
                      const newTag: TagOption = {
                        value: inputValue,
                        label: inputValue,
                      };
                      setSelectedTags([...selectedTags, newTag]);
                    }}
                    formatCreateLabel={(inputValue) => `Create tag "${inputValue}"`}
                    placeholder="Select or create tags..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: base.borderColor,
                        boxShadow: state.isFocused ? "0 0 0 1px #0ea5e9" : "none",
                        borderRadius: "0.5rem",
                        minHeight: "2.5rem",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#dbeafe",
                        borderRadius: "0.375rem",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "#1e40af",
                      }),
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600">
            {isSubmitting ? "Saving..." : "OK"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // View mode: filter out empty attributes (keep createdAt since it always has a value)
  const attributesToDisplay = allAttributes.filter(
    (attr) => attr.value !== null && attr.value !== "",
  );

  // View mode
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4">
      <table className="min-w-full text-sm">
        <tbody>
          {attributesToDisplay.map((attr) => {
            return (
              <tr key={attr.key} className="border-b border-slate-300 last:border-b-0">
                <td className="px-4 py-3 font-medium text-slate-600 w-40">{attr.label}</td>
                <td className="px-4 py-3 text-slate-900">
                  {attr.key === "url" && typeof attr.value === "string" ? (
                    <UrlListComponent urls={[attr.value]} />
                  ) : (
                    <div className="break-words">{attr.value}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Memoized content component that only re-renders when song ID or mode changes.
 * This prevents unnecessary re-renders while playback position updates occur.
 */
const MemoizedSongAttributesEditorContent = React.memo(
  SongAttributesEditorContent,
  (prevProps, nextProps) => {
    // Return true if props are equal (prevents re-render), false if they differ
    // Only compare song.id and mode to avoid re-renders from reference changes
    return prevProps.song.id === nextProps.song.id && prevProps.mode === nextProps.mode;
  },
);

interface UseSongAttributesEditorReturn {
  Component: React.FC;
  enterEditMode: () => void;
  mode: "view" | "edit";
}

/**
 * Hook that manages the edit mode state for SongAttributesEditor
 * Returns the component, a function to enter edit mode, and the current mode
 *
 * Usage:
 * ```
 * const { Component, enterEditMode, mode } = useSongAttributesEditor(song);
 * return (
 *   <>
 *     <button onClick={enterEditMode} disabled={mode === "edit"}>Edit</button>
 *     <Component />
 *   </>
 * );
 * ```
 */
export function useSongAttributesEditor(song: Song): UseSongAttributesEditorReturn {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const enterEditMode = useCallback(() => {
    setMode("edit");
  }, []);

  const exitEditMode = useCallback(() => {
    setMode("view");
  }, []);

  const Component = useMemo(
    () => () => (
      <MemoizedSongAttributesEditorContent song={song} mode={mode} onExitEditMode={exitEditMode} />
    ),
    [song.id, mode, exitEditMode],
  );

  return {
    Component,
    enterEditMode,
    mode,
  };
}

export function SongAttributesEditor({ song }: { song: Song }) {
  const { Component } = useSongAttributesEditor(song);
  return <Component />;
}
