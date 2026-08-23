# Trace IP Address Tracker

[![Live Demo](https://img.shields.io/badge/live-Netlify-00c7b7?logo=netlify&logoColor=white)](https://ip-address-application.netlify.app/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/b8207f2b-aa9c-4253-93fa-3154424811a0/deploy-status)](https://app.netlify.com/projects/ip-address-application/deploys)
[![CI](https://github.com/PavluntiyJ/IP-Address-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/PavluntiyJ/IP-Address-Tracker/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-2.0.1-ff6b35)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

Trace resolves an IP address or domain into its approximate location, timezone, and network provider, then plots the result on an interactive map.

**[Open the live application](https://ip-address-application.netlify.app/)**

Version 2.0 is a complete React and TypeScript rebuild of the [Frontend Mentor IP address tracker challenge](https://www.frontendmentor.io/challenges/ip-address-tracker-I8-0yYAH0). The production application and protected API run on Netlify's free plan.

## Features

- Automatic lookup of the visitor's public IP address
- IPv4, IPv6, and domain searches
- Approximate city, region, timezone, ISP, and coordinates
- Persistent Leaflet map with animated coordinate transitions
- Responsive desktop and mobile interface
- Accessible loading, validation, and error states
- Abort-safe requests that prevent stale searches from replacing newer results
- Per-visitor request throttling that protects the provider quota
- Server-side Geo.IPify access with no API credential in the browser bundle
- Runtime response validation shared by every deployment target
- Automated tests, strict linting, formatting, builds, and GitHub CI

## Architecture

```text
React + Vite client
        |
        | GET /api/lookup?q=example.com
        v
Netlify Function adapter
        |
        v
Shared validated lookup handler ---- server-only API key
        |
        v
Geo.IPify API ----> normalized JSON ----> Leaflet map
```

Production uses a same-origin Netlify Function, so the browser does not need CORS configuration or a public provider key. The same handler can also be deployed as a Cloudflare Worker through `wrangler.jsonc`.

## Stack

- React 19 and TypeScript 6
- Vite 8
- Leaflet and React Leaflet
- Zod runtime validation
- Netlify Functions and optional Cloudflare Workers
- Vitest and Testing Library
- ESLint and Prettier
- GitHub Actions and Dependabot

## Project Structure

```text
src/                    React application, map, styles, and tests
shared/lookup.ts        Shared API response schema and type
worker/index.ts         Platform-neutral lookup handler
netlify/functions/      Production Netlify adapter
public/                 Static public assets
netlify.toml            Build, functions, and security-header config
wrangler.jsonc          Optional Cloudflare Worker config
```

## Local Development

Requirements: Node.js 24.15 or newer and a [Geo.IPify](https://geo.ipify.org/) API key.

### Netlify Environment

This is the closest match to production:

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `IPIFY_API_KEY` in `.env`.
4. Start the application with `npx netlify-cli dev`.
5. Open `http://localhost:8888`.

### Cloudflare Environment

The optional Worker setup runs in two terminals:

1. Copy `.dev.vars.example` to `.dev.vars` and set `IPIFY_API_KEY`.
2. Start the Worker with `npm run worker:dev`.
3. Start Vite with `npm run dev`.
4. Open `http://localhost:5173`.

Vite proxies `/api` to Wrangler on port `8787` in this mode.

## Quality Checks

Run every local quality gate with:

```sh
npm run check
```

This runs formatting validation, typed ESLint rules, all tests, TypeScript project builds, and the Vite production build. The same command runs automatically through GitHub Actions for every push and pull request targeting `main`.

## Deployment

### Netlify

The repository is connected to Netlify and configured by `netlify.toml`. Every push to `main` builds the frontend and deploys the `lookup` function automatically.

For a new Netlify site:

1. Import this GitHub repository in Netlify.
2. Add `IPIFY_API_KEY` as a Netlify environment variable.
3. Deploy; Netlify reads the build command, publish directory, function directory, Node version, and security headers from `netlify.toml`.

### Cloudflare Worker

Cloudflare deployment is optional:

1. Authenticate with `npx wrangler login`.
2. Save the key with `npx wrangler secret put IPIFY_API_KEY`.
3. Configure `ALLOWED_ORIGIN` in `wrangler.jsonc`.
4. Deploy with `npm run worker:deploy`.
5. Set frontend `VITE_API_URL` to the Worker URL ending in `/api/lookup`.

Both Netlify and Cloudflare provide free tiers suitable for this project.

## Environment Variables

| Variable               | Location                                                   | Purpose                                                  |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `IPIFY_API_KEY`        | Netlify environment, `.env`, Worker secret, or `.dev.vars` | Authenticates server-side Geo.IPify requests             |
| `ALLOWED_ORIGIN`       | `wrangler.jsonc`                                           | Restricts browser access when using Cloudflare           |
| `VITE_API_URL`         | Frontend build environment                                 | Overrides the default same-origin `/api/lookup` endpoint |
| `RATE_LIMIT_MAX`       | Netlify environment or Worker vars                         | Requests allowed per client inside the window (default 30) |
| `RATE_LIMIT_WINDOW_MS` | Netlify environment or Worker vars                         | Rate-limit window length in milliseconds (default 60000)   |

## Security

- Provider credentials are excluded from Git and never embedded in frontend assets.
- Search input is length-limited and validated before contacting Geo.IPify.
- Per-client rate limiting with `Retry-After` guards the provider quota from abuse.
- Repeated explicit queries are briefly cacheable at the edge; personal lookups are never cached.
- Provider failures are converted into safe client-facing messages.
- API responses use `Cache-Control: no-store` unless explicitly queried.
- Production responses include a restrictive Content-Security-Policy, HSTS, frame, MIME-sniffing, referrer, and browser-permission headers.
- Web fonts are self-hosted; no third-party font requests leave the client.
- CORS is restricted when the standalone Cloudflare deployment is used.
