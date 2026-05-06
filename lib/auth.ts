import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.API_KEY;

  if (!expected) {
    return NextResponse.json(
      { error: "API is disabled. API_KEY not configured." },
      { status: 503 }
    );
  }

  const headerKey = request.headers.get("x-api-key");
  const queryKey = request.nextUrl.searchParams.get("api_key");
  const provided = headerKey || queryKey;

  if (!provided || provided !== expected) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid or missing API key." },
      { status: 401 }
    );
  }

  return null;
}
