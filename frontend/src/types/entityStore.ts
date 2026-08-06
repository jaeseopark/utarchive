/**
 * Shared interface for WebSocket-driven entity store operations.
 * All entity stores (songs, albums, artists, playlists) implement this interface
 * to enable generic handling of CRUD operations via WebSocket messages.
 */

import type { Song } from "../api/schemas";
import type { Album } from "../api/schemas";
import type { Artist } from "../api/schemas";
import type { Playlist, PlaylistDetail } from "../stores/usePlaylistsStore";
import type { SongId, AlbumId, ArtistId, PlaylistId } from "./brands";

/**
 * Type for entity event listeners.
 * Called when an entity event occurs (created, updated, or deleted).
 * Receives the ID of the affected entity.
 */
export type EntityListener<K extends string & { readonly __brand: string }> = (id: K) => void;

/**
 * Type for entity event types that support listeners.
 */
export type EntityEventType = 'created' | 'updated' | 'deleted';

/**
 * Shared interface implemented by all entity store hooks.
 * Generic parameters:
 *   T = the entity type (Song, Album, Artist, Playlist)
 *   K = the branded ID type (SongId, AlbumId, ArtistId, PlaylistId)
 */
export interface EntityStore<T, K extends string & { readonly __brand: string }> {
  /**
   * Add a new entity to the store (from WebSocket).
   */
  add: (params: { item: T }) => void;

  /**
   * Update an existing entity in the store (from WebSocket).
   */
  update: (params: { id: K; updates: Partial<T> }) => void;

  /**
   * Remove an entity from the store (from WebSocket deletion).
   */
  remove: (params: { id: K }) => void;

  /**
   * Subscribe to entity events (created, updated, deleted).
   */
  subscribe: (options: { event: EntityEventType; callback: EntityListener<K> }) => void;

  /**
   * Unsubscribe from entity events.
   */
  unsubscribe: (options: { event: EntityEventType; callback: EntityListener<K> }) => void;

  /**
   * Get all registered listeners for a specific event type.
   * Used by WebSocket handlers to invoke listeners when entities are changed locally.
   */
  getListeners: (event: EntityEventType) => Set<EntityListener<K>>;
}

/**
 * Type-safe mapping of entity types to their corresponding data types.
 * Used to ensure type consistency in entity-to-store operations.
 */
export type EntityTypeMap = {
  song: Song;
  album: Album;
  artist: Artist;
  playlist: Playlist | PlaylistDetail;
  coverArt: never; // Not yet implemented
};

/**
 * Type-safe mapping of entity types to their corresponding branded ID types.
 */
export type EntityIdMap = {
  song: SongId;
  album: AlbumId;
  artist: ArtistId;
  playlist: PlaylistId;
  coverArt: never; // Not yet implemented
};
