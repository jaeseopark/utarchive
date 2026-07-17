import { describe, it, expect } from "vitest";
import { SongCreateFormSchema, SongCreateSchema } from "./schemas";

describe("Song Schemas - Empty Artist IDs", () => {
  describe("SongCreateFormSchema", () => {
    it("should accept form data with empty artistIds array", () => {
      const formData = {
        title: "Test Song",
        artistIds: [],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toEqual([]);
      }
    });

    it("should accept form data with undefined artistIds", () => {
      const formData = {
        title: "Test Song",
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    it("should accept form data with multiple artists", () => {
      const formData = {
        title: "Test Song",
        artistIds: ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toHaveLength(2);
      }
    });

    it("should reject invalid UUID in artistIds", () => {
      const formData = {
        title: "Test Song",
        artistIds: ["not-a-uuid"],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    it("should require title", () => {
      const formData = {
        title: "",
        artistIds: [],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });
  });

  describe("SongCreateSchema (API)", () => {
    it("should accept API data with empty artistIds array", () => {
      const apiData = {
        title: "Test Song",
        artistIds: [],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateSchema.safeParse(apiData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toEqual([]);
      }
    });

    it("should accept API data with undefined artistIds", () => {
      const apiData = {
        title: "Test Song",
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateSchema.safeParse(apiData);
      expect(result.success).toBe(true);
    });

    it("should transform artistIds to branded types", () => {
      const apiData = {
        title: "Test Song",
        artistIds: ["550e8400-e29b-41d4-a716-446655440000"],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateSchema.safeParse(apiData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artistIds).toHaveLength(1);
      }
    });

    it("should accept minimal data with only required title", () => {
      const apiData = {
        title: "Minimal Song",
      };

      const result = SongCreateSchema.safeParse(apiData);
      expect(result.success).toBe(true);
    });
  });
});
