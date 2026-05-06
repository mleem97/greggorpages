import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { password, mode } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }

    if (mode === "devmode") {
      const validPassword = process.env.DEVMODE_PASSWORD;
      if (!validPassword) {
        return NextResponse.json(
          { error: "DevMode not configured" },
          { status: 500 }
        );
      }
      if (password !== validPassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    } else if (mode === "testing") {
      const validPassword =
        process.env.TESTING_PASSWORD || process.env.DEVMODE_PASSWORD;
      if (!validPassword) {
        return NextResponse.json(
          { error: "Testing not configured" },
          { status: 500 }
        );
      }
      if (password !== validPassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("app-auth", mode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
