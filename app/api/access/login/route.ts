import { NextRequest, NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  createLocalSessionToken,
  getAccessAuthMode,
  getForwardedHost,
  getSessionCookieName,
  getSessionCookieOptions,
  isRequestOriginAllowed,
  sanitizeReturnTo,
  verifyLocalCredentials,
} from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (getAccessAuthMode() !== "local") {
    return NextResponse.json(
      { error: "Local authentication is not enabled" },
      { status: 409 }
    );
  }

  if (!isRequestOriginAllowed(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const returnTo = sanitizeReturnTo(payload.returnTo);

  if (!username || username.length > 256 || !password || password.length > 4096) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const rateLimit = checkLoginRateLimit(request, username);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const user = verifyLocalCredentials(username, password);
  if (!user) {
    const response = NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const token = createLocalSessionToken(user, getForwardedHost(request));
  if (!token) {
    return NextResponse.json(
      { error: "ACCESS_SESSION_SECRET is missing or too short" },
      { status: 503 }
    );
  }

  clearLoginRateLimit(request, username);

  const response = NextResponse.json({
    ok: true,
    redirectTo: returnTo,
    user: {
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
    },
  });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
