import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { loadDesignConfig, getMonitorIdForHost } from "@/lib/design";
import {
  setKumaMaintenance,
  resolveKumaMaintenance,
} from "@/lib/kuma";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, normalize } from "path";

function isPathAllowed(
  requestedPath: string,
  basePath: string,
  allowedPaths?: string[]
): boolean {
  const resolvedRequested = normalize(resolve(requestedPath));
  const resolvedBase = normalize(resolve(basePath));

  if (!resolvedRequested.startsWith(resolvedBase)) {
    return false;
  }

  if (allowedPaths && allowedPaths.length > 0) {
    return allowedPaths.some((p) => {
      const rp = normalize(resolve(p));
      return resolvedRequested.startsWith(rp);
    });
  }

  return true;
}

function findComposeFile(dir: string): string | null {
  const candidates = [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ];
  for (const file of candidates) {
    const full = resolve(dir, file);
    if (existsSync(full)) return full;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const deployPath = request.headers.get("x-deploy-path");
  if (!deployPath) {
    return NextResponse.json(
      { error: "Missing X-Deploy-Path header" },
      { status: 400 }
    );
  }

  const maintenanceMode = request.headers.get("x-maintenance-mode") === "true";
  const host = request.headers.get("host") || "";

  const basePath = process.env.DEPLOY_BASE_PATH || "/opt/docker-infra";
  const allowedPathsEnv = process.env.ALLOWED_DEPLOY_PATHS;
  const allowedPaths = allowedPathsEnv
    ? allowedPathsEnv.split(",").map((p) => p.trim())
    : undefined;

  if (!isPathAllowed(deployPath, basePath, allowedPaths)) {
    return NextResponse.json(
      { error: "Deploy path not allowed", path: deployPath, basePath },
      { status: 403 }
    );
  }

  if (!existsSync(deployPath)) {
    return NextResponse.json(
      { error: "Deploy path does not exist", path: deployPath },
      { status: 404 }
    );
  }

  const composeFile = findComposeFile(deployPath);
  const config = loadDesignConfig();
  const kuma = config.integrations.uptimeKuma;
  const monitorId =
    getMonitorIdForHost(config, host) || kuma.monitorId;

  let kumaActivated = false;
  let output = "";

  try {
    // --- 1. Optional: Activate Maintenance ---
    if (maintenanceMode && kuma.enabled && monitorId) {
      const success = await setKumaMaintenance({
        enabled: kuma.enabled,
        baseUrl: kuma.baseUrl,
        apiKey: kuma.apiKey,
        monitorId,
      });
      if (success) kumaActivated = true;
    }

    // --- 2. Run Update ---
    if (composeFile) {
      const fileFlag = `-f "${composeFile}"`;
      const pullOutput = execSync(
        `docker compose ${fileFlag} pull 2>&1`,
        { cwd: deployPath, encoding: "utf-8", timeout: 120000 }
      );
      const upOutput = execSync(
        `docker compose ${fileFlag} up -d 2>&1`,
        { cwd: deployPath, encoding: "utf-8", timeout: 120000 }
      );
      output = pullOutput + "\n" + upOutput;
    } else {
      const folderName = deployPath.split("/").pop() || "app";
      output = execSync(
        `docker pull $(docker inspect --format='{{.Config.Image}}' "${folderName}" 2>/dev/null || echo "${folderName}") 2>&1 || echo "No running container found, skipping standalone pull"`,
        { encoding: "utf-8", timeout: 120000 }
      );
    }

    // --- 3. Optional: Deactivate Maintenance ---
    if (kumaActivated) {
      await resolveKumaMaintenance({
        enabled: kuma.enabled,
        baseUrl: kuma.baseUrl,
        apiKey: kuma.apiKey,
        monitorId,
      });
    }

    return NextResponse.json({
      ok: true,
      path: deployPath,
      composeFile: composeFile || null,
      maintenanceMode,
      kumaToggled: kumaActivated,
      output: output.trim(),
    });
  } catch (error: any) {
    // Ensure we resolve maintenance even on error
    if (kumaActivated) {
      try {
        await resolveKumaMaintenance({
          enabled: kuma.enabled,
          baseUrl: kuma.baseUrl,
          apiKey: kuma.apiKey,
          monitorId,
        });
      } catch (e) {
        console.error("Failed to resolve maintenance after error:", e);
      }
    }

    return NextResponse.json(
      {
        error: "Self-update failed",
        path: deployPath,
        maintenanceMode,
        message: error.message,
        stderr: error.stderr?.toString(),
      },
      { status: 500 }
    );
  }
}
