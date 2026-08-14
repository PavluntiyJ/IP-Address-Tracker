import { lookupResultSchema, type LookupResult } from "../shared/lookup";

const defaultError =
  "We could not locate that address. Check it and try again.";

export async function lookupAddress(
  query = "",
  signal?: AbortSignal,
): Promise<LookupResult> {
  const endpoint = import.meta.env.VITE_API_URL?.trim() || "/api/lookup";
  const search = query.trim();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = search
    ? `${endpoint}${separator}q=${encodeURIComponent(search)}`
    : endpoint;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : defaultError;
    throw new Error(message);
  }

  const result = lookupResultSchema.safeParse(body);
  if (!result.success) {
    throw new Error("The lookup service returned incomplete location data.");
  }

  return result.data;
}
