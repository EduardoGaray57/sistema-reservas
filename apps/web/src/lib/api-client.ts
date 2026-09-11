import type {
  ApiErrorBody,
  AvailabilityResponse,
  Booking,
  CreateBookingInput,
  Resource,
} from "@/types";

/**
 * Base URL for the API. Resolves from a runtime env var (Vite or Node) and
 * falls back to the empty string, which makes requests same-origin so the
 * Vite dev server proxy forwards `/api` to the API process.
 *
 * `process` is accessed via globalThis to keep the browser bundle free of
 * Node type dependencies and guard the Node runtime path (tsx harnesses).
 */
const nodeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

export const API_BASE_URL: string =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ??
  nodeEnv?.VITE_API_BASE_URL ??
  "";

/** Error thrown when the API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message = Array.isArray(errorBody?.message)
      ? errorBody!.message.join(", ")
      : errorBody?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

export function getResources(): Promise<Resource[]> {
  return apiFetch<Resource[]>("/api/resources");
}

export function getResource(resourceId: string): Promise<Resource> {
  return apiFetch<Resource>(`/api/resources/${resourceId}`);
}

export function getAvailability(
  resourceId: string,
  date: string,
): Promise<AvailabilityResponse> {
  return apiFetch<AvailabilityResponse>(
    `/api/resources/${resourceId}/availability?date=${encodeURIComponent(date)}`,
  );
}

export function createBooking(input: CreateBookingInput): Promise<Booking> {
  return apiFetch<Booking>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}