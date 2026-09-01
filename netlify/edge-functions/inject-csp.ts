import type { Context } from "@netlify/edge-functions";

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' https://tile.openstreetmap.org",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export default async function injectCsp(request: Request, context: Context) {
  const response = await context.next();
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (host && !localHosts.has(host)) {
    response.headers.set("Content-Security-Policy", csp);
  }
  return response;
}
