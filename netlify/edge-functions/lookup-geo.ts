import type { Context } from "@netlify/edge-functions";
import { lookupResultSchema, type LookupResult } from "../../shared/lookup.ts";

export interface EdgeGeoInput {
  ip: string | null;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export function utcOffset(timezone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(now);
    const label =
      parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    return label.replace("GMT", "");
  } catch {
    return "";
  }
}

export function buildGeoLookup(
  input: EdgeGeoInput,
  now: Date = new Date(),
): LookupResult | null {
  if (
    !input.ip ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    return null;
  }

  return lookupResultSchema.parse({
    ip: input.ip,
    location: {
      city: input.city ?? "",
      region: input.region ?? "",
      country: input.country ?? "",
      postalCode: input.postalCode ?? "",
      timezone: input.timezone ? utcOffset(input.timezone, now) : "",
      lat: input.latitude,
      lng: input.longitude,
    },
    isp: "Unknown network",
  });
}

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export default async function lookupGeo(request: Request, context: Context) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.searchParams.has("q")) {
    return context.next();
  }

  const result = buildGeoLookup({
    ip: context.ip || null,
    city: context.geo.city,
    region: context.geo.subdivision?.name,
    country: context.geo.country?.code,
    postalCode: context.geo.postalCode,
    timezone: context.geo.timezone,
    latitude: context.geo.latitude,
    longitude: context.geo.longitude,
  });

  if (!result) {
    return context.next();
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Geo-Source": localHosts.has(url.hostname)
        ? "netlify-edge-dev"
        : "netlify-edge",
    },
  });
}
