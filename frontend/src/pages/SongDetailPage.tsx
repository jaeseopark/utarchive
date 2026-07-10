import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SongSchema } from "../api/schemas";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import CoverArtDisplay from "../components/CoverArtDisplay";
import FamilyTree from "../components/FamilyTree";
import { useSongAttributesEditor } from "../components/SongAttributesEditor";
import { parseTrimRange } from "../lib/format";
import { useArtistsStore } from "../stores/useArtistsStore";
import { getArtistNames } from "../lib/artistNames";
import { useSongDetail } from "../hooks/useSongDetail";
import { useRecordListening } from "../hooks/useRecordListening";
import { toBrandId, type SongId } from "../types/brands";
import type { Song } from "../api/schemas";

const PAUSE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SongHeaderProps {
  song: Song;
}

function SongHeader({ song }: SongHeaderProps) {
  // Hook call is now unconditional within this component
  const songEditorState = useSongAttributesEditor(song);
  const artists = useArtistsStore((state) => state.artists);

  const artistList = useMemo(() => {
    const artistNames = getArtistNames(song.artistIds ?? [], artists);
    return artistNames.map((name, index) => ({
      id: song.artistIds?.[index] ?? "",
      name,
    }));
  }, [song, artists]);

  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-shrink-0">
            <CoverArtDisplay
              owner={{ songId: song.id }}
              size={128}
              className="h-32 w-32 rounded-2xl border border-slate-300 bg-slate-50/80 object-cover shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{song.title}</h1>
            <div className="mt-3 text-sm text-slate-600">
              {artistList.length > 0 ? (
                <span>
                  Artists:{" "}
                  {artistList.map((artist, index) => (
                    <span key={artist.id}>
                      <Link to={`/artists/${artist.id}`} className="text-sky-500 hover:underline">
                        {artist.name}
                      </Link>
                      {index < artistList.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              ) : (
                "Artists: Unknown"
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {song.filePath && (
            <Button variant="secondary" disabled>
              Play
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={songEditorState.enterEditMode}
            disabled={songEditorState.mode === "edit"}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Song Attributes Editor - replaces metadata cards */}
      <div className="mt-6">
        <songEditorState.Component />
      </div>
    </div>
  );
}

function SongDetailPage() {
  const { id } = useParams<"id">();
  const { song: songData, isLoading, error } = useSongDetail(toBrandId<SongId>(id || ""));
  const { recordListening } = useRecordListening();
  const [isListening, setIsListening] = useState(false);
  const [listenedSeconds, setListenedSeconds] = useState(0);
  const [analyticsMessage, setAnalyticsMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use song data from hook
  const song = songData;

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const interval = window.setInterval(() => {
      setListenedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isListening]);

  const getEffectiveDuration = (songData: z.infer<typeof SongSchema> | null): number => {
    if (!songData) return 1;
    const baseDuration = songData.duration ?? 1;
    // Account for trimmed song durations
    const { start, end } = parseTrimRange(songData.trimRange);
    if (start != null && end != null) {
      return Math.max(1, end - start);
    }
    return baseDuration;
  };

  const clearListeningState = () => {
    setStartedAt(null);
    setListenedSeconds(0);
    setIsListening(false);
    setPausedAt(null);
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  };

  const sendAnalytics = async (stopReason: "pause" | "ended") => {
    if (!song || !startedAt) {
      return;
    }

    const durationSeconds = listenedSeconds;
    const trackDuration = getEffectiveDuration(song);
    const playbackPercent = Math.min(100, (durationSeconds / trackDuration) * 100);

    const result = await recordListening({
      songId: song.id,
      startedAt: startedAt.toISOString(),
      durationSeconds,
      playbackPercent,
      userAgent: navigator.userAgent,
    });

    if (result.success) {
      setAnalyticsMessage(
        `Recorded listening session (${stopReason}) — ${durationSeconds}s, ${Math.round(playbackPercent)}%`,
      );
    } else {
      setAnalyticsMessage("Failed to record listening analytics.");
    }
  };

  const handlePlay = async () => {
    if (!song) {
      return;
    }

    // Check if there's an existing paused session that's too old (24+ hours)
    if (pausedAt && Date.now() - pausedAt.getTime() >= PAUSE_TIMEOUT_MS) {
      clearListeningState();
      setAnalyticsMessage("Listening session expired. Please start a new session.");
      return;
    }

    // Clear any existing timeout when resuming
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }

    if (audioRef.current) {
      await audioRef.current.play().catch(() => {
        setAnalyticsMessage("Unable to start audio playback.");
      });
    }

    setStartedAt(new Date());
    setAnalyticsMessage("Listening started...");
    setIsListening(true);
    setPausedAt(null);
  };

  const handlePause = () => {
    if (!isListening || audioRef.current?.ended) {
      return;
    }

    setPausedAt(new Date());
    // Set timeout to clear state after 24 hours of inactivity
    pauseTimeoutRef.current = setTimeout(() => {
      clearListeningState();
      setAnalyticsMessage("Listening session expired after 24 hours of inactivity.");
    }, PAUSE_TIMEOUT_MS);

    void sendAnalytics("pause");
  };

  const handleEnded = () => {
    if (!isListening) {
      return;
    }

    void sendAnalytics("ended");
    clearListeningState();
  };

  // Handle browser tab closing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isListening && startedAt && song) {
        const durationSeconds = listenedSeconds;
        const trackDuration = getEffectiveDuration(song);
        const playbackPercent = Math.min(100, (durationSeconds / trackDuration) * 100);

        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({
          songId: song.id,
          startedAt: startedAt.toISOString(),
          durationSeconds,
          playbackPercent,
          userAgent: navigator.userAgent,
        });
        navigator.sendBeacon("/api/analytics/listen", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Clean up any pending timeout on unmount
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [isListening, startedAt, listenedSeconds, song]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Song detail</h2>
        <p className="mt-2 text-slate-600">View metadata and the family tree for this song.</p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-8 text-center text-slate-600">
          Loading song…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400 bg-rose-100/30 p-6 text-rose-700">
          Error loading song: {error}
        </div>
      ) : song ? (
        <div className="space-y-6">
          <SongHeader song={song} />

          {song.filePath ? (
            <div className="mt-6 rounded-3xl border border-slate-300 bg-slate-100/80 p-4 text-slate-900">
              <div className="mb-3 text-slate-600">Playback analytics</div>
              <audio
                ref={audioRef}
                controls
                src={song.filePath}
                className="w-full rounded-3xl bg-white"
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
              />
              <div className="mt-3 text-sm text-slate-600">
                {isListening
                  ? `Listening for ${listenedSeconds}s`
                  : (analyticsMessage ?? "Start playback to capture analytics.")}
              </div>
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
            <h3 className="text-xl font-semibold text-slate-900">Family tree</h3>
            {song.masterId ? (
              <div className="mt-4">
                <FamilyTree masterId={song.masterId} currentSongId={song.id} />
              </div>
            ) : (
              <p className="mt-4 text-slate-600">No family tree available.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default SongDetailPage;
