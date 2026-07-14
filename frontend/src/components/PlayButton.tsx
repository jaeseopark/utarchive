import { Button } from "./ui/Button";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { Song } from "../api/schemas";

interface PlayButtonProps {
  song: Song;
}

/**
 * Isolated PlayButton component that uses the player store.
 * By keeping player store subscriptions separate, we prevent
 * the parent SongHeader from re-rendering on every playback update.
 */
export function PlayButton({ song }: PlayButtonProps) {
  const { play } = usePlayerStore();

  const handlePlay = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
    play(song as any);
  };

  return (
    <Button variant="secondary" onClick={handlePlay}>
      Play
    </Button>
  );
}
