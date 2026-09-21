export const MONDAY_API_VERSION = "2026-07";
export const MONDAY_GRAPHQL_URL = "https://api.monday.com/v2";

export type MondayGraphQLError = {
  message: string;
  extensions?: { code?: string; status_code?: number; [key: string]: unknown };
};

export class MondayApiError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly requestId: string | null;
  constructor(
    message: string,
    options: { retryable?: boolean; retryAfterMs?: number | null; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = "MondayApiError";
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.requestId = options.requestId ?? null;
  }
}

function retryAfterMs(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

/** Server-only monday GraphQL transport. Keep access tokens in the vault, never in VITE code. */
export async function mondayGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  options: { requestId?: string; idempotencyKey?: string; fetcher?: typeof fetch } = {},
): Promise<T> {
  if (!token) throw new MondayApiError("Monday access token is required");
  const requestId = options.requestId ?? crypto.randomUUID();
  const response = await (options.fetcher ?? fetch)(MONDAY_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "API-Version": MONDAY_API_VERSION,
      "X-Request-ID": requestId,
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => ({}));
  const errors = Array.isArray(body?.errors) ? (body.errors as MondayGraphQLError[]) : [];
  if (!response.ok || errors.length) {
    const message = errors.map((error) => error.message).join("; ") || `monday API ${response.status}`;
    const rateLimited =
      response.status === 429 ||
      errors.some((error) => ["RATE_LIMITED", "COMPLEXITY_EXCEPTION"].includes(String(error.extensions?.code)));
    throw new MondayApiError(message, {
      retryable: rateLimited || response.status >= 500,
      retryAfterMs: retryAfterMs(response.headers.get("retry-after")),
      requestId: response.headers.get("x-request-id") ?? requestId,
    });
  }
  return body.data as T;
}
