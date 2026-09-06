# Traefik Access Gateway

`greggorpages` can act as a reusable Traefik `ForwardAuth` service in front of
arbitrary HTTP applications. It supports two modes:

- `ACCESS_AUTH_MODE=local`: greggorpages owns the login page, local user list,
  password verification and signed session cookie.
- `ACCESS_AUTH_MODE=app`: greggorpages delegates credential/session validation
  to the protected application's existing authentication endpoint.

The gateway is fail-closed. If the mode, session secret or application verify
URL is missing, `/api/access/verify` returns an error instead of allowing the
request.

## ForwardAuth contract

Traefik calls the internal endpoint:

```text
http://greggorpages:3000/api/access/verify
```

A `2xx` response grants access. Any other response is returned to the client by
Traefik. Successful requests can receive the following trusted headers:

```text
X-Auth-Authenticated: true
X-Auth-User: mmeyer
X-Auth-Subject: mmeyer
X-Auth-Email: admin@example.com
X-Auth-Name: Administrator
X-Auth-Roles: admin,network
```

Do not expose the protected application's container port directly to the
Internet. An application may only trust these headers if Traefik is its only
external ingress path.

## Local mode

### 1. Generate a session secret

```bash
openssl rand -base64 48
```

Store the result as `ACCESS_SESSION_SECRET`. Do not commit it.

### 2. Generate password hashes

```bash
pnpm auth:hash
```

The helper prompts for a password without echoing it and prints a scrypt hash.
Passwords are never stored by greggorpages in plaintext.

Single user:

```env
ACCESS_AUTH_MODE=local
ACCESS_SESSION_SECRET=<random-secret>
ACCESS_LOCAL_USERNAME=mmeyer
ACCESS_LOCAL_PASSWORD_HASH=scrypt$32768$8$1$...
ACCESS_LOCAL_ROLES=admin,network
```

Multiple users:

```yaml
environment:
  ACCESS_AUTH_MODE: local
  ACCESS_SESSION_SECRET: ${ACCESS_SESSION_SECRET}
  ACCESS_LOCAL_USERS_JSON: >-
    [{"username":"mmeyer","passwordHash":"scrypt$32768$8$1$...","roles":["admin","network"]},{"username":"operator","passwordHash":"scrypt$32768$8$1$...","roles":["viewer"]}]
```

When a scrypt hash is written directly into a Compose YAML value, Docker
Compose may interpret `$` as interpolation. Prefer an `env_file`, Coolify
secret/environment value, or escape literal dollar signs as `$$` in inline
Compose values.

Local sessions are signed, stateless tokens in an `HttpOnly` cookie. In
production, a host-only `__Host-greggor-access` cookie is used unless a cookie
name/domain is explicitly configured. Logout clears the browser cookie; global
server-side revocation of an already-issued stateless token requires rotating
`ACCESS_SESSION_SECRET` or waiting for the configured session expiry.

### 3. Traefik Compose labels

Both services must share a Docker network, for example `traefik-public`.
`/api/access/verify` does not need a public router; Traefik reaches it directly
on the Docker network.

```yaml
services:
  greggorpages:
    image: ghcr.io/mleem97/greggorpages:latest
    restart: unless-stopped
    environment:
      ACCESS_AUTH_MODE: local
      ACCESS_SESSION_SECRET: ${ACCESS_SESSION_SECRET}
      ACCESS_LOCAL_USERS_JSON: ${ACCESS_LOCAL_USERS_JSON}
      ACCESS_LOGIN_BRAND: Meyer Media
      ACCESS_LOGIN_TITLE: Peer Administration
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.peer-access-ui.rule=Host(`peer.meyermedia.eu`) && (PathPrefix(`/access`) || Path(`/api/access/login`) || Path(`/api/access/logout`) || Path(`/api/access/session`))"
      - "traefik.http.routers.peer-access-ui.entrypoints=websecure"
      - "traefik.http.routers.peer-access-ui.tls=true"
      - "traefik.http.routers.peer-access-ui.priority=1000"
      - "traefik.http.routers.peer-access-ui.service=greggorpages"
      - "traefik.http.services.greggorpages.loadbalancer.server.port=3000"

  peer:
    image: your-peer-app:latest
    restart: unless-stopped
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.peer.rule=Host(`peer.meyermedia.eu`)"
      - "traefik.http.routers.peer.entrypoints=websecure"
      - "traefik.http.routers.peer.tls=true"
      - "traefik.http.routers.peer.middlewares=peer-forward-auth@docker"
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.address=http://greggorpages:3000/api/access/verify"
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.authRequestHeaders=Cookie,Authorization,Accept,User-Agent,Sec-Fetch-Mode"
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.authResponseHeaders=X-Auth-Authenticated,X-Auth-User,X-Auth-Subject,X-Auth-Email,X-Auth-Name,X-Auth-Roles"
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.preserveLocationHeader=true"
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.trustForwardHeader=false"
      # Traefik >= 3.6.9: recommended DoS guard for the tiny auth response.
      - "traefik.http.middlewares.peer-forward-auth.forwardauth.maxResponseBodySize=65536"

networks:
  traefik-public:
    external: true
```

Traefik always supplies the original method, protocol, host, URI and source IP
to the ForwardAuth target as `X-Forwarded-*` metadata. `preserveLocationHeader`
is enabled so the gateway's absolute redirect to the public login URL is
forwarded unchanged.

`trustForwardHeader` is explicitly `false` in the example because Traefik is
assumed to be the Internet-facing entry point. Current Traefik versions warn if
this setting is omitted. If another trusted proxy/CDN is in front of Traefik and
its forwarded headers must be honored, configure that proxy's IP ranges under
the Traefik entry point's `forwardedHeaders.trustedIPs` and then set the
ForwardAuth middleware's `trustForwardHeader=true`. Do not enable it without a
trusted-header boundary.

## Use the protected application's auth system

Set:

```env
ACCESS_AUTH_MODE=app
ACCESS_APP_VERIFY_URL=http://peer:3000/api/auth/forward-auth
ACCESS_APP_LOGIN_URL=/login
```

The protected application's verify endpoint should:

1. Read its normal session cookie and/or `Authorization` header.
2. Return `200` or another `2xx` status when authenticated.
3. Return `401` or `403` when authentication is missing/invalid.
4. Optionally return `X-Auth-User`, `X-Auth-Email`, `X-Auth-Roles`, etc.

The gateway forwards `Cookie`, `Authorization` and Traefik's original
`X-Forwarded-*` request metadata to the configured verify endpoint. A static
server-to-server API key can additionally be configured with
`ACCESS_APP_VERIFY_API_KEY`.

### Avoid login loops

If `ACCESS_APP_LOGIN_URL=/login` belongs to the protected application, that
login route must bypass ForwardAuth. Give it a higher-priority router without
the middleware:

```yaml
labels:
  - "traefik.http.routers.peer-auth-public.rule=Host(`peer.meyermedia.eu`) && (PathPrefix(`/login`) || PathPrefix(`/api/auth`))"
  - "traefik.http.routers.peer-auth-public.entrypoints=websecure"
  - "traefik.http.routers.peer-auth-public.tls=true"
  - "traefik.http.routers.peer-auth-public.priority=1100"
  - "traefik.http.routers.peer-auth-public.service=peer"
```

Adjust the public auth paths to the protected application's actual login,
callback, WebAuthn/passkey, password-reset and session endpoints.

## Response behavior

`ACCESS_UNAUTHORIZED_MODE=auto` is the default:

- browser navigations receive a `302` to the configured login page;
- API/fetch requests receive `401` instead of HTML/login redirects.

Set `redirect` or `401` to force one behavior globally.

## Security notes

- Keep greggorpages and the protected service on a private Docker network.
- Do not publish the protected service port to the host unless separately
  firewalled.
- Use HTTPS for the public router.
- Use a random `ACCESS_SESSION_SECRET` with at least 32 characters.
- Keep local sessions short enough for the risk level of the protected app.
- Local login throttling is in-process. With multiple greggorpages replicas,
  add a shared/edge rate limiter.
- Only copy identity headers that the protected application actually needs.
- If the protected application already has robust MFA/passkey/session handling,
  prefer `ACCESS_AUTH_MODE=app` so that policy remains centralized there.
