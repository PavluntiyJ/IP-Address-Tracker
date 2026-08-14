# Trace IP Address Tracker

[![CI](https://github.com/PavluntiyJ/IP-Address-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/PavluntiyJ/IP-Address-Tracker/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-2.0.0-ff6b35)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

Trace resolves an IP address or domain into its approximate location, timezone, and network provider, then plots the result on an interactive map.

The application is a React and TypeScript rewrite of the [Frontend Mentor IP address tracker challenge](https://www.frontendmentor.io/challenges/ip-address-tracker-I8-0yYAH0). A Cloudflare Worker proxies Geo.IPify requests so the provider credential is never shipped to the browser.

## Version 2.0

- Complete React 19 and TypeScript rewrite
- New responsive network-intelligence interface
- Persistent Leaflet map with animated coordinate transitions
- Server-side Geo.IPify proxy with input validation and restricted CORS
- Abort-safe searches and accessible loading and error states
- Runtime response validation shared by the browser and Worker
- Automated tests, strict linting, formatting, builds, and GitHub CI

## Stack

- React 19 and TypeScript
- Vite
- Leaflet and React Leaflet
- Zod runtime validation shared by the client and Worker
- Cloudflare Workers
- Vitest and Testing Library

## Architecture

```text
Browser (React) -> /api/lookup -> Cloudflare Worker -> Geo.IPify
       |                                  |
       +---------- Leaflet map            +-- private API key
```

The browser only receives normalized location data. `IPIFY_API_KEY` lives in a Cloudflare secret in production and `.dev.vars` locally; both secret locations are excluded from Git.

## Local Development

Requirements: Node.js 24.15 or newer and a [Geo.IPify](https://geo.ipify.org/) API key.

1. Install dependencies with `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace the placeholder key.
3. Start the Worker with `npm run worker:dev`.
4. In another terminal, start Vite with `npm run dev`.
5. Open `http://localhost:5173`.

Vite proxies `/api` to Wrangler on port `8787`. The initial request uses Cloudflare's connecting-IP header when available; submitting the form accepts an IPv4 address, IPv6 address, or domain.

## Checks

Run every quality gate with:

```sh
npm run check
```

Individual commands are available as `npm run format`, `npm run lint`, `npm test`, `npm run typecheck`, and `npm run build`.

The same quality gates run automatically through GitHub Actions for every push and pull request targeting `main`.

## Deployment

1. Authenticate Wrangler with `npx wrangler login`.
2. Save the provider key with `npx wrangler secret put IPIFY_API_KEY`.
3. Set `ALLOWED_ORIGIN` in `wrangler.jsonc` to the deployed frontend origin.
4. Deploy the API with `npm run worker:deploy`.
5. Set `VITE_API_URL` to the deployed Worker URL ending in `/api/lookup` when building the frontend.
6. Build the frontend with `npm run build` and deploy `dist/` to a static host.

For multiple trusted frontends, `ALLOWED_ORIGIN` accepts a comma-separated list of exact origins.

## Environment

| Variable         | Location                     | Purpose                                              |
| ---------------- | ---------------------------- | ---------------------------------------------------- |
| `IPIFY_API_KEY`  | Worker secret or `.dev.vars` | Authenticates server-side Geo.IPify requests         |
| `ALLOWED_ORIGIN` | `wrangler.jsonc`             | Restricts browser access to trusted frontend origins |
| `VITE_API_URL`   | Frontend build environment   | Points the browser at the deployed Worker endpoint   |
