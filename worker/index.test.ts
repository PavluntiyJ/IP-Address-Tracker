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
});
