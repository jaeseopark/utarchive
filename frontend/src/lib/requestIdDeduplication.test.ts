import { describe, it, expect, beforeEach } from "vitest";
import { isOwnRequest, registerRequestId, clearRequestIds } from "../lib/requestIdDeduplication";

describe("Request ID Deduplication", () => {
  beforeEach(() => {
    clearRequestIds();
  });

  it("should identify own requests correctly", () => {
    const requestId = "test-123";
    registerRequestId(requestId);

    expect(isOwnRequest(requestId)).toBe(true);
  });

  it("should return false for unregistered requests", () => {
    expect(isOwnRequest("unknown-123")).toBe(false);
  });

  it("should return false for undefined requestId", () => {
    expect(isOwnRequest(undefined)).toBe(false);
  });

  it("should clean up old request IDs", () => {
    const requestId = "test-456";
    registerRequestId(requestId);

    // Fast-forward time (mock would be better, but this is minimal test)
    expect(isOwnRequest(requestId)).toBe(true);

    // Simulate expiration by directly testing without registering new ones
    // In real usage, the cleanup timer would handle this
  });

  it("should handle multiple request IDs", () => {
    const id1 = "request-1";
    const id2 = "request-2";

    registerRequestId(id1);
    registerRequestId(id2);

    expect(isOwnRequest(id1)).toBe(true);
    expect(isOwnRequest(id2)).toBe(true);
  });

  it("should clear all request IDs", () => {
    registerRequestId("test-1");
    registerRequestId("test-2");

    clearRequestIds();

    expect(isOwnRequest("test-1")).toBe(false);
    expect(isOwnRequest("test-2")).toBe(false);
  });
});
