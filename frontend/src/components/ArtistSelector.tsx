import { useCallback, useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useCreateArtist } from "../hooks/useCreateArtist";
import clsx from "clsx";

type ArtistOption = {
  value: string;
  label: string;
  isNew?: boolean;
};

interface ArtistSelectorProps {
  /** Called when selected artists change */
  onArtistsChange: (artistIds: string[]) => void;
  /** Whether the selector should be disabled */
  disabled?: boolean;
  /** Whether artists are required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Optional custom label */
  label?: string;
  /** Initial selected artist IDs (useful for edit forms) */
  initialArtistIds?: string[];
  /** Custom className for the container */
  className?: string;
}

export function ArtistSelector({
  onArtistsChange,
  disabled = false,
  required = false,
  placeholder = "Select or create artists...",
  label,
  initialArtistIds = [],
  className,
}: ArtistSelectorProps) {
  const artists = useArtistsStore((state) => state.artists);
  const artistsLoaded = useArtistsStore((state) => state.isLoaded);
  const { createArtist } = useCreateArtist();

  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);

  // Initialize selected artists if provided
  useEffect(() => {
    if (initialArtistIds.length > 0 && artists.length > 0) {
      const selected = initialArtistIds
        .map((id) => {
          const artist = artists.find((a) => a.id === id);
          return artist
            ? {
                value: artist.id,
                label: artist.name,
              }
            : null;
        })
        .filter((option): option is ArtistOption => option !== null);

      setSelectedArtists(selected);
      onArtistsChange(selected.map((a) => a.value));
    }
  }, []);

  // Notify parent when selected artists change
  useEffect(() => {
    onArtistsChange(selectedArtists.map((a) => a.value));
  }, [selectedArtists, onArtistsChange]);

  // Convert artists to options for CreatableSelect
  const artistOptions: ArtistOption[] = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

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

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {!artistsLoaded ? (
        <p className="mt-1 text-sm text-slate-500">Loading artists...</p>
      ) : (
        <div className="mt-1">
          <CreatableSelect
            isMulti
            isClearable
            isDisabled={isCreatingArtist || disabled}
            isLoading={isCreatingArtist}
            options={artistOptions}
            value={selectedArtists}
            onChange={(newValue) => {
              setSelectedArtists(newValue ? Array.from(newValue) : []);
            }}
            onCreateOption={handleCreateArtist}
            formatCreateLabel={(inputValue) => `Create artist "${inputValue}"`}
            placeholder={placeholder}
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base, state) => ({
                ...base,
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
      {selectedArtists.length > 0 && (
        <p className="mt-1 text-sm text-slate-600">
          {selectedArtists.length} artist(s) selected
        </p>
      )}
    </div>
  );
}
