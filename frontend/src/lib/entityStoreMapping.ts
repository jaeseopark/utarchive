/**
 * Entity-to-Store Mapping for WebSocket Handlers
 * Provides type-safe access to entity stores based on entity type.
 */

import { useSongsStore } from "../stores/useSongsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import type { EntityStore } from "../types/entityStore";
import type { EntityType } from "../types/websocket";

/**
 * Type-safe mapping of entity types to their store accessors.
 * Each store implements the EntityStore<T, K> interface for generic CRUD operations.
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
const ENTITY_STORES: Record<
  EntityType,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getStore: () => EntityStore<any, any>;
  }
> = {
  song: {
    // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-explicit-any
    getStore: useSongsStore.getState as any,
  },
  album: {
    // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-explicit-any
    getStore: useAlbumsStore.getState as any,
  },
  artist: {
    // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-explicit-any
    getStore: useArtistsStore.getState as any,
  },
  playlist: {
    // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-explicit-any
    getStore: usePlaylistsStore.getState as any,
  },
  coverArt: {
    getStore: () => {
      throw new Error("CoverArt entity store not implemented");
    },
  },
};

/**
 * Get the store for a given entity type.
 * Throws an error if the entity type is not recognized or not implemented.
 *
 * @param entity The entity type (from WebSocket message)
 * @returns The store implementation for this entity type
 * @throws Error if entity is not recognized or not implemented
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStoreForEntity(entity: EntityType): EntityStore<any, any> {
  if (!(entity in ENTITY_STORES)) {
    throw new Error(`Unknown entity type: ${entity}`);
  }

  const store = ENTITY_STORES[entity];
  if (!store) {
    throw new Error(`Entity store not found: ${entity}`);
  }

  return store.getStore();
}

/**
 * Type guard to check if an entity type is supported.
 */
export function isSupportedEntityType(entity: unknown): entity is EntityType {
  return typeof entity === "string" && entity in ENTITY_STORES;
}
