import { ZodSchema } from 'zod';

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, 'Invalid JSON response', text);
  }
}

type RequestOptions = {
  preventUnauthorizedRedirect?: boolean;
};

function handleUnauthorized() {
  window.location.assign('/login');
}

async function request<T>(
  input: RequestInfo,
  init: RequestInit,
  schema: ZodSchema<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  });

  if (response.status === 401) {
    if (!options.preventUnauthorizedRedirect) {
      handleUnauthorized();
    }
    throw new ApiError(401, 'Unauthorized', null);
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload ? String((payload as any).message) : response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  const parseResult = schema.safeParse(payload);
  if (!parseResult.success) {
    throw new ApiError(response.status, 'Response validation failed', parseResult.error.format());
  }

  return parseResult.data;
}

export const api = {
  get: async <T>(url: string, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: 'GET' }, schema, options),
  post: async <T>(url: string, body: unknown, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: 'POST', body: JSON.stringify(body) }, schema, options),
  put: async <T>(url: string, body: unknown, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: 'PUT', body: JSON.stringify(body) }, schema, options),
  delete: async <T>(url: string, schema: ZodSchema<T>, options?: RequestOptions) =>
    request(url, { method: 'DELETE' }, schema, options),
};
