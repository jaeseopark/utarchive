import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CreatableSelect from "react-select/creatable";
import { Button } from "./ui/Button";
import { type Artist } from "../api/schemas";
import { useArtistUpdate } from "../hooks/useArtistUpdate";
import { formatDate } from "../lib/format";
import { getChangedProperties } from "../lib/compareObjects";
import { z } from "zod";
import clsx from "clsx";

// Define the update schema - only editable fields
const ArtistUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  description: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional(),
  urls: z.array(z.string()).optional(),
});

type ArtistUpdateInput = z.infer<typeof ArtistUpdateSchema>;

/**
 * Helper function to convert an Artist to form values
 * Used for both defaultValues and reset operations
 */
function getFormValuesFromArtist(artist: Artist): ArtistUpdateInput {
  return {
    name: artist.name,
    description: artist.description ?? "",
    aliases: artist.aliases ?? [],
    urls: artist.urls ?? [],
  };
}

type AliasOption = {
  value: string;
  label: string;
};

type UrlOption = {
  value: string;
  label: string;
};

function isUrlArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

interface ArtistAttributesEditorProps {
  artist: Artist;
  mode: "view" | "edit";
  onExitEditMode: () => void;
}

function ArtistAttributesEditorContent({
  artist,
  mode,
  onExitEditMode,
}: ArtistAttributesEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAliases, setSelectedAliases] = useState<AliasOption[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<UrlOption[]>([]);
  const { updateArtistData } = useArtistUpdate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArtistUpdateInput>({
    resolver: zodResolver(ArtistUpdateSchema),
    mode: "onBlur",
    defaultValues: getFormValuesFromArtist(artist),
  });

  // Sync form and component state with artist data
  useEffect(() => {
    reset(getFormValuesFromArtist(artist));

    // Sync selectedAliases with artist.aliases
    const aliases = artist.aliases ?? [];
    const selectedAliasesList = aliases.map((alias) => ({ value: alias, label: alias }));
    setSelectedAliases(selectedAliasesList);

    // Sync selectedUrls with artist.urls
    const urls = artist.urls ?? [];
    const selectedUrlsList = urls.map((url) => ({ value: url, label: url }));
    setSelectedUrls(selectedUrlsList);
  }, [artist, reset]);

  const onSubmit = useCallback(
    async (data: ArtistUpdateInput) => {
      setIsSubmitting(true);
      try {
        // Step 1: Normalize the form data (convert empty strings to null)
        const cleanedFormData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          cleanedFormData[key] = value === "" ? null : value;
        });

        // Override with current selections from component state
        cleanedFormData.aliases = selectedAliases.map((a) => a.value);
        cleanedFormData.urls = selectedUrls.map((u) => u.value);

        // Step 2: Create a normalized version of the original artist for comparison
        const originalArtistNormalized: Record<string, unknown> = {
          name: artist.name,
          description: artist.description ?? null,
          aliases: artist.aliases ?? [],
          urls: artist.urls ?? [],
        };

        // Step 3: Get only the properties that have changed
        const changedProperties = getChangedProperties(originalArtistNormalized, cleanedFormData);

        // Step 4: If nothing changed, just close edit mode
        if (Object.keys(changedProperties).length === 0) {
          onExitEditMode();
          return;
        }

        // Step 5: Send only the changed properties to the backend
        // eslint-disable-next-line no-restricted-syntax
        const result = await updateArtistData(artist.id, changedProperties as Partial<Artist>);
        if (result.success) {
          onExitEditMode();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [artist, selectedAliases, selectedUrls, updateArtistData],
  );

  const handleCancel = () => {
    onExitEditMode();
    reset();
  };

  // Define attributes to display in view mode
  const allAttributes = [
    { key: "createdAt", label: "Date Added", value: formatDate(artist.createdAt) },
    { key: "name", label: "Name", value: artist.name },
    {
      key: "description",
      label: "Description",
      value: artist.description,
    },
    {
      key: "aliases",
      label: "Aliases",
      value: artist.aliases?.length ? artist.aliases.join(", ") : null,
    },
    {
      key: "urls",
      label: "URLs",
      value: artist.urls && artist.urls.length > 0 ? artist.urls : null,
    },
  ];

  if (mode === "edit") {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="overflow-x-auto rounded-3xl border border-slate-300 bg-slate-50/80 p-4">
          <table className="min-w-full border-collapse text-sm">
            <tbody>
              {/* Name */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 w-40">Name</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    {...register("name")}
                    className={clsx(
                      "w-full px-3 py-2 rounded-lg border",
                      errors.name ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white",
                    )}
                  />
                  {errors.name && (
                    <div className="mt-1 text-xs text-rose-600">{errors.name.message}</div>
                  )}
                </td>
              </tr>

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

              {/* Aliases */}
              <tr className="border-b border-slate-300">
                <td className="px-4 py-3 font-medium text-slate-600 align-top">Aliases</td>
                <td className="px-4 py-3">
                  <CreatableSelect
                    isMulti
                    isClearable
                    options={[]}
                    value={selectedAliases}
                    onChange={(newValue) => {
                      setSelectedAliases(newValue ? Array.from(newValue) : []);
                    }}
                    onCreateOption={(inputValue) => {
                      const newAlias: AliasOption = {
                        value: inputValue,
                        label: inputValue,
                      };
                      setSelectedAliases([...selectedAliases, newAlias]);
                    }}
                    formatCreateLabel={(inputValue) => `Create alias "${inputValue}"`}
                    placeholder="Select or create aliases..."
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

              {/* URLs */}
              <tr>
                <td className="px-4 py-3 font-medium text-slate-600 align-top">URLs</td>
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
                    placeholder="Add URL (e.g., https://spotify.com/...)"
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
                  {attr.key === "urls" && isUrlArray(attr.value) ? (
                    <div className="space-y-2">
                      {attr.value.map((url) => (
                        <div key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sky-500 hover:underline break-all"
                          >
                            {url}
                          </a>
                        </div>
                      ))}
                    </div>
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

interface UseArtistAttributesEditorReturn {
  Component: React.FC;
  enterEditMode: () => void;
  mode: "view" | "edit";
}

/**
 * Hook that manages the edit mode state for ArtistAttributesEditor
 * Returns the component, a function to enter edit mode, and the current mode
 *
 * Usage:
 * ```
 * const { Component, enterEditMode, mode } = useArtistAttributesEditor(artist);
 * return (
 *   <>
 *     <button onClick={enterEditMode} disabled={mode === "edit"}>Edit</button>
 *     <Component />
 *   </>
 * );
 * ```
 */
export function useArtistAttributesEditor(artist: Artist): UseArtistAttributesEditorReturn {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const enterEditMode = useCallback(() => {
    setMode("edit");
  }, []);

  const exitEditMode = useCallback(() => {
    setMode("view");
  }, []);

  const Component = React.memo(() => (
    <ArtistAttributesEditorContent artist={artist} mode={mode} onExitEditMode={exitEditMode} />
  ));

  return {
    Component,
    enterEditMode,
    mode,
  };
}

export function ArtistAttributesEditor({ artist }: { artist: Artist }) {
  const { Component } = useArtistAttributesEditor(artist);
  return <Component />;
}
