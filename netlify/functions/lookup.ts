import worker from "../../worker/index";

export default function lookup(request: Request) {
  return worker.fetch(request, {
    IPIFY_API_KEY: process.env.IPIFY_API_KEY ?? "",
    ALLOWED_ORIGIN: process.env.URL,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  });
}

export const config = {
  path: "/api/lookup",
};
