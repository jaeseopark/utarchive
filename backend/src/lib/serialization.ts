/**
 * Recursively convert all BigInt values to numbers and Date objects to ISO strings for JSON serialization.
 * Handles direct BigInt/Date fields, nested objects, and arrays.
 *
 * This is used to ensure API responses are JSON-serializable since Express.json() fails on BigInt and Date types.
 */
export const serializeForApiResponse = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeForApiResponse);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeForApiResponse(val)]),
    );
  }
  return value;
};
