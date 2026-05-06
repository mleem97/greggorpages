import { NextRequest, NextResponse } from "next/server";
import { loadDesignConfig, getMonitorIdForHost } from "@/lib/design";
import { setKumaMaintenance, resolveKumaMaintenance } from "@/lib/kuma";

export async function POST(request: NextRequest) {
  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const host = request.headers.get("host") || "";

  const body = await request.json().catch(() => ({}));
  const monitorId =
    body.monitorId || getMonitorIdForHost(config, host) || kuma.monitorId;

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

  return NextResponse.json({ ok: true, monitorId });
}

export async function DELETE(request: NextRequest) {
  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const host = request.headers.get("host") || "";

  const { searchParams } = new URL(request.url);
  const monitorId =
    searchParams.get("monitorId") ||
    getMonitorIdForHost(config, host) ||
    kuma.monitorId;

  const success = await resolveKumaMaintenance({
    enabled: kuma.enabled,
    baseUrl: kuma.baseUrl,
    apiKey: kuma.apiKey,
    monitorId: monitorId ? Number(monitorId) : undefined,
  });

  if (!success) {
    return NextResponse.json(
      { error: "Failed to resolve maintenance mode" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, monitorId });
}
