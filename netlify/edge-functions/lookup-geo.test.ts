// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildGeoLookup, utcOffset } from "./lookup-geo";

const winter = new Date("2026-01-15T12:00:00Z");

describe("utcOffset", () => {
  it("converts IANA zones to ipify-style offsets", () => {
    expect(utcOffset("America/New_York", winter)).toBe("-05:00");
    expect(utcOffset("Europe/Berlin", winter)).toBe("+01:00");
    expect(utcOffset("Asia/Kolkata", winter)).toBe("+05:30");
  });

  it("degrades gracefully for missing or invalid zones", () => {
    expect(utcOffset("")).toBe("");
    expect(utcOffset("Not/AZone")).toBe("");
    expect(utcOffset("UTC", winter)).toBe("+00:00");
  });
});

describe("buildGeoLookup", () => {
  const input = {
    ip: "203.0.113.42",
    city: "Portland",
    region: "Oregon",
    country: "US",
    postalCode: "97201",
    timezone: "America/Los_Angeles",
    latitude: 45.52,
    longitude: -122.68,
  };

  it("builds the shared lookup payload from edge geo data", () => {
    expect(buildGeoLookup(input, winter)).toEqual({
      ip: "203.0.113.42",
      location: {
        city: "Portland",
        region: "Oregon",
        country: "US",
        postalCode: "97201",
        timezone: "-08:00",
        lat: 45.52,
        lng: -122.68,
      },
      isp: "Unknown network",
    });
  });

  it("falls back to the regular handler when geo data is unusable", () => {
    expect(buildGeoLookup({ ...input, ip: null })).toBeNull();
    expect(buildGeoLookup({ ...input, latitude: undefined })).toBeNull();
    expect(buildGeoLookup({ ...input, longitude: Number.NaN })).toBeNull();
  });

  it("applies schema defaults for sparse geo payloads", () => {
    const result = buildGeoLookup({
      ip: "198.51.100.7",
      latitude: 52.52,
      longitude: 13.405,
    });
    expect(result).toMatchObject({
      ip: "198.51.100.7",
      location: { city: "", region: "", country: "", timezone: "" },
      isp: "Unknown network",
    });
  });
});
