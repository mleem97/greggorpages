import { NextRequest, NextResponse } from "next/server";
import { loadDesignConfig, getMonitorIdForHost } from "@/lib/design";
import { setKumaMaintenance, resolveKumaMaintenance } from "@/lib/kuma";

export interface GitPushPayload {
  action: "deploy-start" | "deploy-complete" | "ping";
  repository?: string;
  ref?: string;
  commit?: string;
  monitorId?: string | number;
  message?: string;
  secret?: string;
}

function validateSecret(request: NextRequest, body: GitPushPayload): boolean {
  const expected = process.env.GIT_PUSH_SECRET;
  if (!expected) {
    console.error("GIT_PUSH_SECRET not configured");
    return false;
  }

  const headerSecret = request.headers.get("x-git-push-secret");
  if (headerSecret === expected) return true;

  const bodySecret = body.secret;
  if (bodySecret === expected) return true;

  return false;
}

async function forwardWebhook(payload: GitPushPayload): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Webhook forward failed:", e);
  }
}

export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || "";

  let body: GitPushPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!validateSecret(request, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const monitorId =
    body.monitorId || getMonitorIdForHost(config, host) || kuma.monitorId;

  switch (body.action) {
    case "deploy-start": {
      if (kuma.enabled && monitorId) {
        const success = await setKumaMaintenance({
          enabled: kuma.enabled,
          baseUrl: kuma.baseUrl,
          apiKey: kuma.apiKey,
          monitorId,
        });

        await forwardWebhook({ ...body, message: "maintenance-activated" });

        if (!success) {
          return NextResponse.json(
            { error: "Failed to activate maintenance", monitorId },
            { status: 502 }
          );
        }
      }

      return NextResponse.json({
        ok: true,
        action: "deploy-start",
        monitorId,
        message: body.message || "Deployment started, maintenance activated",
      });
    }

    case "deploy-complete": {
      if (kuma.enabled && monitorId) {
        const success = await resolveKumaMaintenance({
          enabled: kuma.enabled,
          baseUrl: kuma.baseUrl,
          apiKey: kuma.apiKey,
          monitorId,
        });

        await forwardWebhook({ ...body, message: "maintenance-resolved" });

        if (!success) {
          return NextResponse.json(
            { error: "Failed to resolve maintenance", monitorId },
            { status: 502 }
          );
        }
      }

      return NextResponse.json({
        ok: true,
        action: "deploy-complete",
        monitorId,
        message: body.message || "Deployment complete, maintenance resolved",
      });
    }

    case "ping": {
      return NextResponse.json({
        ok: true,
        action: "ping",
        monitorId,
        timestamp: new Date().toISOString(),
      });
    }

    default: {
      return NextResponse.json(
        { error: "Invalid action. Use: deploy-start, deploy-complete, ping" },
        { status: 400 }
      );
    }
  }
}
