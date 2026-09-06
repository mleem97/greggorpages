import { NextRequest, NextResponse } from "next/server";
import {
  getSessionCookieName,
  getSessionCookieOptions,
  isRequestOriginAllowed,
} from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    getSessionCookieName(),
    "",
    getSessionCookieOptions(0)
  );
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
