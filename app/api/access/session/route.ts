import { NextRequest, NextResponse } from "next/server";
import { getAccessAuthMode, getLocalIdentity } from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = getAccessAuthMode();
  const identity = mode === "local" ? getLocalIdentity(request) : null;
  const response = NextResponse.json({
    mode,
    authenticated: Boolean(identity),
    user: identity
      ? {
          username: identity.username,
          displayName: identity.displayName,
          roles: identity.roles,
        }
      : null,
  });
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
