import { useCallback, useEffect, useRef, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useCreateArtist } from "../hooks/useCreateArtist";
import { type ArtistId } from "types";

type ArtistOption = {
  value: ArtistId;
  label: string;
  isNew?: boolean;
};

interface ArtistSelectorProps {
  /** Called when selected artists change */
  onArtistsChange: (artistIds: ArtistId[]) => void;
  /** Whether the selector should be disabled */
  disabled?: boolean;
  /** Whether artists are required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Optional custom label */
  label?: string;
  /** Initial selected artist IDs (useful for edit forms) */
  initialArtistIds?: ArtistId[];
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

  // Initialize selected artists from props
  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>(() => {
    if (initialArtistIds.length === 0 || artists.length === 0) return [];

    return initialArtistIds
      .map((id) => {
        const artist = artists.find((a) => a.id === id);
        return artist ? { value: artist.id, label: artist.name } : null;
      })
      .filter((option): option is ArtistOption => option !== null);
  });

  const [isCreatingArtist, setIsCreatingArtist] = useState(false);

  // Keep a ref to current artists for use in the subscription callback
  const artistsRef = useRef(artists);
  useEffect(() => {
    artistsRef.current = artists;
  }, [artists]);

  // Notify parent when selected artists change
  useEffect(() => {
    onArtistsChange(selectedArtists.map((a) => a.value));
  }, [selectedArtists, onArtistsChange]);

  // Convert artists to options for CreatableSelect
  const artistOptions: ArtistOption[] = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  // Subscribe to artist creation events for the lifetime of the component
  useEffect(() => {
    const onArtistCreated = (artistId: ArtistId) => {
      const artist = artistsRef.current.find((a) => a.id === artistId);
      if (artist) {
        const newOption: ArtistOption = {
          value: artist.id,
          label: artist.name,
        };
        setSelectedArtists((prev) => [...prev, newOption]);
        setIsCreatingArtist(false);
      }
    };

    useArtistsStore.getState().subscribe({
      event: 'created',
      callback: onArtistCreated,
    });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      useArtistsStore.getState().unsubscribe({
        event: 'created',
        callback: onArtistCreated,
      });
    };
  }, []);

  // Handle artist creation
  const handleCreateArtist = useCallback(
    (inputValue: string) => {
      setIsCreatingArtist(true);
      createArtist({ name: inputValue }).catch((error) => {
        console.error("Failed to create artist:", error);
        setIsCreatingArtist(false);
      });
    },
    [createArtist],
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
