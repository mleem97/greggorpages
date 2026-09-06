import { NextRequest, NextResponse } from "next/server";
import {
  buildAppLoginUrl,
  buildLocalLoginUrl,
  getAccessAuthMode,
  getForwardedHost,
  getForwardedProto,
  getLocalIdentity,
  getOriginalRequestUri,
  identityResponseHeaders,
  shouldRedirectUnauthorized,
} from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function unauthorized(request: NextRequest, loginUrl?: string | null): NextResponse {
  if (shouldRedirectUnauthorized(request) && loginUrl) {
    return noStore(NextResponse.redirect(toPublicUrl(request, loginUrl), 302));
  }

  return noStore(
    NextResponse.json(
      { error: "Unauthorized", login: loginUrl ?? undefined },
      { status: 401 }
    )
  );
}

function copyConfiguredIdentityHeaders(source: Headers, destination: Headers): void {
  const configured =
    process.env.ACCESS_APP_RESPONSE_HEADERS?.trim() ||
    "X-Auth-Authenticated,X-Auth-User,X-Auth-Subject,X-Auth-Email,X-Auth-Name,X-Auth-Roles";

  for (const name of configured.split(",").map((value) => value.trim())) {
    if (!name || !/^[A-Za-z0-9-]+$/.test(name)) continue;
    const value = source.get(name) ?? "";
    destination.set(name, value.replace(/[\r\n\0]/g, "").slice(0, 4096));
  }
}

function toPublicUrl(request: NextRequest, candidate: string): URL {
  const publicBase = `${getForwardedProto(request)}://${getForwardedHost(request)}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    url = new URL(candidate, publicBase);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return new URL("/", publicBase);
  }

  return url;
}

async function verifyWithApp(request: NextRequest): Promise<NextResponse> {
  const verifyUrl = process.env.ACCESS_APP_VERIFY_URL?.trim();
  if (!verifyUrl) {
    return noStore(
      NextResponse.json(
        { error: "ACCESS_APP_VERIFY_URL is not configured" },
        { status: 503 }
      )
    );
  }

  let target: URL;
  try {
    target = new URL(verifyUrl);
  } catch {
    return noStore(
      NextResponse.json({ error: "Invalid ACCESS_APP_VERIFY_URL" }, { status: 503 })
    );
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return noStore(
      NextResponse.json({ error: "Unsupported app verify URL protocol" }, { status: 503 })
    );
  }

  const headers = new Headers();
  for (const name of [
    "cookie",
    "authorization",
    "accept",
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-uri",
    "x-forwarded-method",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const apiKey = process.env.ACCESS_APP_VERIFY_API_KEY?.trim();
  const apiKeyHeader =
    process.env.ACCESS_APP_VERIFY_API_KEY_HEADER?.trim() || "X-Forward-Auth-Key";
  if (apiKey && /^[A-Za-z0-9-]+$/.test(apiKeyHeader)) {
    headers.set(apiKeyHeader, apiKey);
  }

  const timeoutMs = Math.min(
    30_000,
    Math.max(250, Number.parseInt(process.env.ACCESS_APP_VERIFY_TIMEOUT_MS ?? "5000", 10) || 5000)
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

    if (upstream.ok) {
      const responseHeaders = new Headers();
      copyConfiguredIdentityHeaders(upstream.headers, responseHeaders);
      responseHeaders.set("X-Auth-Authenticated", "true");
      return noStore(new NextResponse(null, { status: 200, headers: responseHeaders }));
    }

    const returnTo = getOriginalRequestUri(request);
    const configuredLoginUrl = buildAppLoginUrl(returnTo);
    const upstreamLocation = upstream.headers.get("location");
    const loginUrl = configuredLoginUrl || upstreamLocation;

    if (upstream.status >= 300 && upstream.status < 400 && upstreamLocation && !configuredLoginUrl) {
      return noStore(NextResponse.redirect(toPublicUrl(request, upstreamLocation), 302));
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return unauthorized(request, loginUrl);
    }

    return noStore(
      NextResponse.json(
        { error: "Authentication service rejected the request" },
        { status: upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502 }
      )
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return noStore(
      NextResponse.json(
        { error: timedOut ? "Authentication service timed out" : "Authentication service unavailable" },
        { status: 503 }
      )
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const mode = getAccessAuthMode();

  if (mode === "disabled") {
    return noStore(
      NextResponse.json(
        { error: "Access gateway is disabled. Set ACCESS_AUTH_MODE." },
        { status: 503 }
      )
    );
  }

  if (mode === "app") {
    return verifyWithApp(request);
  }

  const identity = getLocalIdentity(request);
  if (!identity) {
    return unauthorized(request, buildLocalLoginUrl(request));
  }

  return noStore(
    new NextResponse(null, {
      status: 200,
      headers: identityResponseHeaders(identity),
    })
  );
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
