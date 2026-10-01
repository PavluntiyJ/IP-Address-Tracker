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
  it("sets production CSP without relying on a Host header", async () => {
    const response = await injectCsp(
      new Request("https://trace.example.com/"),
      contextReturning(new Response("ok")),
    );

    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
  });

  it("supports downstream responses with immutable headers", async () => {
    const response = await injectCsp(
      new Request("https://trace.example.com/redirect"),
      contextReturning(Response.redirect("https://trace.example.com/")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://trace.example.com/");
    expect(response.headers.has("Content-Security-Policy")).toBe(true);
  });

  it("recognizes IPv6 loopback during local development", async () => {
    const response = await injectCsp(
      new Request("http://[::1]:8888/", { headers: { host: "[::1]:8888" } }),
      contextReturning(new Response("ok")),
    );

    expect(response.headers.has("Content-Security-Policy")).toBe(false);
  });

  it("allows the production vector map resources and worker", async () => {
    const response = await injectCsp(
      new Request("https://trace.example.com/", {
        headers: { host: "trace.example.com" },
      }),
      contextReturning(new Response("ok")),
    );
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toContain("connect-src 'self' https://tiles.openfreemap.org");
    expect(csp).toContain("font-src 'self' data:");
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
