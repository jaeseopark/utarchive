import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CreatableSelect from "react-select/creatable";
import { Button } from "./ui/Button";
import {
  SongCreateFormSchema,
  type SongCreateFormInput,
  type SongCreateInput,
} from "../api/schemas";
import { useSongCreation } from "../hooks/useSongCreation";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useCreateArtist } from "../hooks/useCreateArtist";
import { useAddSongModalStore } from "../stores/useAddSongModalStore";
import { toBrandId, type SongId, type ArtistId, type CoverArtId } from "../types/brands";
import clsx from "clsx";

type ArtistOption = {
  value: string;
  label: string;
  isNew?: boolean;
};

export function AddSongModal() {
  const { isOpen, closeModal } = useAddSongModalStore();
  const { createSong, isLoading, error: creationError } = useSongCreation();
  const artists = useArtistsStore((state) => state.artists);
  const artistsLoading = useArtistsStore((state) => state.isLoading);
  const { createArtist } = useCreateArtist();

  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<SongCreateFormInput>({
    resolver: zodResolver(SongCreateFormSchema),
    mode: "onBlur",
    defaultValues: {
      playbackEnabled: false,
      artistIds: [],
      tags: [],
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedArtists([]);
    }
  }, [isOpen, reset]);

  // Update form artistIds whenever selectedArtists changes
  useEffect(() => {
    const artistIds = selectedArtists.map((a) => a.value);
    setValue("artistIds", artistIds);
  }, [selectedArtists, setValue]);

  const tagInput = watch("tags") || [];

  // Convert artists to options for CreatableSelect
  const artistOptions: ArtistOption[] = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  const onSubmit = useCallback(
    async (formData: SongCreateFormInput) => {
      try {
        // Convert form strings to branded types
        const apiData: SongCreateInput = {
          ...formData,
          artistIds: formData.artistIds.map((id) => toBrandId<ArtistId>(id)),
          parentId: formData.parentId ? toBrandId<SongId>(formData.parentId) : null,
          coverArtId: formData.coverArtId ? toBrandId<CoverArtId>(formData.coverArtId) : null,
        };

        // Remove empty string values from optional fields before submission
        const cleanedData = Object.fromEntries(
          Object.entries(apiData).filter(
            ([, value]) => value !== "" && value !== undefined && value !== null,
          ),
        );

        // eslint-disable-next-line no-restricted-syntax
        await createSong(cleanedData as SongCreateInput);
        reset();
        setSelectedArtists([]);
        closeModal();
      } catch {
        // Error is handled by the hook and displayed
      }
    },
    [createSong, closeModal, reset],
  );

  const handleClear = useCallback(() => {
    reset();
    setSelectedArtists([]);
  }, [reset]);

  const handleCancel = useCallback(() => {
    reset();
    setSelectedArtists([]);
    closeModal();
  }, [closeModal, reset]);

  // Handle artist creation
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

  // Handle tag input
  const handleTagInput = useCallback(
    (value: string) => {
      // Split by comma and trim
      const tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      setValue("tags", tags);
    },
    [setValue],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">Add Song</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("title")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.title
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
              placeholder="Enter song title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Artist Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Artists <span className="text-red-500">*</span>
            </label>
            {artistsLoading ? (
              <p className="mt-1 text-sm text-slate-500">Loading artists...</p>
            ) : (
              <div className="mt-1">
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
                  className={clsx(
                    "react-select-container",
                    selectedArtists.length === 0 && errors.artistIds ? "has-error" : "",
                  )}
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor:
                        selectedArtists.length === 0 && errors.artistIds
                          ? "#ef4444"
                          : base.borderColor,
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
              </div>
            )}
            {selectedArtists.length === 0 && errors.artistIds && (
              <p className="mt-1 text-sm text-red-500">{errors.artistIds.message}</p>
            )}
            {selectedArtists.length > 0 && (
              <p className="mt-1 text-sm text-slate-600">
                {selectedArtists.length} artist(s) selected
              </p>
            )}
          </div>

          {/* Parent ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Parent Song ID (optional)
            </label>
            <input
              type="text"
              {...register("parentId")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.parentId
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
              placeholder="Enter parent song UUID"
            />
            {errors.parentId && (
              <p className="mt-1 text-sm text-red-500">{errors.parentId.message}</p>
            )}
          </div>

          {/* Platform ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Platform ID (optional)
            </label>
            <input
              type="text"
              {...register("platformId")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.platformId
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
              placeholder="e.g., spotify:track:xyz"
            />
            {errors.platformId && (
              <p className="mt-1 text-sm text-red-500">{errors.platformId.message}</p>
            )}
          </div>

          {/* Released At */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Release Date (optional)
            </label>
            <input
              type="datetime-local"
              {...register("releasedAt")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.releasedAt
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
            />
            {errors.releasedAt && (
              <p className="mt-1 text-sm text-red-500">{errors.releasedAt.message}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700">URL (optional)</label>
            <input
              type="text"
              {...register("url")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.url
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
              placeholder="https://example.com/song"
            />
            {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url.message}</p>}
          </div>

          {/* File Path - hidden, set programmatically */}

          {/* Cover Art ID - hidden, set programmatically */}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              {...register("description")}
              className={clsx(
                "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                errors.description
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
              )}
              placeholder="Enter song description"
              rows={3}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* PlaybackEnabled - hidden, defaults to false */}

          {/* Trim Range - hidden, set programmatically */}

          {/* File Hash - hidden, set programmatically */}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Tags (optional)</label>
            <input
              type="text"
              value={tagInput.join(", ")}
              onChange={(e) => handleTagInput(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              placeholder="e.g., tag1, tag2, tag3"
            />
            <p className="mt-1 text-xs text-slate-500">Separate tags with commas</p>
          </div>

          {/* Error Messages */}
          {creationError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{creationError}</div>
          )}

          {/* Modal Actions */}
          <div className="mt-6 flex gap-3 border-t border-slate-200 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Ok"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              disabled={isSubmitting || isLoading}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
