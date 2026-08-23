// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = {
  IPIFY_API_KEY: "private-key",
  ALLOWED_ORIGIN: "https://trace.example.com",
};

const providerResult = {
  ip: "8.8.8.8",
  location: {
    city: "Mountain View",
    region: "California",
    country: "US",
    postalCode: "94035",
    timezone: "-07:00",
    lat: 37.4056,
    lng: -122.0775,
  },
  isp: "Google LLC",
};

describe("lookup worker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards a valid domain without exposing the provider key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(providerResult), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(
      "https://api.example.com/api/lookup?q=example.com",
      { headers: { Origin: "https://trace.example.com" } },
    );

    const response = await worker.fetch(request, env);
    const requestedProviderUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://trace.example.com",
    );
    expect(body).toEqual(providerResult);
    expect(requestedProviderUrl.searchParams.get("domain")).toBe("example.com");
    expect(requestedProviderUrl.searchParams.get("apiKey")).toBe("private-key");
    expect(JSON.stringify(body)).not.toContain("private-key");
  });

  it("rejects malformed input before contacting the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(
      "https://api.example.com/api/lookup?q=https%3A%2F%2Fexample.com%2Fadmin",
    );

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a compressed IPv6 query as an address", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(providerResult), { status: 200 }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(
      "https://api.example.com/api/lookup?q=2001%3Adb8%3A%3A1",
    );

    const response = await worker.fetch(request, env);
    const requestedProviderUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(requestedProviderUrl.searchParams.get("ipAddress")).toBe(
      "2001:db8::1",
    );
  });

  it("rejects malformed IPv6 input before contacting the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(
      "https://api.example.com/api/lookup?q=zzz%3A%3A1",
    );

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not forward a local development address as the visitor IP", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(providerResult), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://api.example.com/api/lookup", {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });

    const response = await worker.fetch(request, env);
    const requestedProviderUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(requestedProviderUrl.searchParams.has("ipAddress")).toBe(false);
  });

  it("uses Netlify's trusted visitor address for an initial lookup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(providerResult), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://api.example.com/api/lookup", {
      headers: { "X-NF-Client-Connection-IP": "203.0.113.42" },
    });

    const response = await worker.fetch(request, env);
    const requestedProviderUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(requestedProviderUrl.searchParams.get("ipAddress")).toBe(
      "203.0.113.42",
    );
  });

  it("caches explicit queries at the edge but never personal lookups", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(providerResult), { status: 200 }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const queried = await worker.fetch(
      new Request("https://api.example.com/api/lookup?q=8.8.8.8"),
      env,
    );
    expect(queried.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );

    const personal = await worker.fetch(
      new Request("https://api.example.com/api/lookup", {
        headers: { "X-NF-Client-Connection-IP": "203.0.113.42" },
      }),
      env,
    );
    expect(personal.headers.get("Cache-Control")).toBe("no-store");
  });

  it("throttles bursts from one client and recovers after the window", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000_000);
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify(providerResult), { status: 200 }),
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const throttledEnv = { ...env, RATE_LIMIT_MAX: "2" };
      const makeRequest = () =>
        new Request("https://api.example.com/api/lookup?q=8.8.8.8", {
          headers: { "CF-Connecting-IP": "198.51.100.9" },
        });

      expect((await worker.fetch(makeRequest(), throttledEnv)).status).toBe(
        200,
      );
      expect((await worker.fetch(makeRequest(), throttledEnv)).status).toBe(
        200,
      );

      const limited = await worker.fetch(makeRequest(), throttledEnv);
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(await limited.json()).toEqual({ error: expect.any(String) });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(60_001);
      expect((await worker.fetch(makeRequest(), throttledEnv)).status).toBe(
        200,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps other clients unthrottled while one is limited", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(2_000_000);
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify(providerResult), { status: 200 }),
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const throttledEnv = { ...env, RATE_LIMIT_MAX: "1" };
      const from = (ip: string) =>
        new Request("https://api.example.com/api/lookup?q=8.8.8.8", {
          headers: { "CF-Connecting-IP": ip },
        });

      expect((await worker.fetch(from("198.51.100.31"), throttledEnv)).status).toBe(200);
      expect((await worker.fetch(from("198.51.100.31"), throttledEnv)).status).toBe(429);
      expect((await worker.fetch(from("203.0.113.77"), throttledEnv)).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });
});
