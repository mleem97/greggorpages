import {
  createHmac,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";

export type AccessAuthMode = "disabled" | "local" | "app";

export interface AccessIdentity {
  sub: string;
  username: string;
  email?: string;
  displayName?: string;
  roles: string[];
  iat: number;
  exp: number;
  aud: string;
  jti: string;
  v: 1;
}

interface LocalUser {
  username: string;
  passwordHash: string;
  roles: string[];
  email?: string;
  displayName?: string;
  disabled?: boolean;
}

interface RateState {
  count: number;
  resetAt: number;
}

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 8;
const DEFAULT_LOGIN_WINDOW_SECONDS = 60 * 15;
const DEFAULT_LOGIN_MAX_ATTEMPTS = 8;
const DEFAULT_LOGIN_MAX_ATTEMPTS_PER_IP = 30;
const DUMMY_SCRYPT_HASH =
  "scrypt$32768$8$1$Z3JlZ2dvcnBhZ2VzLWR1bW15LXNhbHQ$wnDzbsoEp-1yA73ItVaoADg0CVj-99JQChg7X9gsWCbJsE1khZ6bucqCtjCRE6BsbOujTX8YvKx1kHssveXMow";

const rateLimitStore = new Map<string, RateState>();
const MAX_RATE_LIMIT_KEYS = 10_000;

function numberFromEnv(
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function booleanFromEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

function cleanIdentityValue(value: unknown, maxLength = 256): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\r\n\0]/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function normalizeRoles(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      source
        .map((role) => cleanIdentityValue(role, 128))
        .filter(
          (role): role is string =>
            Boolean(role) && /^[A-Za-z0-9:_./@+-]+$/.test(role as string)
        )
    )
  ).slice(0, 64);
}

export function getAccessAuthMode(): AccessAuthMode {
  const mode = process.env.ACCESS_AUTH_MODE?.trim().toLowerCase();

  if (["local", "builtin", "internal"].includes(mode ?? "")) return "local";
  if (["app", "external", "upstream"].includes(mode ?? "")) return "app";
  return "disabled";
}

export function getForwardedHost(request: NextRequest): string {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host")) ??
    request.nextUrl.host
  )
    .toLowerCase()
    .slice(0, 255);
}

export function getForwardedProto(request: NextRequest): "http" | "https" {
  const value = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  return value === "http" ? "http" : "https";
}

export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  if (/[\r\n\0]/.test(trimmed)) return "/";
  return trimmed.slice(0, 2048);
}

export function getOriginalRequestUri(request: NextRequest): string {
  return sanitizeReturnTo(
    firstHeaderValue(request.headers.get("x-forwarded-uri")) ?? "/"
  );
}

export function getAccessLoginPath(): string {
  const configured = process.env.ACCESS_LOGIN_PATH?.trim();
  if (!configured || !configured.startsWith("/") || configured.startsWith("//")) {
    return "/access/login";
  }
  return configured;
}

export function buildLocalLoginUrl(request: NextRequest): string {
  const host = getForwardedHost(request);
  const proto = getForwardedProto(request);
  const returnTo = getOriginalRequestUri(request);
  const url = new URL(getAccessLoginPath(), `${proto}://${host}`);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function buildAppLoginUrl(returnTo: string): string | null {
  const configured = process.env.ACCESS_APP_LOGIN_URL?.trim();
  if (!configured) return null;

  if (!booleanFromEnv("ACCESS_APP_LOGIN_APPEND_RETURN_TO", true)) {
    return configured;
  }

  const parameter =
    cleanIdentityValue(process.env.ACCESS_APP_LOGIN_RETURN_PARAM, 64) ?? "returnTo";
  const separator = configured.includes("?") ? "&" : "?";
  return `${configured}${separator}${encodeURIComponent(parameter)}=${encodeURIComponent(
    sanitizeReturnTo(returnTo)
  )}`;
}

export function shouldRedirectUnauthorized(request: NextRequest): boolean {
  const mode = process.env.ACCESS_UNAUTHORIZED_MODE?.trim().toLowerCase() ?? "auto";
  if (mode === "redirect") return true;
  if (["401", "unauthorized", "json"].includes(mode)) return false;

  const fetchMode = request.headers.get("sec-fetch-mode")?.toLowerCase();
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  return fetchMode === "navigate" || accept.includes("text/html");
}

export function getSessionMaxAge(): number {
  return numberFromEnv(
    "ACCESS_SESSION_MAX_AGE_SECONDS",
    DEFAULT_SESSION_MAX_AGE,
    300,
    60 * 60 * 24 * 30
  );
}

export function getSessionCookieName(): string {
  const configured = cleanIdentityValue(process.env.ACCESS_COOKIE_NAME, 128);
  if (configured) return configured;

  const hasDomain = Boolean(process.env.ACCESS_COOKIE_DOMAIN?.trim());
  if (process.env.NODE_ENV === "production" && !hasDomain) {
    return "__Host-greggor-access";
  }

  return "greggor-access";
}

export function getSessionCookieOptions(maxAge = getSessionMaxAge()) {
  const domain = cleanIdentityValue(process.env.ACCESS_COOKIE_DOMAIN, 255);
  const sameSiteValue = process.env.ACCESS_COOKIE_SAMESITE?.trim().toLowerCase();
  const sameSite: "lax" | "strict" | "none" =
    sameSiteValue === "strict" || sameSiteValue === "none"
      ? sameSiteValue
      : "lax";

  const cookieName = getSessionCookieName();
  const effectiveDomain = cookieName.startsWith("__Host-") ? undefined : domain;
  const secure =
    cookieName.startsWith("__Host-") ||
    cookieName.startsWith("__Secure-") ||
    sameSite === "none" ||
    booleanFromEnv(
      "ACCESS_COOKIE_SECURE",
      process.env.NODE_ENV === "production"
    );

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge,
    ...(effectiveDomain ? { domain: effectiveDomain } : {}),
  };
}

function getSessionSecret(): string | null {
  const secret = process.env.ACCESS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return secret;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeSignatureEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "base64url");
    const b = Buffer.from(right, "base64url");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createLocalSessionToken(
  user: Omit<LocalUser, "passwordHash" | "disabled">,
  audience: string
): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: AccessIdentity = {
    sub: user.username,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    iat: now,
    exp: now + getSessionMaxAge(),
    aud: audience.toLowerCase(),
    jti: randomUUID(),
    v: 1,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function verifyLocalSessionToken(
  token: string | undefined,
  audience: string
): AccessIdentity | null {
  if (!token) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  if (!safeSignatureEqual(signature, signPayload(encoded, secret))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<AccessIdentity>;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload.v !== 1 ||
      typeof payload.username !== "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      typeof payload.aud !== "string" ||
      typeof payload.jti !== "string" ||
      !Array.isArray(payload.roles) ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) {
      return null;
    }

    if (
      booleanFromEnv("ACCESS_SESSION_BIND_HOST", true) &&
      payload.aud.toLowerCase() !== audience.toLowerCase()
    ) {
      return null;
    }

    return {
      sub: cleanIdentityValue(payload.sub, 256) ?? payload.username,
      username: cleanIdentityValue(payload.username, 256) ?? "unknown",
      email: cleanIdentityValue(payload.email, 320),
      displayName: cleanIdentityValue(payload.displayName, 256),
      roles: normalizeRoles(payload.roles),
      iat: payload.iat,
      exp: payload.exp,
      aud: payload.aud,
      jti: payload.jti,
      v: 1,
    };
  } catch {
    return null;
  }
}

export function getLocalIdentity(request: NextRequest): AccessIdentity | null {
  return verifyLocalSessionToken(
    request.cookies.get(getSessionCookieName())?.value,
    getForwardedHost(request)
  );
}

function loadLocalUsers(): LocalUser[] {
  const json = process.env.ACCESS_LOCAL_USERS_JSON?.trim();
  const singleUsername = cleanIdentityValue(process.env.ACCESS_LOCAL_USERNAME, 256);
  const singleHash = process.env.ACCESS_LOCAL_PASSWORD_HASH?.trim();

  let rawUsers: unknown[] = [];

  if (json) {
    try {
      const parsed = JSON.parse(json);
      rawUsers = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (singleUsername && singleHash) {
    rawUsers = [
      {
        username: singleUsername,
        passwordHash: singleHash,
        roles: normalizeRoles(process.env.ACCESS_LOCAL_ROLES ?? "admin"),
        email: cleanIdentityValue(process.env.ACCESS_LOCAL_EMAIL, 320),
        displayName: cleanIdentityValue(process.env.ACCESS_LOCAL_DISPLAY_NAME, 256),
      },
    ];
  }

  return rawUsers
    .map((raw): LocalUser | null => {
      if (!raw || typeof raw !== "object") return null;
      const value = raw as Record<string, unknown>;
      const username = cleanIdentityValue(value.username, 256);
      const passwordHash = cleanIdentityValue(value.passwordHash, 1024);
      if (!username || !passwordHash) return null;

      return {
        username,
        passwordHash,
        roles: normalizeRoles(value.roles),
        email: cleanIdentityValue(value.email, 320),
        displayName: cleanIdentityValue(value.displayName, 256),
        disabled: value.disabled === true,
      };
    })
    .filter((user): user is LocalUser => user !== null);
}

function verifyScryptPassword(password: string, encodedHash: string): boolean {
  try {
    const [algorithm, nRaw, rRaw, pRaw, saltRaw, hashRaw, extra] =
      encodedHash.split("$");
    if (algorithm !== "scrypt" || !saltRaw || !hashRaw || extra) return false;

    const N = Number.parseInt(nRaw, 10);
    const r = Number.parseInt(rRaw, 10);
    const p = Number.parseInt(pRaw, 10);
    if (
      !Number.isInteger(N) ||
      !Number.isInteger(r) ||
      !Number.isInteger(p) ||
      N < 16_384 ||
      N > 1_048_576 ||
      (N & (N - 1)) !== 0 ||
      r < 1 ||
      r > 32 ||
      p < 1 ||
      p > 16
    ) {
      return false;
    }

    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");
    if (salt.length < 16 || expected.length < 32 || expected.length > 128) {
      return false;
    }

    const maxmem = Math.max(64 * 1024 * 1024, 128 * N * r + 2 * 1024 * 1024);
    const actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem,
    });

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function verifyLocalCredentials(
  usernameInput: string,
  password: string
): Omit<LocalUser, "passwordHash" | "disabled"> | null {
  const username = usernameInput.trim().toLowerCase();
  const users = loadLocalUsers();
  const matched = users.find(
    (user) => user.username.toLowerCase() === username
  );
  const hashToCheck = matched?.passwordHash ?? users[0]?.passwordHash ?? DUMMY_SCRYPT_HASH;
  const validPassword = verifyScryptPassword(password, hashToCheck);

  if (!matched || matched.disabled || !validPassword) return null;

  return {
    username: matched.username,
    roles: matched.roles,
    email: matched.email,
    displayName: matched.displayName,
  };
}

export function getClientIp(request: NextRequest): string {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    "unknown"
  ).slice(0, 128);
}

function pruneRateLimitStore(now: number): void {
  if (rateLimitStore.size < MAX_RATE_LIMIT_KEYS) return;

  for (const [key, state] of rateLimitStore) {
    if (state.resetAt <= now) rateLimitStore.delete(key);
  }

  if (rateLimitStore.size < MAX_RATE_LIMIT_KEYS) return;

  const removeCount = Math.max(1, Math.floor(MAX_RATE_LIMIT_KEYS * 0.1));
  let removed = 0;
  for (const key of rateLimitStore.keys()) {
    rateLimitStore.delete(key);
    removed += 1;
    if (removed >= removeCount) break;
  }
}

function consumeRateLimit(key: string, maxAttempts: number, windowMs: number) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  if (current.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function checkLoginRateLimit(request: NextRequest, username: string) {
  const windowSeconds = numberFromEnv(
    "ACCESS_LOGIN_RATE_WINDOW_SECONDS",
    DEFAULT_LOGIN_WINDOW_SECONDS,
    60,
    60 * 60 * 24
  );
  const maxPerAccount = numberFromEnv(
    "ACCESS_LOGIN_MAX_ATTEMPTS",
    DEFAULT_LOGIN_MAX_ATTEMPTS,
    1,
    1000
  );
  const maxPerIp = numberFromEnv(
    "ACCESS_LOGIN_MAX_ATTEMPTS_PER_IP",
    DEFAULT_LOGIN_MAX_ATTEMPTS_PER_IP,
    maxPerAccount,
    5000
  );
  const ip = getClientIp(request);
  const normalizedUsername = username.trim().toLowerCase().slice(0, 256);
  const windowMs = windowSeconds * 1000;

  const ipResult = consumeRateLimit(`ip:${ip}`, maxPerIp, windowMs);
  if (!ipResult.allowed) return ipResult;

  return consumeRateLimit(
    `account:${ip}:${normalizedUsername}`,
    maxPerAccount,
    windowMs
  );
}

export function clearLoginRateLimit(request: NextRequest, username: string): void {
  const ip = getClientIp(request);
  rateLimitStore.delete(`account:${ip}:${username.trim().toLowerCase().slice(0, 256)}`);
}

export function isRequestOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const parsed = new URL(origin);
    return parsed.host.toLowerCase() === getForwardedHost(request);
  } catch {
    return false;
  }
}

export function identityResponseHeaders(identity: AccessIdentity): Headers {
  const headers = new Headers();
  headers.set("X-Auth-User", identity.username);
  headers.set("X-Auth-Subject", identity.sub);
  headers.set("X-Auth-Roles", identity.roles.join(","));
  headers.set("X-Auth-Email", identity.email ?? "");
  headers.set("X-Auth-Name", identity.displayName ?? "");
  headers.set("X-Auth-Authenticated", "true");
  return headers;
}
