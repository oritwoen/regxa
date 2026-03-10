import { ofetch, FetchError } from "ofetch";
import type { $Fetch } from "ofetch";
import type { ClientOptions, RateLimiter } from "./types.ts";
import { HTTPError, RateLimitError } from "./errors.ts";

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY = 50;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_USER_AGENT = "regxa/0.1.0";

/**
 * Parse a `Retry-After` header into seconds.
 *
 * Handles two formats (RFC 7231 §7.1.3):
 * - **Numeric**: `"120"` → 120
 * - **HTTP-date**: `"Wed, 21 Oct 2025 07:28:00 GMT"` → seconds until that time
 *
 * Returns 60 when the header is absent, empty, or unparseable.
 */
export function parseRetryAfter(header: string | null | undefined): number {
  if (!header) return 60;
  const trimmed = header.trim();
  if (!trimmed) return 60;

  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const timestamp = /[a-z]/i.test(trimmed) ? Date.parse(trimmed) : NaN;
  if (!Number.isNaN(timestamp)) {
    const seconds = Math.ceil((timestamp - Date.now()) / 1000);
    return Math.max(seconds, 0);
  }

  return 60;
}

/** HTTP client with retry, backoff, rate limiting, and timeout. */
export class Client {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly timeout: number;
  readonly userAgent: string;
  private readonly rateLimiter: RateLimiter | null;
  private readonly fetch: $Fetch;

  constructor(options: ClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.rateLimiter = options.rateLimiter ?? null;

    const maxRetries = this.maxRetries;
    const baseDelay = this.baseDelay;

    this.fetch = ofetch.create({
      retry: this.maxRetries,
      retryDelay(context) {
        const remaining = typeof context.options.retry === "number" ? context.options.retry : 0;
        const attempt = maxRetries - remaining;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = delay * Math.random() * 0.1;
        return delay + jitter;
      },
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      timeout: this.timeout,
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
    });
  }

  /** Fetch JSON from a URL with retry and rate limiting. */
  async getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
    if (this.rateLimiter) {
      await this.rateLimiter.wait(signal);
    }

    try {
      return await this.fetch<T>(url, { signal });
    } catch (error) {
      if (error instanceof FetchError) {
        if (error.statusCode === 429) {
          throw new RateLimitError(parseRetryAfter(error.response?.headers.get("Retry-After")));
        }

        const body = typeof error.data === "string" ? error.data : JSON.stringify(error.data ?? "");

        throw new HTTPError(error.statusCode ?? 0, url, body);
      }
      throw error;
    }
  }
}

let _defaultClient: Client | undefined;

/** Get or create the shared default client. */
export function defaultClient(): Client {
  if (!_defaultClient) {
    _defaultClient = new Client();
  }
  return _defaultClient;
}
