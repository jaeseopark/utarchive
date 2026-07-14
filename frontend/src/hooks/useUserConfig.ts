import { useEffect } from "react";
import { useUserConfigStore, setUserConfigUpdateCallback } from "../stores/useUserConfigStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useWebSocketContext } from "../context/WebSocketContext";
import { useSession } from "../context/SessionContext";

/**
 * Hook to fetch and manage user configuration
 * Automatically fetches config on first mount
 */
export function useUserConfig() {
  const { config, isLoading, error, fetchConfig, updateConfig, setPlaybackConfig } =
    useUserConfigStore();

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    isLoading,
    error,
    updateConfig,
    setPlaybackConfig,
    playback: config.playback,
  };
}

/**
 * Hook to manage playback configuration
 * Provides convenient access to shuffle and repeat settings
 */
export function usePlaybackConfig() {
  const { getPlaybackShuffle, getPlaybackRepeat, setPlaybackShuffle, setPlaybackRepeat } =
    useUserConfigStore();

  return {
    shuffle: getPlaybackShuffle(),
    repeat: getPlaybackRepeat(),
    setShuffle: setPlaybackShuffle,
    setRepeat: setPlaybackRepeat,
  };
}

/**
 * Hook to initialize player with user config settings
 * Should be used in a root component (e.g., App.tsx)
 *
 * This hook:
 * 1. Loads user config on mount (only if authenticated)
 * 2. Initializes player with stored settings (or defaults)
 * 3. Syncs config changes to player via websocket
 * 4. Broadcasts config updates to other tabs via websocket
 */
export function useInitializePlayerWithConfig() {
  const { user } = useSession();
  const { config: userConfig, fetchConfig } = useUserConfigStore();
  const { updateLocalSettings } = usePlayerStore();
  const { send } = useWebSocketContext();

  // Initialize player settings from user config on mount (only when authenticated)
  useEffect(() => {
    // Only fetch config if user is authenticated
    if (!user) {
      // Initialize player with defaults if not authenticated
      updateLocalSettings(false, "off");
      return;
    }

    fetchConfig().catch((err) => {
      console.warn("Failed to fetch user config, using defaults:", err);
      // Initialize player with defaults even if fetch fails
      updateLocalSettings(false, "off");
    });
  }, [user, fetchConfig, updateLocalSettings]);

  // Sync player settings with user config on config change
  useEffect(() => {
    const shuffle = userConfig.playback?.shuffle ?? false;
    const repeat = userConfig.playback?.repeat ?? "off";
    updateLocalSettings(shuffle, repeat);
  }, [userConfig.playback, updateLocalSettings]);

  // Set up callback for config updates to emit websocket messages
  useEffect(() => {
    const handleConfigUpdate = (updatedConfig: Record<string, unknown>) => {
      send({
        type: "USER_CONFIG_CHANGED",
        timestamp: Date.now(),
        data: {
          config: updatedConfig,
        },
      });
    };

    setUserConfigUpdateCallback(handleConfigUpdate);

    return () => {
      setUserConfigUpdateCallback(() => {});
    };
  }, [send]);
}
