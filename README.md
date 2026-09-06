# greggorpages - Universal Dynamic Error Pages

[![Docker Build & Publish](https://github.com/mleem97/greggorpages/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/mleem97/greggorpages/actions/workflows/docker-publish.yml)

A modern, high-performance, and animated error page service built with **Next.js 16**, **Framer Motion**, and **Tailwind CSS v4**. Designed to be used as a custom error page backend for reverse proxies like **Traefik**, **Nginx**, or **Caddy**.

## Features

- **Dynamic Error Pages**: Support for any HTTP status code via `/[code]` (e.g. `/404`, `/503`).
- **Traefik Access Gateway**: Reusable `ForwardAuth` service with a custom login page, local users, or delegation to the protected application's existing auth system.
- **Local Auth**: scrypt password hashes, signed `HttpOnly` sessions, host binding, login throttling and configurable identity headers.
- **App Auth Adapter**: Forward existing Cookie/Authorization credentials to an application's own verify endpoint and reuse its login/session policy.
- **App Status Gate**: External API-controlled modes: `public`, `maintenance`, `devmode`, `testing`.
- **Maintenance Mode**: Returns HTTP 200 to uptime monitors while displaying a 503 page to humans.
- **Uptime Kuma Integration**: Automatically syncs maintenance status and displays live service health.
- **Multi-Tenant Proxy**: Host-based monitor mapping for serving multiple domains from one instance.
- **Fully Themeable**: All colors, fonts, shadows, and text controlled via `design.json`.
- **Deploy Middleware**: Receive deploy signals via `/api/git-push` and automatically toggle Uptime Kuma maintenance.
- **Self-Updating Container**: Trigger `docker compose pull && up -d` remotely via `/api/self-update` with automatic maintenance mode support.
- **Docker Ready**: Optimized standalone multi-stage Dockerfile with GitHub Actions publishing.

## Quick Start

### Docker Compose

```yaml
services:
  error-pages:
    image: ghcr.io/mleem97/greggorpages:latest
    container_name: error-pages
    restart: unless-stopped
    environment:
      - APP_STATUS_URL=https://datacentermods.com/api/status
      - DEVMODE_PASSWORD=changeme
    networks:
      - traefik-public

  my-app:
    image: my-awesome-app:latest
    labels:
      - "traefik.http.middlewares.my-app-errors.errors.status=400-599"
      - "traefik.http.middlewares.my-app-errors.errors.service=error-pages"
      - "traefik.http.middlewares.my-app-errors.errors.query=/{status}"
      - "traefik.http.routers.my-app.middlewares=my-app-errors"
```

For a complete ForwardAuth example for `peer.meyermedia.eu`, including the custom login router and both authentication modes, see [Traefik Access Gateway](docs/ACCESS_GATEWAY.md).

### Local Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
```

Generate a local-access password hash with:

```bash
pnpm auth:hash
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | For admin APIs | Master API key for the administrative integration endpoints. |
| `ACCESS_AUTH_MODE` | No | `disabled`, `local`, or `app` for the Traefik Access Gateway. |
| `ACCESS_SESSION_SECRET` | Local mode | Secret used to sign local sessions; at least 32 characters. |
| `ACCESS_LOCAL_USERS_JSON` | Local mode | JSON array of local users with scrypt hashes and roles. |
| `ACCESS_LOCAL_USERNAME` | Local mode | Optional single-user shorthand. |
| `ACCESS_LOCAL_PASSWORD_HASH` | Local mode | scrypt hash for the single-user shorthand. |
| `ACCESS_APP_VERIFY_URL` | App mode | Internal endpoint that verifies the protected application's existing session. |
| `ACCESS_APP_LOGIN_URL` | App mode | Public login URL/path for the protected application. |
| `APP_STATUS_URL` | No | External API returning `public`, `maintenance`, `devmode`, or `testing`. |
| `DEVMODE_PASSWORD` | No | Password for the existing `devmode` access gate. |
| `TESTING_PASSWORD` | No | Password for `testing` access (falls back to `DEVMODE_PASSWORD`). |
| `GIT_PUSH_SECRET` | No | Additional secret for `/api/git-push` webhook authentication. |
| `WEBHOOK_URL` | No | Optional URL to forward deploy events to. |
| `DEPLOY_BASE_PATH` | No | Base directory for self-update deploy paths (default: `/opt/docker-infra`). |
| `ALLOWED_DEPLOY_PATHS` | No | Comma-separated whitelist of allowed deploy paths for self-update. |

See `.env.example` and [docs/ACCESS_GATEWAY.md](docs/ACCESS_GATEWAY.md) for all Access Gateway options.

### design.json

All visual design tokens are controlled via `design.json` in the project root. If the file is missing, sensible defaults are used.

See the [User Manual](docs/USERMANUAL.md) for the full existing error-page/status configuration reference.

## App Status Modes

| Mode | Behavior | Monitor HTTP |
|------|----------|--------------|
| `public` | Normal operation | 200 |
| `maintenance` | Shows 503 page to all visitors | 200 (rewrite) |
| `devmode` | Shows login modal; password unlocks access | 200 (rewrite) |
| `testing` | Shows login modal; password unlocks access | 200 (rewrite) |

The App Status Gate is separate from the Traefik Access Gateway. The former controls greggorpages itself; the latter authenticates requests before Traefik forwards them to another application.

## API Endpoints

Administrative endpoints require `API_KEY` as documented below. `/api/access/*` is intentionally separate because Traefik and browser sessions must be able to reach the authentication gateway without the administrative API key.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/access/verify` | Any | Session/app credentials | Internal Traefik ForwardAuth verification endpoint. |
| `/api/access/login` | `POST` | Public, throttled | Local-mode login; sets the signed session cookie. |
| `/api/access/logout` | `POST` | Session cookie | Clears the local session cookie. |
| `/api/access/session` | `GET` | Session cookie | Returns non-sensitive local session state. |
| `/api/app-auth` | `POST` | `API_KEY` | Authenticate for the existing devmode/testing access gate. |
| `/api/kuma/maintenance` | `POST` / `DELETE` | `API_KEY` | Activate/deactivate maintenance for the current host's monitor. |
| `/api/git-push` | `POST` | `API_KEY` + secret | Deploy webhook and maintenance integration. |
| `/api/self-update` | `POST` | `API_KEY` | Trigger the configured self-update workflow. |

## Deployment

Pushed automatically to GitHub Container Registry via GitHub Actions.

```bash
docker pull ghcr.io/mleem97/greggorpages:latest
```

## Documentation

- [Traefik Access Gateway](docs/ACCESS_GATEWAY.md) - ForwardAuth, custom login, local users and protected-app auth delegation.
- [User Manual](docs/USERMANUAL.md) - Existing setup, configuration, and API reference.

---

Built with precision for the gregFramework ecosystem.
