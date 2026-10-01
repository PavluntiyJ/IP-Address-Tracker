import type { Context } from "@netlify/edge-functions";

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' blob: data:",
  "connect-src 'self' https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export default async function injectCsp(request: Request, context: Context) {
  const response = await context.next();
  if (localHosts.has(new URL(request.url).hostname)) return response;

  const securedResponse = new Response(response.body, response);
  securedResponse.headers.set("Content-Security-Policy", csp);
  return securedResponse;
}
