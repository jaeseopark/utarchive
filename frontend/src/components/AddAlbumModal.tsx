import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CreatableSelect from "react-select/creatable";
import { Button } from "./ui/Button";
import {
  AlbumCreateFormSchema,
  type AlbumCreateFormInput,
  type AlbumCreateInput,
} from "../api/schemas";
import { useAlbumCreation } from "../hooks/useAlbumCreation";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useCreateArtist } from "../hooks/useCreateArtist";
import { useAddAlbumModalStore } from "../stores/useAddAlbumModalStore";
import { toBrandId, type ArtistId, type SongId, type CoverArtId } from "../types/brands";
import { TrackListEditor } from "./TrackListEditor";
import { useSongSelectorModal } from "./SongSelector";
import { type NumberedTrack, hasSongId, isLiteralTrack } from "../types/album";
import clsx from "clsx";

type ArtistOption = {
  value: string;
  label: string;
  isNew?: boolean;
};

export function AddAlbumModal() {
  const { isOpen, closeModal } = useAddAlbumModalStore();
  const { createAlbum, isLoading, error: creationError } = useAlbumCreation();
  const artists = useArtistsStore((state) => state.artists);
  const artistsLoaded = useArtistsStore((state) => state.isLoaded);
  const { createArtist } = useCreateArtist();

  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [tracks, setTracks] = useState<NumberedTrack[]>([]);
  const [trackNumberForSongSelect, setTrackNumberForSongSelect] = useState<number | null>(null);

  const handleSongSelected = useCallback(
    (songId: string) => {
      if (trackNumberForSongSelect !== null) {
        setTracks((prevTracks) =>
          prevTracks.map((track) => {
            if (track.trackNumber === trackNumberForSongSelect) {
              return {
                trackNumber: track.trackNumber,
                songId: toBrandId<SongId>(songId),
              };
            }
            return track;
          }),
        );
      }
      setTrackNumberForSongSelect(null);
    },
    [trackNumberForSongSelect],
  );

  const songSelectorModal = useSongSelectorModal({
    onSongSelected: handleSongSelected,
    onClose: () => setTrackNumberForSongSelect(null),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<AlbumCreateFormInput>({
    resolver: zodResolver(AlbumCreateFormSchema),
    mode: "onBlur",
    defaultValues: {
      artistIds: [],
      trackList: [],
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedArtists([]);
      setTracks([]);
      setTrackNumberForSongSelect(null);
    }
  }, [isOpen, reset]);

  // Update form artistIds whenever selectedArtists changes
  useEffect(() => {
    const artistIds = selectedArtists.map((a) => a.value);
    setValue("artistIds", artistIds);
  }, [selectedArtists, setValue]);

  // Convert artists to options for CreatableSelect
  const artistOptions: ArtistOption[] = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  const validateTracks = useCallback((): boolean => {
    // Check that each track has either a title or a songId
    for (const track of tracks) {
      if (hasSongId(track)) {
        // Song references are valid if they have a songId
        continue;
      }

      if (isLiteralTrack(track)) {
        // Literal tracks must have a non-empty title
        if (!track.title?.trim()) {
          return false;
        }
        continue;
      }

      // Track is neither a song reference nor a literal track - invalid
      return false;
    }
    return true;
  }, [tracks]);

  const onSubmit = useCallback(
    async (formData: AlbumCreateFormInput) => {
      try {
        // Validate tracks before submission
        if (!validateTracks()) {
          throw new Error("All tracks must have either a title or be linked to a song");
        }

        // Convert form data to API input
        const yearReleasedNum = formData.yearReleased ? parseInt(formData.yearReleased, 10) : null;
        const apiData: AlbumCreateInput = {
          title: formData.title,
          artistIds: formData.artistIds.map((id) => toBrandId<ArtistId>(id)),
          yearReleased: yearReleasedNum,
          coverArtId: formData.coverArtId ? toBrandId<CoverArtId>(formData.coverArtId) : null,
          trackList: tracks.map((track) => ({
            number: track.trackNumber,
            // eslint-disable-next-line no-restricted-syntax
            title: "title" in track ? (track as { title: string }).title : "",
            // eslint-disable-next-line no-restricted-syntax
            duration: "duration" in track ? (track as { duration?: number }).duration : undefined,
          })),
          urls: formData.urls ? formData.urls.filter((url) => url && url.trim()) : undefined,
        };

        // Remove empty string values from optional fields before submission
        const cleanedData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(apiData)) {
          if (value !== "" && value !== undefined && value !== null) {
            cleanedData[key] = value;
          }
        }

        // eslint-disable-next-line no-restricted-syntax
        await createAlbum(cleanedData as AlbumCreateInput);
        reset();
        setSelectedArtists([]);
        setTracks([]);
        closeModal();
      } catch {
        // Error is handled by the hook and displayed
      }
    },
    [createAlbum, closeModal, reset, tracks, validateTracks],
  );

  const handleClear = useCallback(() => {
    reset();
    setSelectedArtists([]);
    setTracks([]);
  }, [reset]);

  const handleCancel = useCallback(() => {
    reset();
    setSelectedArtists([]);
    setTracks([]);
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

  const handleSelectExistingSong = useCallback(
    (trackNumber: number) => {
      setTrackNumberForSongSelect(trackNumber);
      songSelectorModal.open();
    },
    [songSelectorModal],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">Add Album</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                placeholder="Enter album title"
                disabled={isLoading}
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
            </div>

            {/* Artist Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Artists <span className="text-red-500">*</span>
              </label>
              {!artistsLoaded ? (
                <p className="mt-1 text-sm text-slate-500">Loading artists...</p>
              ) : (
                <div className="mt-1">
                  <CreatableSelect
                    isMulti
                    isClearable
                    isDisabled={isCreatingArtist || isLoading}
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
                  />
                  {errors.artistIds && (
                    <p className="mt-1 text-sm text-red-500">{errors.artistIds.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Year Released */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Year Released</label>
              <input
                type="number"
                {...register("yearReleased")}
                className={clsx(
                  "mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition",
                  errors.yearReleased
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400",
                )}
                placeholder="e.g., 2024"
                disabled={isLoading}
              />
              {errors.yearReleased && (
                <p className="mt-1 text-sm text-red-500">{errors.yearReleased.message}</p>
              )}
            </div>

            {/* Track List Editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Track List (optional)
              </label>
              <p className="mb-3 text-xs text-slate-600">
                Add tracks now or provide them after album creation
              </p>
              <TrackListEditor
                tracks={tracks}
                onTracksChange={setTracks}
                onSelectExistingSong={handleSelectExistingSong}
                loading={isLoading}
              />
            </div>

            {/* Error Message */}
            {creationError && (
              <div className="rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
                {creationError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
              <Button
                type="button"
                onClick={handleCancel}
                disabled={isLoading || isSubmitting}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleClear}
                disabled={isLoading || isSubmitting}
                variant="secondary"
              >
                Clear
              </Button>
              <Button type="submit" disabled={isLoading || isSubmitting}>
                {isLoading ? "Creating..." : "Create Album"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Song selection modal for linking tracks */}
      {songSelectorModal.Component}
    </>
  );
}
