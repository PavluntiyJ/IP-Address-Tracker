import worker from "../../worker/index";

export default function lookup(request: Request) {
  return worker.fetch(request, {
    IPIFY_API_KEY: process.env.IPIFY_API_KEY ?? "",
    ALLOWED_ORIGIN: process.env.URL,
  });
}

export const config = {
  path: "/api/lookup",
};
