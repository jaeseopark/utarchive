import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Test the file stability check logic
 * This replicates the waitForFileStability function behavior
 */

/**
 * Monitor file size for stability. Returns true when file size is unchanged
 * for 2 consecutive 500ms checks (2-second window).
 * Timeout after 30 seconds with warning log.
 */
async function waitForFileStability(
  filePath: string,
  maxWaitMs: number = 30000,
): Promise<boolean> {
  const pollIntervalMs = 500;
  const stableCheckCount = 4; // 4 × 500ms = 2 seconds
  let stableCount = 0;
  let lastSize: number | null = null;
  let elapsedMs = 0;

  while (elapsedMs < maxWaitMs) {
    try {
      const { statSync } = await import("fs");
      const stat = statSync(filePath);
      const currentSize = stat.size;

      if (lastSize === currentSize && currentSize > 0) {
        stableCount++;
        if (stableCount >= stableCheckCount) {
          return true; // File is stable
        }
      } else {
        stableCount = 0; // Reset counter if size changed
      }

      lastSize = currentSize;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      elapsedMs += pollIntervalMs;
    } catch {
      // File might not exist yet, retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      elapsedMs += pollIntervalMs;
    }
  }

  return false; // Timeout
}

describe("Audio Ingestion - File Stability Check", () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `utarchive-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should detect a stable file (no changes for 2 seconds)", async () => {
    const testFile = join(testDir, "stable-file.mp3");
    const content = "test audio data ".repeat(100); // Some content
    writeFileSync(testFile, content);

    const isStable = await waitForFileStability(testFile, 5000);
    expect(isStable).toBe(true);
  });

  it("should handle a file that starts empty then gets data", async () => {
    const testFile = join(testDir, "growing-file.mp3");
    writeFileSync(testFile, ""); // Start empty

    // Start the stability check
    const checkPromise = waitForFileStability(testFile, 3000);

    // After 300ms, add data to file
    await new Promise((resolve) => setTimeout(resolve, 300));
    writeFileSync(testFile, "test data ".repeat(50));

    // Wait for it to stabilize
    const isStable = await checkPromise;
    expect(isStable).toBe(true);
  });

  it("should timeout if file keeps changing", async () => {
    const testFile = join(testDir, "constantly-changing-file.mp3");
    writeFileSync(testFile, "initial data");

    // Start the stability check with short timeout
    const checkPromise = waitForFileStability(testFile, 2000);

    // Keep modifying the file
    const interval = setInterval(() => {
      writeFileSync(testFile, Math.random().toString());
    }, 300);

    const isStable = await checkPromise;
    clearInterval(interval);

    expect(isStable).toBe(false);
  });

  it("should reset counter when file size changes after being stable", async () => {
    const testFile = join(testDir, "interrupted-stable-file.mp3");
    const initialContent = "test data ".repeat(50);
    writeFileSync(testFile, initialContent);

    // Start the stability check
    const checkPromise = waitForFileStability(testFile, 4000);

    // After 1 second, file size will have been stable for 500ms
    // Add more data at 1.2 seconds to reset the counter
    await new Promise((resolve) => setTimeout(resolve, 1200));
    writeFileSync(testFile, initialContent + "more data");

    const isStable = await checkPromise;
    // With 4 second timeout and resets, it should eventually stabilize
    expect(isStable).toBe(true);
  });

  it("should ignore empty files (require minimum size)", async () => {
    const testFile = join(testDir, "empty-file.mp3");
    writeFileSync(testFile, "");

    // Empty files won't stabilize immediately (currentSize > 0 check)
    const isStable = await waitForFileStability(testFile, 1000);
    expect(isStable).toBe(false);
  });

  it("should handle files with real-world write pattern", async () => {
    const testFile = join(testDir, "simulated-upload.mp3");
    writeFileSync(testFile, "");

    // Simulate a file being gradually written
    const checkPromise = waitForFileStability(testFile, 5000);

    // Simulate chunked writing (like an upload)
    const chunkSize = 1024; // 1KB chunks
    let currentData = "";

    const writeInterval = setInterval(() => {
      currentData += "x".repeat(chunkSize);
      writeFileSync(testFile, currentData);
    }, 200);

    // Stop writing after 1.5 seconds (this gives 2+ seconds for stability check)
    setTimeout(() => clearInterval(writeInterval), 1500);

    const isStable = await checkPromise;
    expect(isStable).toBe(true); // Should stabilize after writes stop
  });

  it("should detect stability quickly when file is already complete", async () => {
    const testFile = join(testDir, "already-complete.mp3");
    const largeContent = "x".repeat(1024 * 1024); // 1MB
    writeFileSync(testFile, largeContent);

    const startTime = Date.now();
    const isStable = await waitForFileStability(testFile, 5000);
    const elapsedTime = Date.now() - startTime;

    expect(isStable).toBe(true);
    // Should detect stability within ~2-3 seconds (4 * 500ms = 2000ms + some overhead)
    expect(elapsedTime).toBeLessThan(3500);
  });
});
