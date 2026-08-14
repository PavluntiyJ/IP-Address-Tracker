import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupAddress } from "./api";

const result = {
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

describe("lookupAddress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("encodes a submitted domain and validates the response", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com/api/lookup");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupAddress("docs.example.com")).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/lookup?q=docs.example.com",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("surfaces a safe API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Lookup unavailable." }), {
          status: 502,
        }),
      ),
    );

    await expect(lookupAddress("bad.test")).rejects.toThrow(
      "Lookup unavailable.",
    );
  });
});
