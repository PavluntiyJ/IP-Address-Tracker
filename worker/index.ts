import { lookupResultSchema } from "../shared/lookup";
import { consumeRateLimit } from "./rateLimit";

interface Env {
  IPIFY_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_MS?: string;
}

const lookupPath = "/api/lookup";
const validAddress = /^(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$|^[a-fA-F0-9:.]+$/;
const defaultRateLimitMax = 30;
const defaultRateLimitWindowMs = 60_000;

function corsHeaders(request: Request, env: Env) {
  const requestOrigin = request.headers.get("Origin");
  const configuredOrigins = env.ALLOWED_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigin =
    !configuredOrigins?.length || configuredOrigins.includes("*")
      ? "*"
      : requestOrigin && configuredOrigins.includes(requestOrigin)
        ? requestOrigin
        : null;

  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  });
  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  return headers;
}

function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  const headers = corsHeaders(request, env);
  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) {
      headers.set(name, value);
    }
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function isIpAddress(value: string) {
  return value.includes(":") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isPrivateAddress(value: string) {
  const normalized = value.toLowerCase();
  const secondOctet = Number(normalized.split(".")[1]);
  return (
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    (normalized.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31) ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== lookupPath) {
      return json(request, env, { error: "Not found." }, 404);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }
    if (request.method !== "GET") {
      return json(request, env, { error: "Method not allowed." }, 405);
    }
    if (!env.IPIFY_API_KEY) {
      return json(
        request,
        env,
        { error: "Lookup service is not configured." },
        503,
      );
    }

    const clientIp =
      request.headers.get("CF-Connecting-IP")?.trim() ||
      request.headers.get("X-NF-Client-Connection-IP")?.trim() ||
      "anonymous";
    const rateLimit = consumeRateLimit(
      clientIp,
      Number(env.RATE_LIMIT_MAX ?? "") || defaultRateLimitMax,
      Number(env.RATE_LIMIT_WINDOW_MS ?? "") || defaultRateLimitWindowMs,
    );
    if (!rateLimit.allowed) {
      return json(
        request,
        env,
        {
          error: "Too many lookups from your network. Please wait a minute.",
        },
        429,
        { "Retry-After": String(rateLimit.retryAfterSeconds) },
      );
    }

    const submittedQuery = url.searchParams.get("q")?.trim() ?? "";
    if (
      submittedQuery &&
      (submittedQuery.length > 253 || !validAddress.test(submittedQuery))
    ) {
      return json(
        request,
        env,
        { error: "Enter a valid IP address or domain." },
        400,
      );
    }

    const query =
      submittedQuery ||
      (clientIp !== "anonymous" && !isPrivateAddress(clientIp)
        ? clientIp
        : "");
    const providerUrl = new URL("https://geo.ipify.org/api/v2/country,city");
    providerUrl.searchParams.set("apiKey", env.IPIFY_API_KEY);
    if (query) {
      providerUrl.searchParams.set(
        isIpAddress(query) ? "ipAddress" : "domain",
        query,
      );
    }

    try {
      const providerResponse = await fetch(providerUrl, {
        headers: { Accept: "application/json" },
      });
      const providerBody: unknown = await providerResponse
        .json()
        .catch(() => null);

      if (!providerResponse.ok) {
        const status = providerResponse.status === 429 ? 429 : 400;
        const message =
          status === 429
            ? "The lookup limit has been reached. Try again shortly."
            : "That IP address or domain could not be located.";
        return json(request, env, { error: message }, status);
      }

      const result = lookupResultSchema.safeParse(providerBody);
      if (!result.success) {
        return json(
          request,
          env,
          { error: "The lookup provider returned incomplete data." },
          502,
        );
      }

      return json(request, env, result.data);
    } catch {
      return json(
        request,
        env,
        { error: "The lookup service is temporarily unavailable." },
        502,
      );
    }
  },
};
