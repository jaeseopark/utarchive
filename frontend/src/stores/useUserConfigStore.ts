import { create } from "zustand";
import { api, ApiError } from "../api/client";
import { type UserConfig, UserConfigResponseSchema } from "../api/schemas";

type NotifyConfigUpdateCallback = (config: UserConfig) => void;

export interface UserConfigStore {
  config: UserConfig;
  isLoading: boolean;
  error: string | null;
  notifyConfigUpdate?: NotifyConfigUpdateCallback;

  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<UserConfig>, fromWebSocket?: boolean) => Promise<void>;
  applyConfigLocally: (config: UserConfig) => void;

  // Convenience methods for playback config
  setPlaybackConfig: (config: Partial<UserConfig["playback"]>) => Promise<void>;
  getPlaybackShuffle: () => boolean;
  getPlaybackRepeat: () => "off" | "one" | "all";
  setPlaybackShuffle: (shuffle: boolean) => Promise<void>;
  setPlaybackRepeat: (repeat: "off" | "one" | "all") => Promise<void>;
}

export const useUserConfigStore = create<UserConfigStore>((set, get) => ({
  config: {},
  isLoading: false,
  error: null,
  notifyConfigUpdate: undefined,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/api/user/config", UserConfigResponseSchema);
      set({ config: response.config, isLoading: false });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to fetch user config";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateConfig: async (updates: Partial<UserConfig>, fromWebSocket = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(
        "/api/user/config",
        { config: updates },
        UserConfigResponseSchema,
      );
      set({ config: response.config, isLoading: false });

      // Only emit websocket if this update came from a local action (not from websocket)
      if (!fromWebSocket) {
        const state = get();
        if (state.notifyConfigUpdate) {
          state.notifyConfigUpdate(response.config);
        }
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to update user config";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  applyConfigLocally: (config: UserConfig) => {
    set({ config });
  },

  setPlaybackConfig: async (updates: Partial<UserConfig["playback"]>) => {
    const state = get();
    const newConfig = {
      ...state.config,
      playback: {
        ...(state.config.playback ?? {}),
        ...updates,
      },
    };
    await get().updateConfig(newConfig, false);
  },

  getPlaybackShuffle: () => {
    return get().config.playback?.shuffle ?? false;
  },

  getPlaybackRepeat: () => {
    return get().config.playback?.repeat ?? "off";
  },

  setPlaybackShuffle: async (shuffle: boolean) => {
    await get().setPlaybackConfig({ shuffle });
  },

  setPlaybackRepeat: async (repeat: "off" | "one" | "all") => {
    await get().setPlaybackConfig({ repeat });
  },
}));

/**
 * Set the callback function to notify about config updates
 * Should be called during app initialization
 */
export const setUserConfigUpdateCallback = (callback: (config: UserConfig) => void) => {
  useUserConfigStore.setState({ notifyConfigUpdate: callback });
};
