import { ZodSchema } from "zod";
import { api, ApiError } from "./client";

export type StoreWithLoadingAndError = {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

/**
 * Wraps API calls with automatic store loading/error state management
 */
export const withStoreLoading = async <T>(
  store: StoreWithLoadingAndError,
  endpoint: string,
  schema: ZodSchema<T>,
  method: "get" | "post" | "put" | "delete" = "get",
  body?: unknown,
): Promise<T> => {
  store.setLoading(true);
  store.setError(null);

  try {
    let result: T;
    switch (method) {
      case "post":
        result = await api.post(endpoint, body, schema);
        break;
      case "put":
        result = await api.put(endpoint, body, schema);
        break;
      case "delete":
        result = await api.delete(endpoint, schema);
        break;
      case "get":
      default:
        result = await api.get(endpoint, schema);
    }
    return result;
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error occurred";
    store.setError(message);
    throw error;
  } finally {
    store.setLoading(false);
  }
};

/**
 * Variant for silent failures (doesn't throw, just sets error state)
 */
export const withStoreLoadingSilent = async <T>(
  store: StoreWithLoadingAndError,
  endpoint: string,
  schema: ZodSchema<T>,
  method: "get" | "post" | "put" | "delete" = "get",
  body?: unknown,
): Promise<T | null> => {
  store.setLoading(true);
  store.setError(null);

  try {
    let result: T;
    switch (method) {
      case "post":
        result = await api.post(endpoint, body, schema);
        break;
      case "put":
        result = await api.put(endpoint, body, schema);
        break;
      case "delete":
        result = await api.delete(endpoint, schema);
        break;
      case "get":
      default:
        result = await api.get(endpoint, schema);
    }
    return result;
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error occurred";
    store.setError(message);
    return null;
  } finally {
    store.setLoading(false);
  }
};
