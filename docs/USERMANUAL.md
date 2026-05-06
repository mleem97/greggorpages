# greggorpages User Manual

Complete documentation for installing, configuring, and operating greggorpages.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
   - [Environment Variables](#environment-variables)
   - [design.json Reference](#designjson-reference)
4. [App Status Modes](#app-status-modes)
5. [Uptime Kuma Integration](#uptime-kuma-integration)
6. [Multi-Tenant / Proxy Setup](#multi-tenant--proxy-setup)
7. [Deploy Middleware](#deploy-middleware)
8. [API Reference](#api-reference)
9. [Docker Deployment](#docker-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

greggorpages is a Next.js 16 application that serves as a universal error page backend. It can operate in two primary modes:

1. **Static Error Pages**: Directly display beautiful error pages for any HTTP status code.
2. **App Status Gate**: Intercept all incoming requests and conditionally show maintenance, devmode, or testing screens based on an external API status.

```
User Request
    |
    v
[Reverse Proxy] ----> [greggorpages]
                            |
                    [Middleware checks APP_STATUS_URL]
                            |
            +---------------+---------------+
            |               |               |
        public         maintenance    devmode/testing
            |               |               |
    [Pass through]    [503 Page]    [Login Modal]
```

---

## Installation

### Prerequisites

- Node.js 20+
- npm or pnpm
- (Optional) Docker & Docker Compose

### Local Setup

```bash
git clone https://github.com/mleem97/greggorpages.git
cd greggorpages
npm install
```

Create a `.env.local` file:

```env
APP_STATUS_URL=https://your-domain.com/api/status
DEVMODE_PASSWORD=your-secure-password
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | *(none)* | **Required.** Master API key for all `/api/*` endpoints. If not set, all API routes return `503 Disabled`. |
| `APP_STATUS_URL` | *(none)* | URL to fetch the current app status from. Must return `public`, `maintenance`, `devmode`, or `testing`. |
| `DEVMODE_PASSWORD` | *(none)* | Password required to unlock the app in `devmode`. |
| `TESTING_PASSWORD` | *(none)* | Password required to unlock the app in `testing`. Falls back to `DEVMODE_PASSWORD` if unset. |
| `GIT_PUSH_SECRET` | *(none)* | Additional secret for authenticating `/api/git-push` webhook requests (checked after `API_KEY`). |
| `WEBHOOK_URL` | *(none)* | Optional URL to forward deploy events to after processing. |

> **Note:** These variables are server-side only and never exposed to the browser.

---

### design.json Reference

The `design.json` file in the project root controls all visual aspects of the application. If the file is missing or invalid, default values are used.

#### Colors

All Material Design 3 compatible color tokens:

```json
{
  "colors": {
    "primary": "#8aebff",
    "primaryContainer": "#22d3ee",
    "onPrimary": "#051424",
    "secondary": "#4de082",
    "secondaryContainer": "#00b55d",
    "onSecondary": "#051424",
    "tertiary": "#d5dcf6",
    "tertiaryContainer": "#b9c0da",
    "onTertiary": "#051424",
    "background": "#051424",
    "onBackground": "#d4e4fa",
    "surface": "#051424",
    "onSurface": "#d4e4fa",
    "surfaceVariant": "#273647",
    "onSurfaceVariant": "#bbc9cd",
    "surfaceContainer": "#122131",
    "surfaceContainerLow": "#0d1c2d",
    "surfaceContainerLowest": "#010f1f",
    "surfaceContainerHigh": "#1c2b3c",
    "surfaceContainerHighest": "#273647",
    "inverseSurface": "#d4e4fa",
    "inverseOnSurface": "#233143",
    "outline": "#859397",
    "outlineVariant": "#3c494c",
    "error": "#ffb4ab",
    "errorContainer": "#93000a",
    "errorDim": "#93000a",
    "onError": "#690005"
  }
}
```

#### Fonts

Define the three font families used throughout the app. Google Fonts are loaded automatically.

```json
{
  "fonts": {
    "headline": "\"Space Grotesk\", sans-serif",
    "body": "\"Inter\", sans-serif",
    "mono": "\"JetBrains Mono\", monospace"
  }
}
```

#### Shadows

Custom shadow tokens for glow effects:

```json
{
  "shadows": {
    "ambientGlow": "0 0 24px -2px rgba(138, 235, 255, 0.12)",
    "ambientGreen": "0 0 24px -2px rgba(77, 224, 130, 0.12)",
    "consoleGlow": "0 0 0 1px rgba(138, 235, 255, 0.15), 0 0 32px -4px rgba(138, 235, 255, 0.08)",
    "alertGlow": "0 0 48px -4px rgba(138, 235, 255, 0.25)"
  }
}
```

#### Effects

Visual effects and textures:

```json
{
  "effects": {
    "noiseOpacity": 0.2,
    "noiseImageUrl": "https://...",
    "glassCardBackground": "rgba(18, 33, 49, 0.8)",
    "glassCardBorder": "1px solid rgba(133, 147, 151, 0.08)",
    "heroGlow": "0 0 80px -20px rgba(138, 235, 255, 0.12)"
  }
}
```

#### Branding

All user-facing text strings:

```json
{
  "branding": {
    "brandName": "System",
    "incidentLabel": "Incident",
    "serviceStatus": "Service Status: Disrupted",
    "footerText": "Infrastructure Response",
    "returnHome": "Return Home",
    "reloadPage": "Reload Page"
  }
}
```

#### Errors

Custom error messages per HTTP status code. Unknown codes fall back to `404`.

```json
{
  "errors": {
    "404": { "title": "Not Found", "message": "..." },
    "503": { "title": "Service Unavailable", "message": "..." }
  }
}
```

#### Uptime Kuma Integration

```json
{
  "integrations": {
    "uptimeKuma": {
      "enabled": true,
      "baseUrl": "https://status.yourdomain.com",
      "statusPageSlug": "default",
      "linkToStatusPage": "https://status.yourdomain.com",
      "showLink": true,
      "apiKey": "your-kuma-api-key",
      "monitorId": "1",
      "hostMonitors": {
        "datacentermods.com": "1",
        "*.example.com": "2"
      }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `enabled` | Enable Kuma integration. |
| `baseUrl` | Base URL of your Uptime Kuma instance. |
| `statusPageSlug` | The public status page slug. |
| `linkToStatusPage` | URL shown as a clickable link in the footer. |
| `showLink` | Whether to render the status link. |
| `apiKey` | API key for maintenance control endpoints. |
| `monitorId` | Default monitor ID (fallback). |
| `hostMonitors` | Map of hostname → monitorId for multi-tenant setups. Supports wildcards (`*.example.com`). |

---

## App Status Modes

The middleware fetches `APP_STATUS_URL` on every request. The response text determines the behavior:

### `public`
- All requests pass through normally.
- Error pages are only shown for actual HTTP errors.

### `maintenance`
- All requests are rewritten to `/maintenance`.
- Returns HTTP **200** to uptime monitors (Traefik/Nginx sees a healthy backend).
- Humans see a `503` styled error page.
- The Uptime Kuma monitor is automatically switched to **maintenance** (blue) if configured.

### `devmode`
- All requests without an `app-auth` cookie are rewritten to `/locked`.
- Returns HTTP **200** to monitors.
- A floating 🔒 button appears in the bottom right.
- Clicking it opens a password modal.
- Correct password sets an `httpOnly` cookie and reloads the page.

### `testing`
- Same behavior as `devmode`, but intended for staging environments.
- Can use a separate `TESTING_PASSWORD`.

---

## Uptime Kuma Integration

### Displaying Status

When enabled, greggorpages fetches your Kuma status page and displays the overall health in the footer:

| Kuma Status | Dot Color | Message |
|-------------|-----------|---------|
| Up | 🟢 Green | "All Systems Operational" |
| Maintenance | 🔵 Blue | "Maintenance Mode" |
| Pending | ⚪ White | "Service Status: Degraded" |
| Down | 🔴 Red | "Service Status: Disrupted" |
| Unknown | 🔴 Red | "Service Status: Unknown" |

If `showLink` is enabled, the status text is clickable and links to your Kuma status page.

### Controlling Maintenance via API

You can programmatically activate/deactivate maintenance mode for a specific host's monitor:

**Activate:**
```bash
curl -X POST https://errors.yourdomain.com/api/kuma/maintenance \
  -H "Host: datacentermods.com"
```

**Deactivate:**
```bash
curl -X DELETE https://errors.yourdomain.com/api/kuma/maintenance \
  -H "Host: datacentermods.com"
```

**Override monitorId manually:**
```bash
curl -X POST https://errors.yourdomain.com/api/kuma/maintenance \
  -H "Content-Type: application/json" \
  -d '{"monitorId": "5"}'
```

---

## Multi-Tenant / Proxy Setup

When serving multiple domains from a single greggorpages instance, use `hostMonitors` to map each domain to its own Uptime Kuma monitor:

```json
{
  "hostMonitors": {
    "datacentermods.com": "1",
    "shop.example.com": "3",
    "*.staging.example.com": "4"
  }
}
```

Resolution order:
1. Exact hostname match (e.g. `datacentermods.com`).
2. Wildcard pattern match (e.g. `*.staging.example.com`).
3. Fallback to the global `monitorId`.

---

## Deploy Middleware

greggorpages can act as a deploy middleware by receiving webhook signals from your CI/CD pipeline (e.g. GitHub Actions). When a deployment starts or completes, your pipeline calls `/api/git-push` and greggorpages automatically toggles Uptime Kuma maintenance mode.

### Deployment Flow

```
Git Push
    |
    v
[GitHub Actions] ---> Build & Release Docker Image
                            |
                            v
              [Webhook / curl POST] ---> [greggorpages /api/git-push]
                                                            |
                                            +---------------+---------------+
                                            |                               |
                                    deploy-start                    deploy-complete
                                            |                               |
                                    [Kuma Maintenance ON]         [Kuma Maintenance OFF]
```

### Configuration

Set the following environment variables:

```env
API_KEY=your-master-api-key
GIT_PUSH_SECRET=your-webhook-secret
WEBHOOK_URL=https://your-other-service.com/webhook  # optional
```

### GitHub Actions Workflow Example

Add this to your repository's GitHub Actions workflow after the image is built:

```yaml
- name: Notify Deploy Start
  run: |
    curl -X POST https://errors.yourdomain.com/api/git-push \
      -H "Content-Type: application/json" \
      -H "X-API-Key: ${{ secrets.GREGGORPAGES_API_KEY }}" \
      -H "X-Git-Push-Secret: ${{ secrets.GIT_PUSH_SECRET }}" \
      -d '{
        "action": "deploy-start",
        "repository": "${{ github.repository }}",
        "ref": "${{ github.ref }}",
        "commit": "${{ github.sha }}"
      }'

# ... deploy steps ...

- name: Notify Deploy Complete
  run: |
    curl -X POST https://errors.yourdomain.com/api/git-push \
      -H "Content-Type: application/json" \
      -H "X-API-Key: ${{ secrets.GREGGORPAGES_API_KEY }}" \
      -H "X-Git-Push-Secret: ${{ secrets.GIT_PUSH_SECRET }}" \
      -d '{
        "action": "deploy-complete",
        "repository": "${{ github.repository }}",
        "ref": "${{ github.ref }}",
        "commit": "${{ github.sha }}"
      }'
```

### Actions

| Action | Behavior |
|--------|----------|
| `deploy-start` | Activates Kuma maintenance for the host's monitor. |
| `deploy-complete` | Deactivates Kuma maintenance for the host's monitor. |
| `ping` | Healthcheck. Returns current monitorId and timestamp. |

### Authentication

The webhook must include the secret token in either:
- Header: `X-Git-Push-Secret: your-secret`
- Body: `{ "secret": "your-secret" }`

### Forwarding

If `WEBHOOK_URL` is configured, greggorpages will forward the event payload to that URL after processing. This is useful for chaining notifications (e.g. to Discord, Slack, or another monitoring service).

---

## API Reference

> **Authentication:** All API endpoints require the `API_KEY` environment variable to be set. Pass the key in every request via:
> - Header: `X-API-Key: your-api-key`
> - Query parameter: `?api_key=your-api-key`
>
> If `API_KEY` is not configured, all `/api/*` routes return `503 API is disabled`.

---

### `POST /api/app-auth`

Authenticate for `devmode` or `testing` access.

**Headers:**
- `X-API-Key` — Required. Master API key.

**Request Body:**
```json
{
  "password": "your-password",
  "mode": "devmode"
}
```

**Response:**
- `200 OK` — Sets `app-auth` cookie, reload page to access.
- `401 Unauthorized` — Wrong API key or password.
- `400 Bad Request` — Missing password or invalid mode.
- `503 Service Unavailable` — `API_KEY` not configured.

---

### `POST /api/kuma/maintenance`

Activate maintenance mode for the current host's monitor.

**Headers:**
- `X-API-Key` — Required. Master API key.

**Request Body (optional):**
```json
{
  "monitorId": "5"
}
```

**Response:**
- `200 OK` — `{ "ok": true, "monitorId": "..." }`
- `401 Unauthorized` — Invalid or missing API key.
- `502 Bad Gateway` — Kuma API call failed.
- `503 Service Unavailable` — `API_KEY` not configured.

---

### `DELETE /api/kuma/maintenance`

Deactivate maintenance mode for the current host's monitor.

**Headers:**
- `X-API-Key` — Required. Master API key.

**Query Parameters (optional):**
- `monitorId` — Override the resolved monitor.

**Response:**
- `200 OK` — `{ "ok": true, "monitorId": "..." }`
- `401 Unauthorized` — Invalid or missing API key.
- `502 Bad Gateway` — Kuma API call failed.
- `503 Service Unavailable` — `API_KEY` not configured.

---

### `POST /api/git-push`

Deploy webhook endpoint. Receives signals from CI/CD pipelines to toggle maintenance mode automatically.

**Headers:**
- `X-API-Key` — Required. Master API key.
- `X-Git-Push-Secret` — Additional webhook secret (required if not in body).
- `Content-Type: application/json`

**Request Body:**
```json
{
  "action": "deploy-start",
  "repository": "owner/repo",
  "ref": "refs/heads/main",
  "commit": "abc123",
  "monitorId": "1",
  "secret": "your-webhook-secret"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `action` | Yes | `deploy-start`, `deploy-complete`, or `ping`. |
| `repository` | No | Repository name for logging. |
| `ref` | No | Git ref (branch/tag). |
| `commit` | No | Commit SHA. |
| `monitorId` | No | Override the auto-resolved monitor ID. |
| `secret` | No | Webhook secret (alternative to `X-Git-Push-Secret` header). |

**Response:**
- `200 OK` — `{ "ok": true, "action": "deploy-start", "monitorId": "..." }`
- `401 Unauthorized` — Invalid or missing API key / webhook secret.
- `400 Bad Request` — Invalid action or malformed body.
- `502 Bad Gateway` — Kuma API call failed.
- `503 Service Unavailable` — `API_KEY` not configured.

---

## Docker Deployment

### Standalone

```bash
docker run -d \
  -p 3000:3000 \
  -e APP_STATUS_URL=https://your-domain.com/api/status \
  -e DEVMODE_PASSWORD=changeme \
  ghcr.io/mleem97/greggorpages:latest
```

### Docker Compose with Traefik

```yaml
version: "3.8"

services:
  error-pages:
    image: ghcr.io/mleem97/greggorpages:latest
    container_name: error-pages
    restart: unless-stopped
    environment:
      - APP_STATUS_URL=https://datacentermods.com/api/status
      - DEVMODE_PASSWORD=${DEVMODE_PASSWORD}
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.error-pages.rule=Host(`errors.yourdomain.com`)"
      - "traefik.http.routers.error-pages.entrypoints=websecure"
      - "traefik.http.routers.error-pages.tls.certresolver=letsencrypt"

  my-app:
    image: my-app:latest
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(`my-app.yourdomain.com`)"
      - "traefik.http.routers.my-app.entrypoints=websecure"
      - "traefik.http.routers.my-app.tls.certresolver=letsencrypt"
      - "traefik.http.middlewares.my-app-errors.errors.status=400-599"
      - "traefik.http.middlewares.my-app-errors.errors.service=error-pages"
      - "traefik.http.middlewares.my-app-errors.errors.query=/{status}"
      - "traefik.http.routers.my-app.middlewares=my-app-errors"

networks:
  traefik-public:
    external: true
```

### Important: Standalone Output

The app is built with `output: 'standalone'`. In Docker, start it with:

```bash
node .next/standalone/server.js
```

The included Dockerfile already handles this correctly.

---

## Troubleshooting

### "Failed to load design.json, using defaults"
- Check that `design.json` is valid JSON.
- Ensure it is in the project root (or Docker working directory `/app`).

### Kuma status shows "Unknown"
- Verify `baseUrl` and `statusPageSlug` in `design.json`.
- Ensure the Kuma status page is public.
- Check server logs for fetch errors.

### Middleware not blocking requests
- Verify `APP_STATUS_URL` is set and reachable.
- The middleware skips static files and API routes automatically.
- Check that the status API returns lowercase text (`maintenance`, not `MAINTENANCE`).

### DevMode button not appearing
- Ensure the app is in `devmode` or `testing` status.
- Check browser cookies — if `app-auth` exists, you are already authenticated.

### `/api/*` returns 503 "API is disabled"
- The `API_KEY` environment variable is not set. All API endpoints are disabled by default until `API_KEY` is configured.

### `/api/*` returns 401
- Verify the request includes the `X-API-Key` header or `api_key` query parameter.
- Ensure the value matches the `API_KEY` environment variable exactly.

### `/api/git-push` returns 401
- Verify `API_KEY` is set (master key check comes first).
- Verify `GIT_PUSH_SECRET` is set in the environment.
- Ensure the request includes `X-Git-Push-Secret` header or `secret` in the JSON body.
- Check that the values match exactly.

### Deploy webhook not toggling Kuma
- Verify Kuma integration is enabled in `design.json` (`integrations.uptimeKuma.enabled: true`).
- Ensure `apiKey` and `monitorId` (or `hostMonitors`) are configured.
- Check server logs for Kuma API errors.
- Confirm the `Host` header in the request matches a configured `hostMonitors` entry.

---

For issues or feature requests, please open an issue on GitHub.
