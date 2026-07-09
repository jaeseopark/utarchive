/**
 * Compares two record objects and returns only the properties that have changed.
 * Ignores undefined values when comparing (treats them as not changed).
 *
 * @param original The original object (the "before" state)
 * @param updated The updated object (the "after" state)
 * @returns An object containing only the properties that have changed
 */
export function getChangedProperties(
  original: Record<string, unknown>,
  updated: Record<string, unknown>,
): Record<string, unknown> {
  const changed: Record<string, unknown> = {};

  Object.entries(updated).forEach(([key, newValue]) => {
    if (!(key in original)) {
      return;
    }

    const originalValue = original[key];

    // Deep comparison for arrays (handles artist IDs and tags)
    if (Array.isArray(originalValue) && Array.isArray(newValue)) {
      if (!arraysEqual(originalValue, newValue)) {
        changed[key] = newValue;
      }
      return;
    }

    // Standard comparison for other types
    if (originalValue !== newValue) {
      changed[key] = newValue;
    }
  });

  return changed;
}

/**
 * Helper function to compare arrays for equality
 * Order-sensitive comparison
 */
function arraysEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}
