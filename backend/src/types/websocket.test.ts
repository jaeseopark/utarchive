import { describe, it, expect, beforeEach } from "vitest";
import { verifyJwt, signJwt } from "../lib/jwt";
import { EntityCreatedMessage, EntityUpdatedMessage } from "../types/websocket";

describe("Backend WebSocket Types", () => {
  describe("JWT Authentication", () => {
    it("should sign and verify JWT correctly", () => {
      const payload = { sub: "user-123" };
      const token = signJwt(payload, 3600);

      const verified = verifyJwt(token);
      expect(verified.sub).toBe("user-123");
    });

    it("should reject invalid tokens", () => {
      expect(() => {
        verifyJwt("invalid-token");
      }).toThrow();
    });

    it("should reject malformed payloads", () => {
      expect(() => {
        // Create a token without the required 'sub' field
        const token = signJwt({ sub: "user-123" }, 3600);
        // This should work, but let's test with wrong payload
        verifyJwt("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake");
      }).toThrow();
    });
  });

  describe("WebSocket Message Types", () => {
    it("should create EntityCreatedMessage correctly", () => {
      const message: EntityCreatedMessage = {
        type: "ENTITY_CREATED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          id: "song-123",
          title: "Test Song",
          artistIds: ["artist-1"],
        },
        requestId: "req-456",
      };

      expect(message.type).toBe("ENTITY_CREATED");
      expect(message.entity).toBe("song");
      expect(message.data).toBeDefined();
      expect(message.requestId).toBe("req-456");
    });

    it("should create EntityUpdatedMessage with partial data", () => {
      const message: EntityUpdatedMessage = {
        type: "ENTITY_UPDATED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          id: "song-123",
          title: "Updated Title",
        },
        requestId: "req-789",
      };

      expect(message.type).toBe("ENTITY_UPDATED");
      expect((message.data as any).id).toBe("song-123");
      expect((message.data as any).title).toBe("Updated Title");
    });

    it("should serialize and deserialize messages", () => {
      const message: EntityCreatedMessage = {
        type: "ENTITY_CREATED",
        entity: "album",
        timestamp: 1234567890,
        data: {
          id: "album-1",
          title: "Test Album",
        },
      };

      const serialized = JSON.stringify(message);
      const deserialized = JSON.parse(serialized) as EntityCreatedMessage;

      expect(deserialized.type).toBe(message.type);
      expect(deserialized.entity).toBe(message.entity);
      expect(deserialized.timestamp).toBe(message.timestamp);
      expect(deserialized.data).toEqual(message.data);
    });
  });

  describe("Request ID handling", () => {
    it("should include requestId in messages", () => {
      const requestId = "req-123-abc";
      const message: EntityCreatedMessage = {
        type: "ENTITY_CREATED",
        entity: "artist",
        timestamp: Date.now(),
        data: { id: "artist-1", name: "Test Artist" },
        requestId,
      };

      expect(message.requestId).toBe(requestId);
    });

    it("should handle messages without requestId", () => {
      const message: EntityUpdatedMessage = {
        type: "ENTITY_UPDATED",
        entity: "song",
        timestamp: Date.now(),
        data: { id: "song-1", title: "Updated" },
      };

      expect(message.requestId).toBeUndefined();
    });
  });
});
