# greggorpages - Universal Dynamic Error Pages

A modern, high-performance, and animated error page service built with **Next.js 16**, **Framer Motion**, and **Tailwind CSS v4**. Designed to be used as a custom error page backend for reverse proxies like **Traefik**.

## Features

- 🌑 **Premium Dark Mode** by default.
- ⚡ **Dynamic Routing**: Supports any HTTP status code via `/error/[code]`.
- 🎨 **Modern Design**: Inspired by the Luminescent/gregFramework aesthetic with glassmorphism and glow effects.
- 🎬 **Smooth Animations**: Powered by Framer Motion.
- 🐳 **Docker Ready**: Highly optimized standalone multi-stage Dockerfile.

## Usage with Traefik

To use `greggorpages` with Traefik, deploy the container and configure the `errors` middleware.

### 1. Docker Compose Snippet

```yaml
services:
  error-pages:
    image: ghcr.io/mleem97/greggorpages:latest
    container_name: error-pages
    restart: unless-stopped
    # Use environment variables for basic branding (TBD)
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

### 2. How it works
Traefik's `errors` middleware will catch any response with a status code in the specified range (e.g., 400-599) and redirect the user to the `error-pages` service. The `{status}` placeholder ensures the user sees the correct animated page for their specific error.

## Customization

The design follows a strict design-token system in `app/globals.css`. You can customize the look by overriding the Tailwind v4 theme variables.

### Environment Variables (Planned)
- `NEXT_PUBLIC_BRAND_NAME`: Change the title prefix (Default: "System").
- `NEXT_PUBLIC_FOOTER_TEXT`: Customize the footer branding.

## Deployment

Pushed automatically to GitHub Container Registry via GitHub Actions.

```bash
docker pull ghcr.io/mleem97/greggorpages:latest
```

---
Built with precision for the gregFramework ecosystem.
