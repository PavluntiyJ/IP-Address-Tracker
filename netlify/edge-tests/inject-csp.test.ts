// @vitest-environment node
import type { Context } from "@netlify/edge-functions";
import { describe, expect, it } from "vitest";
import injectCsp from "../edge-functions/inject-csp";

function contextReturning(response: Response) {
  return {
    next: () => Promise.resolve(response),
  } as unknown as Context;
}

describe("injectCsp", () => {
  it("allows the production vector map resources and worker", async () => {
    const response = await injectCsp(
      new Request("https://trace.example.com/", {
        headers: { host: "trace.example.com" },
      }),
      contextReturning(new Response("ok")),
    );
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toContain("connect-src 'self' https://tiles.openfreemap.org");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).not.toContain("cartocdn.com");
    expect(csp).not.toContain("tile.openstreetmap.org");
  });

  it("does not inject production CSP during local development", async () => {
    const response = await injectCsp(
      new Request("http://localhost:8888/", {
        headers: { host: "localhost:8888" },
      }),
      contextReturning(new Response("ok")),
    );

    expect(response.headers.has("Content-Security-Policy")).toBe(false);
  });
});
