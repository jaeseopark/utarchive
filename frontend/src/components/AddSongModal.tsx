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
import { useAddSongModalStore } from "../stores/useAddSongModalStore";
import { toBrandId, type SongId, type ArtistId, type CoverArtId } from "types";
import { ArtistSelector } from "./ArtistSelector";
import clsx from "clsx";

type UrlOption = {
  value: string;
  label: string;
};

type TagOption = {
  value: string;
  label: string;
};

export function AddSongModal() {
  const { isOpen, closeModal } = useAddSongModalStore();
  const { createSong, isLoading, error: creationError } = useSongCreation();

  const [selectedUrls, setSelectedUrls] = useState<UrlOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<SongCreateFormInput>({
    resolver: zodResolver(SongCreateFormSchema),
    mode: "onBlur",
    defaultValues: {
      playbackEnabled: false,
      artistIds: [],
      tags: [],
      urls: [],
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedUrls([]);
      setSelectedTags([]);
    }
  }, [isOpen, reset]);

  const handleArtistsChange = useCallback(
    (artistIds: string[]) => {
      setValue("artistIds", artistIds);
    },
    [setValue],
  );

  // Update form tags whenever selectedTags changes
  useEffect(() => {
    const tags = selectedTags.map((t) => t.value);
    setValue("tags", tags);
  }, [selectedTags, setValue]);

  const onSubmit = useCallback(
    async (formData: SongCreateFormInput) => {
      try {
        // Convert form strings to branded types
        const apiData: SongCreateInput = {
          ...formData,
          artistIds: (formData.artistIds ?? []).map((id) => toBrandId<ArtistId>(id)),
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
        closeModal();
      } catch {
        // Error is handled by the hook and displayed
      }
    },
    [createSong, closeModal, reset],
  );

  const handleClear = useCallback(() => {
    reset();
    setSelectedUrls([]);
    setSelectedTags([]);
  }, [reset]);

  const handleCancel = useCallback(() => {
    reset();
    setSelectedUrls([]);
    setSelectedTags([]);
    closeModal();
  }, [closeModal, reset]);

  // Update form urls whenever selectedUrls changes
  useEffect(() => {
    const urls = selectedUrls.map((u) => u.value);
    setValue("urls", urls);
  }, [selectedUrls, setValue]);

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
          <ArtistSelector
            onArtistsChange={handleArtistsChange}
            disabled={isLoading}
            label="Artists"
            placeholder="Select or create artists..."
          />

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

          {/* External URLs */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              External URLs (optional)
            </label>
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
              formatCreateLabel={(inputValue) => `Add URL "${inputValue}"`}
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

          {/* File Hash - hidden, set programmatically */}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Tags (optional)</label>
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
