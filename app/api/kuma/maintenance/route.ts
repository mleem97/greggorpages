import { NextRequest, NextResponse } from "next/server";
import { loadDesignConfig } from "@/lib/design";
import { setKumaMaintenance, resolveKumaMaintenance } from "@/lib/kuma";

export async function POST(request: NextRequest) {
  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const body = await request.json().catch(() => ({}));
  const monitorId = body.monitorId || kuma.monitorId;

  const success = await setKumaMaintenance({
    enabled: kuma.enabled,
    baseUrl: kuma.baseUrl,
    apiKey: kuma.apiKey,
    monitorId,
  });

  if (!success) {
    return NextResponse.json(
      { error: "Failed to activate maintenance mode" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const { searchParams } = new URL(request.url);
  const monitorId = searchParams.get("monitorId") || kuma.monitorId;

  const success = await resolveKumaMaintenance({
    enabled: kuma.enabled,
    baseUrl: kuma.baseUrl,
    apiKey: kuma.apiKey,
    monitorId: monitorId ? Number(monitorId) : kuma.monitorId,
  });

  if (!success) {
    return NextResponse.json(
      { error: "Failed to resolve maintenance mode" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
