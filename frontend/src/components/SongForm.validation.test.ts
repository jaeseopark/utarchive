import { describe, it, expect } from "vitest";
import { z } from "zod";

// Recreate the form schema to test it
const optionalUUID = z
  .string()
  .refine(
    (val) =>
      val === "" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    { message: "Invalid UUID" },
  )
  .nullable()
  .optional();

const optionalDatetime = z
  .string()
  .refine((val) => val === "" || !isNaN(Date.parse(val)), { message: "Invalid ISO datetime" })
  .nullable()
  .optional();

const SongCreateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  artistIds: z.array(z.string().uuid()).optional(),
  parentId: optionalUUID,
  releasedAt: optionalDatetime,
  urls: z.array(z.string()).optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: optionalUUID,
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

type SongCreateFormInput = z.infer<typeof SongCreateFormSchema>;

describe("Frontend Song Form Validation - Empty Artist IDs", () => {
  describe("Form validation with no artists", () => {
    it("should validate form with empty artistIds array", () => {
      const formData: SongCreateFormInput = {
        title: "New Song",
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

    it("should validate form with undefined artistIds", () => {
      const formData: SongCreateFormInput = {
        title: "New Song",
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

    it("should validate minimal form with only title", () => {
      const formData: SongCreateFormInput = {
        title: "Minimal Song",
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });
  });

  describe("Form validation with artists", () => {
    it("should validate form with single artist", () => {
      const formData: SongCreateFormInput = {
        title: "Song with Artist",
        artistIds: ["550e8400-e29b-41d4-a716-446655440000"],
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
        expect(result.data.artistIds).toHaveLength(1);
      }
    });

    it("should validate form with multiple artists", () => {
      const formData: SongCreateFormInput = {
        title: "Song with Multiple Artists",
        artistIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "660e8400-e29b-41d4-a716-446655440001",
        ],
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
  });

  describe("Form submission scenarios", () => {
    it("should accept form submission without artist selection", () => {
      const formData: SongCreateFormInput = {
        title: "Independent Song",
        artistIds: [], // User clicked submit without selecting artists
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "A song without assigned artists",
        playbackEnabled: true,
        tags: ["independent"],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    it("should accept form submission with all optional fields filled", () => {
      const formData: SongCreateFormInput = {
        title: "Complete Song",
        artistIds: ["550e8400-e29b-41d4-a716-446655440000"],
        parentId: "660e8400-e29b-41d4-a716-446655440001",
        releasedAt: "2024-01-01T00:00:00Z",
        urls: ["https://example.com"],
        filePath: "/path/to/file.mp3",
        coverArtId: "770e8400-e29b-41d4-a716-446655440002",
        description: "A complete song",
        playbackEnabled: true,
        tags: ["complete", "test"],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    it("should accept form submission clearing artists from existing song", () => {
      // Scenario: User edits existing song and removes all artists
      const formData: SongCreateFormInput = {
        title: "Song",
        artistIds: [], // User cleared the artists
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
  });

  describe("Form validation errors", () => {
    it("should reject form without title", () => {
      const formData = {
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

    it("should reject form with empty title", () => {
      const formData: SongCreateFormInput = {
        title: "", // Empty title should fail
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

    it("should reject form with invalid artist UUID", () => {
      const formData = {
        title: "Song",
        artistIds: ["not-a-uuid"], // Invalid UUID
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

    it("should reject form with invalid parent ID", () => {
      const formData = {
        title: "Song",
        artistIds: [],
        parentId: "invalid-uuid", // Invalid UUID
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    it("should reject form with invalid release date", () => {
      const formData = {
        title: "Song",
        artistIds: [],
        parentId: null,
        releasedAt: "not-a-date", // Invalid date
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const result = SongCreateFormSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle artistIds changing from populated to empty", () => {
      const beforeData: SongCreateFormInput = {
        title: "Song",
        artistIds: ["550e8400-e29b-41d4-a716-446655440000"],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const afterData: SongCreateFormInput = {
        title: "Song",
        artistIds: [],
        parentId: null,
        releasedAt: null,
        urls: [],
        description: "",
        playbackEnabled: false,
        tags: [],
      };

      const resultBefore = SongCreateFormSchema.safeParse(beforeData);
      const resultAfter = SongCreateFormSchema.safeParse(afterData);

      expect(resultBefore.success).toBe(true);
      expect(resultAfter.success).toBe(true);
      if (resultBefore.success && resultAfter.success) {
        expect(resultBefore.data.artistIds).toHaveLength(1);
        expect(resultAfter.data.artistIds).toEqual([]);
      }
    });

    it("should handle max artistIds array size", () => {
      const artistIds = Array(100)
        .fill(0)
        .map((_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`);

      const formData: SongCreateFormInput = {
        title: "Song with Many Artists",
        artistIds: artistIds,
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
        expect(result.data.artistIds).toHaveLength(100);
      }
    });
  });
});
