// @vitest-environment node
import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "./rateLimit";

describe("rate limit storage", () => {
  it("bounds active clients and accepts new clients after buckets expire", () => {
    for (let index = 0; index < 5000; index++) {
      expect(consumeRateLimit(`client-${index}`, 2, 60_000, 0).allowed).toBe(
        true,
      );
    }

    expect(consumeRateLimit("overflow", 2, 60_000, 0)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(consumeRateLimit("client-0", 2, 60_000, 0).allowed).toBe(true);
    expect(consumeRateLimit("client-0", 2, 60_000, 0).allowed).toBe(false);
    expect(consumeRateLimit("overflow", 2, 60_000, 60_000).allowed).toBe(true);
  });
});
