import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.match(
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/
    )
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/api/app-auth" ||
    pathname === "/maintenance" ||
    pathname === "/locked"
  ) {
    return NextResponse.next();
  }

  const statusUrl = process.env.APP_STATUS_URL;
  let status = "public";

  if (statusUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(statusUrl, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      status = (await res.text()).trim().toLowerCase();
    } catch (e) {
      console.error("Status fetch failed:", e);
      status = "public";
    }
  }

  if (status === "maintenance") {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }

  if (status === "devmode" || status === "testing") {
    const authCookie = request.cookies.get("app-auth");
    if (!authCookie) {
      return NextResponse.rewrite(new URL("/locked", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
