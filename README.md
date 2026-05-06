# greggorpages - Universal Dynamic Error Pages

[![Docker Build & Publish](https://github.com/mleem97/greggorpages/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/mleem97/greggorpages/actions/workflows/docker-publish.yml)

A modern, high-performance, and animated error page service built with **Next.js 16**, **Framer Motion**, and **Tailwind CSS v4**. Designed to be used as a custom error page backend for reverse proxies like **Traefik**, **Nginx**, or **Caddy**.

## Features

- **Dynamic Error Pages**: Support for any HTTP status code via `/[code]` (e.g. `/404`, `/503`).
- **App Status Gate**: External API-controlled modes: `public`, `maintenance`, `devmode`, `testing`.
- **Maintenance Mode**: Returns HTTP 200 to uptime monitors while displaying a 503 page to humans.
- **Uptime Kuma Integration**: Automatically syncs maintenance status and displays live service health.
- **Multi-Tenant Proxy**: Host-based monitor mapping for serving multiple domains from one instance.
- **Fully Themeable**: All colors, fonts, shadows, and text controlled via `design.json`.
- **Deploy Middleware**: Receive deploy signals via `/api/git-push` and automatically toggle Uptime Kuma maintenance.
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

### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_STATUS_URL` | No | External API returning `public`, `maintenance`, `devmode`, or `testing`. |
| `DEVMODE_PASSWORD` | No | Password for `devmode` access. |
| `TESTING_PASSWORD` | No | Password for `testing` access (falls back to `DEVMODE_PASSWORD`). |
| `GIT_PUSH_SECRET` | No | Secret token for `/api/git-push` webhook authentication. |
| `WEBHOOK_URL` | No | Optional URL to forward deploy events to. |

### design.json

All visual design tokens are controlled via `design.json` in the project root. If the file is missing, sensible defaults are used.

See the [User Manual](docs/USERMANUAL.md) for the full configuration reference.

## App Status Modes

| Mode | Behavior | Monitor HTTP |
|------|----------|--------------|
| `public` | Normal operation | 200 |
| `maintenance` | Shows 503 page to all visitors | 200 (rewrite) |
| `devmode` | Shows login modal; password unlocks access | 200 (rewrite) |
| `testing` | Shows login modal; password unlocks access | 200 (rewrite) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/app-auth` | `POST` | Authenticate for devmode/testing access. |
| `/api/kuma/maintenance` | `POST` | Activate maintenance for the current host's monitor. |
| `/api/kuma/maintenance` | `DELETE` | Deactivate maintenance for the current host's monitor. |
| `/api/git-push` | `POST` | Deploy webhook. Start/complete deployments and auto-toggle Kuma maintenance. |

## Deployment

Pushed automatically to GitHub Container Registry via GitHub Actions.

```bash
docker pull ghcr.io/mleem97/greggorpages:latest
```

## Documentation

- [User Manual](docs/USERMANUAL.md) - Complete setup, configuration, and API reference.

---

Built with precision for the gregFramework ecosystem.
