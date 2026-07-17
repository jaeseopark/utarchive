import { describe, it, expect } from "vitest";
import { z } from "zod";

// Recreate the schemas to test them in isolation
const isoDateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ offset: false }))
  .optional();

const songCreateSchema = z.object({
  title: z.string().min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).optional(),
  urls: z.array(z.string()).optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const songUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  parentId: z.never().optional(),
  masterId: z.never().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).optional(),
  urls: z.array(z.string()).optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

describe("Backend Song Schemas - Empty Artist IDs", () => {
  describe("songCreateSchema", () => {
    it("should accept request body with empty artistIds array", () => {
      const payload = {
        title: "Test Song",
        artistIds: [],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toEqual([]);
      }
    });

    it("should accept request body with undefined artistIds", () => {
      const payload = {
        title: "Test Song",
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should accept request body with multiple artists", () => {
      const payload = {
        title: "Test Song",
        artistIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "660e8400-e29b-41d4-a716-446655440001",
        ],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toHaveLength(2);
      }
    });

    it("should accept complete song data with empty artists", () => {
      const payload = {
        title: "Complete Song",
        parentId: null,
        releasedAt: "2024-01-01T00:00:00Z",
        artistIds: [],
        urls: ["https://example.com"],
        coverArtId: null,
        description: "A complete song with no artists",
        playbackEnabled: true,
        tags: ["tag1", "tag2"],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toEqual([]);
      }
    });

    it("should reject invalid UUID in artistIds", () => {
      const payload = {
        title: "Test Song",
        artistIds: ["not-a-uuid"],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject non-string artistIds", () => {
      const payload = {
        title: "Test Song",
        artistIds: [123],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should require title", () => {
      const payload = {
        artistIds: [],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const payload = {
        title: "",
        artistIds: [],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject title over 500 characters", () => {
      const payload = {
        title: "a".repeat(501),
        artistIds: [],
      };

      const result = songCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("songUpdateSchema", () => {
    it("should accept update with empty artistIds array", () => {
      const payload = {
        artistIds: [],
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toEqual([]);
      }
    });

    it("should accept update with no artistIds field", () => {
      const payload = {
        title: "Updated Title",
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should accept partial update with only artistIds", () => {
      const payload = {
        artistIds: ["550e8400-e29b-41d4-a716-446655440000"],
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should allow updating artists and other fields simultaneously", () => {
      const payload = {
        title: "Updated Title",
        artistIds: [],
        description: "Updated description",
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject parentId in update", () => {
      const payload = {
        parentId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject masterId in update", () => {
      const payload = {
        masterId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = songUpdateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
