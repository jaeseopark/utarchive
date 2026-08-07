import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import clsx from "clsx";

interface HeaderSearchBarProps {
  className?: string;
}

/**
 * Header search bar positioned at the far right of the application header
 * Inspired by Apple Music on macOS with:
 * - Magnifying glass icon on the inner-left
 * - Clear button (X) on the inner-right when text is entered
 * - Keyboard activation with ⌘+F
 * - Enter to execute search
 */
export function HeaderSearchBar({ className }: HeaderSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Handle Command+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update search input when route changes
  useEffect(() => {
    if (location.pathname === "/search") {
      const q = searchParams.get("q") ?? "";
      setQuery(q);
    } else {
      setQuery("");
    }
  }, [location.pathname, searchParams]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      // Keep the query in the input while on search page
    }
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx("flex items-center", className)}
    >
      <div
        className={clsx(
          "relative flex items-center gap-2 rounded-full border transition-all",
          isFocused
            ? "border-sky-400 bg-white shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20"
            : "border-slate-300 bg-white hover:border-slate-400",
        )}
      >
        {/* Magnifying glass icon */}
        <div className="pointer-events-none flex items-center pl-3">
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search (⌘+F)"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          aria-label="Search songs, artists, albums"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center pr-3 text-slate-400 transition hover:text-slate-600"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
