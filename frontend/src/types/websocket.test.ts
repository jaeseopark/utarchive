import { describe, it, expect } from "vitest";
import { DataChangedMessage } from "../types/websocket";

describe("WebSocket Message Types", () => {
  describe("DataChangedMessage", () => {
    it("should handle created entities", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          created: [
            {
              id: "song-123",
              title: "Test Song",
            },
          ],
        },
        requestId: "req-123",
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.type).toBe("DATA_CHANGED");
      expect(deserialized.entity).toBe("song");
      expect(deserialized.data.created).toHaveLength(1);
      expect(deserialized.requestId).toBe("req-123");
    });

    it("should handle updated entities", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "album",
        timestamp: Date.now(),
        data: {
          updated: [
            {
              id: "album-456",
              title: "Updated Album",
            },
          ],
        },
        requestId: "req-456",
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.type).toBe("DATA_CHANGED");
      expect(deserialized.data.updated).toHaveLength(1);
      if (deserialized.data.updated && deserialized.data.updated[0]) {
        // eslint-disable-next-line no-restricted-syntax
        const updated = deserialized.data.updated[0] as Record<string, unknown>;
        expect(updated.id).toBe("album-456");
      }
    });

    it("should handle deleted entities", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "artist",
        timestamp: Date.now(),
        data: {
          deleted: [{ id: "artist-789" }],
        },
        requestId: "req-789",
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.type).toBe("DATA_CHANGED");
      expect(deserialized.data.deleted).toHaveLength(1);
      if (deserialized.data.deleted && deserialized.data.deleted[0]) {
        expect(deserialized.data.deleted[0].id).toBe("artist-789");
      }
    });

    it("should handle combined created, updated, and deleted", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          created: [{ id: "new-1", title: "New Song" }],
          updated: [{ id: "existing-1", title: "Updated Song" }],
          deleted: [{ id: "old-1" }],
        },
        requestId: "req-bulk",
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.type).toBe("DATA_CHANGED");
      expect(deserialized.data.created).toHaveLength(1);
      expect(deserialized.data.updated).toHaveLength(1);
      expect(deserialized.data.deleted).toHaveLength(1);
    });

    it("should handle partial data changes", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "album",
        timestamp: Date.now(),
        data: {
          created: [{ id: "new-album", title: "New Album" }],
        },
        requestId: "req-partial",
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.data.created).toHaveLength(1);
      expect(deserialized.data.updated).toBeUndefined();
      expect(deserialized.data.deleted).toBeUndefined();
    });

    it("should handle all entity types", () => {
      // eslint-disable-next-line no-restricted-syntax
      const entities = ["song", "album", "artist", "playlist", "coverArt"] as const;

      entities.forEach((entity) => {
        const message: DataChangedMessage = {
          type: "DATA_CHANGED",
          entity,
          timestamp: Date.now(),
          data: {
            created: [{ id: "test-" + entity }],
          },
        };

        const serialized = JSON.stringify(message);
        // eslint-disable-next-line no-restricted-syntax
        const deserialized = JSON.parse(serialized) as DataChangedMessage;
        expect(deserialized.entity).toBe(entity);
      });
    });

    it("should include timestamp", () => {
      const now = Date.now();
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: now,
        data: {
          created: [{ id: "test" }],
        },
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;
      expect(deserialized.timestamp).toBe(now);
    });
  });
});
