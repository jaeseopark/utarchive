import { ZodSchema } from "zod";
import { v4 as uuidv4 } from "uuid";
import { registerRequestId } from "../lib/requestIdDeduplication";

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Module-level storage for the current origin identifier
 * Set by UIIdentifierProvider during app initialization
 */
let currentOriginId: string | null = null;

export function setCurrentOriginId(originId: string): void {
  currentOriginId = originId;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, "Invalid JSON response", text);
  }
}

type RequestOptions = {
  preventUnauthorizedRedirect?: boolean;
};

function handleUnauthorized() {
  window.location.assign("/login");
}

/**
 * Format Zod validation errors into a human-readable message showing which fields failed
 */
function formatValidationErrors(errors: Record<string, unknown>): string {
  const failedFields: string[] = [];

  const formatField = (key: string, value: unknown, path: string[] = []): void => {
    const fieldPath = [...path, key].join(".");

    if (
      typeof value === "object" &&
      value !== null &&
      "_errors" in value &&
      // eslint-disable-next-line no-restricted-syntax
      Array.isArray((value as Record<string, unknown>)._errors)
    ) {
      // eslint-disable-next-line no-restricted-syntax
      const errorMessages = ((value as Record<string, unknown>)._errors as string[]).join("; ");
      failedFields.push(`${fieldPath}: ${errorMessages}`);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        formatField(nestedKey, nestedValue, [...path, key]);
      }
    }
  };

  for (const [key, value] of Object.entries(errors)) {
    formatField(key, value);
  }

  return `Response validation failed: ${failedFields.join(", ")}`;
}

/**
 * Log detailed validation error information for debugging
 */
function logValidationError(
  url: string,
  payload: unknown,
  zodErrorFormat: Record<string, unknown>,
): void {
  console.group("🔴 API Validation Error Details");
  console.log("📍 Endpoint:", url);
  console.log("📦 Actual Response Payload:", payload);
  console.log("❌ Validation Errors (Zod Format):", zodErrorFormat);

  // Type guard to check if value has _errors array
  function hasErrors(value: unknown): value is Record<string, unknown> & { _errors: string[] } {
    return (
      typeof value === "object" &&
      value !== null &&
      "_errors" in value &&
      // eslint-disable-next-line no-restricted-syntax
      Array.isArray((value as Record<string, unknown>)._errors)
    );
  }

  // Log each error path separately for clarity
  const logErrorPath = (key: string, value: unknown, path: string[] = []): void => {
    const fieldPath = [...path, key].join(".");
    if (hasErrors(value)) {
      console.warn(`  ❌ ${fieldPath}:`, value._errors);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        logErrorPath(nestedKey, nestedValue, [...path, key]);
      }
    }
  };

  for (const [key, value] of Object.entries(zodErrorFormat)) {
    logErrorPath(key, value);
  }

  console.groupEnd();
}

async function request<T>(
  input: RequestInfo,
  init: RequestInit,
  schema: ZodSchema<T>,
  options: RequestOptions = {},
): Promise<T> {
  // Generate request ID for deduplication
  const requestId = uuidv4();
  registerRequestId(requestId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
  };

  // Add origin ID header if available
  if (currentOriginId) {
    headers["X-Origin-ID"] = currentOriginId;
  }

  const response = await fetch(input, {
    credentials: "include",
    headers: {
      ...headers,
      ...init.headers,
    },
    ...init,
  });

  if (response.status === 401) {
    if (!options.preventUnauthorizedRedirect) {
      handleUnauthorized();
    }
    throw new ApiError(401, "Unauthorized", null);
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload && !Array.isArray(payload)
        ? String(payload.message)
        : response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  const parseResult = schema.safeParse(payload);
  if (!parseResult.success) {
    const errorFormat = parseResult.error.format();
    logValidationError(String(input), payload, errorFormat);
    const validationErrorMessage = formatValidationErrors(errorFormat);
    throw new ApiError(response.status, validationErrorMessage, errorFormat);
  }

  return parseResult.data;
}

export const api = {
  get: async <T>(url: string, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: "GET" }, schema, options),
  post: async <T>(url: string, body: unknown, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: "POST", body: JSON.stringify(body) }, schema, options),
  put: async <T>(url: string, body: unknown, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: "PUT", body: JSON.stringify(body) }, schema, options),
  patch: async <T>(url: string, body: unknown, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: "PATCH", body: JSON.stringify(body) }, schema, options),
  delete: async <T>(url: string, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: "DELETE" }, schema, options),
};
