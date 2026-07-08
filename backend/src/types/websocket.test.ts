import { describe, it, expect } from "vitest";
import { verifyJwt, signJwt } from "../lib/jwt";
import { DataChangedMessage } from "../types/websocket";

describe("Backend WebSocket Types", () => {
  describe("JWT Authentication", () => {
    it("should sign and verify JWT correctly", () => {
      const payload = { sub: "user-123" };
      const _token = signJwt(payload, 3600);

      const verified = verifyJwt(_token);
      expect(verified.sub).toBe("user-123");
    });

    it("should reject invalid tokens", () => {
      expect(() => {
        verifyJwt("invalid-token");
      }).toThrow();
    });

    it("should reject malformed payloads", () => {
      expect(() => {
        // Test with wrong payload (intentionally using a fake token)
        verifyJwt("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake");
      }).toThrow();
    });
  });

  describe("WebSocket Message Types", () => {
    it("should create DataChangedMessage with created items", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          created: [
            {
              id: "song-123",
              title: "Test Song",
              artistIds: ["artist-1"],
            },
          ],
        },
        requestId: "req-456",
      };

      expect(message.type).toBe("DATA_CHANGED");
      expect(message.entity).toBe("song");
      expect(message.data).toBeDefined();
      expect(message.requestId).toBe("req-456");
      if (
        message.data &&
        typeof message.data === "object" &&
        "created" in message.data &&
        Array.isArray(message.data.created)
      ) {
        expect(message.data.created).toHaveLength(1);
      }
    });

    it("should create DataChangedMessage with updated items", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          updated: [
            {
              id: "song-123",
              title: "Updated Title",
            },
          ],
        },
        requestId: "req-789",
      };

      expect(message.type).toBe("DATA_CHANGED");
      if (
        message.data &&
        typeof message.data === "object" &&
        "updated" in message.data &&
        Array.isArray(message.data.updated)
      ) {
        expect(message.data.updated).toHaveLength(1);
        const updated = message.data.updated[0];
        if (updated && typeof updated === "object" && "id" in updated) {
          expect(updated.id).toBe("song-123");
        }
      }
    });

    it("should serialize and deserialize DataChangedMessage", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "album",
        timestamp: 1234567890,
        data: {
          created: [
            {
              id: "album-1",
              title: "Test Album",
            },
          ],
        },
      };

      const serialized = JSON.stringify(message);
      // eslint-disable-next-line no-restricted-syntax
      const deserialized = JSON.parse(serialized) as DataChangedMessage;

      expect(deserialized.type).toBe(message.type);
      expect(deserialized.entity).toBe(message.entity);
      expect(deserialized.timestamp).toBe(message.timestamp);
      expect(deserialized.data).toEqual(message.data);
    });
  });

  describe("Request ID handling", () => {
    it("should include requestId in DataChangedMessage", () => {
      const requestId = "req-123-abc";
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "artist",
        timestamp: Date.now(),
        data: {
          created: [{ id: "artist-1", name: "Test Artist" }],
        },
        requestId,
      };

      expect(message.requestId).toBe(requestId);
    });

    it("should handle DataChangedMessage without requestId", () => {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          updated: [{ id: "song-1", title: "Updated" }],
        },
      };

      expect(message.requestId).toBeUndefined();
    });
  });
});
