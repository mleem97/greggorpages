export interface KumaStatus {
  overallStatus: "up" | "down" | "maintenance" | "pending" | "unknown";
  message: string;
  link: string | null;
}

export async function fetchKumaStatus(config: {
  enabled: boolean;
  baseUrl: string;
  statusPageSlug: string;
  linkToStatusPage: string;
}): Promise<KumaStatus | null> {
  if (!config.enabled) return null;

  try {
    const res = await fetch(
      `${config.baseUrl}/api/status-page/${config.statusPageSlug}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error(`Kuma API error: ${res.status}`);

    const data = await res.json();
    const groups = data.publicGroupList || [];
    const monitors = groups.flatMap(
      (g: any) => g.monitorList || []
    ) as Array<any>;

    if (monitors.length === 0) {
      return {
        overallStatus: "unknown",
        message: "Service Status: Unknown",
        link: config.linkToStatusPage,
      };
    }

    let hasMaintenance = false;
    let hasDown = false;
    let hasPending = false;

    for (const monitor of monitors) {
      const hb = monitor.heartBeatList?.[0];
      const status = hb?.status ?? monitor.status;

      if (status === 0) hasDown = true;
      else if (status === 2) hasPending = true;
      else if (status === 3) hasMaintenance = true;
    }

    if (hasMaintenance) {
      return {
        overallStatus: "maintenance",
        message: "Maintenance Mode",
        link: config.linkToStatusPage,
      };
    }
    if (hasDown) {
      return {
        overallStatus: "down",
        message: "Service Status: Disrupted",
        link: config.linkToStatusPage,
      };
    }
    if (hasPending) {
      return {
        overallStatus: "pending",
        message: "Service Status: Degraded",
        link: config.linkToStatusPage,
      };
    }

    return {
      overallStatus: "up",
      message: "All Systems Operational",
      link: config.linkToStatusPage,
    };
  } catch (e) {
    console.error("Uptime Kuma fetch failed:", e);
    return {
      overallStatus: "unknown",
      message: "Service Status: Unknown",
      link: config.linkToStatusPage,
    };
  }
}

export async function setKumaMaintenance(config: {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  monitorId?: string | number;
}): Promise<boolean> {
  if (!config.enabled || !config.apiKey || !config.monitorId) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `${config.baseUrl}/api/monitors/${config.monitorId}/pause`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch (e) {
    console.error("Failed to set Kuma maintenance:", e);
    return false;
  }
}

export async function resolveKumaMaintenance(config: {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  monitorId?: string | number;
}): Promise<boolean> {
  if (!config.enabled || !config.apiKey || !config.monitorId) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `${config.baseUrl}/api/monitors/${config.monitorId}/resume`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch (e) {
    console.error("Failed to resolve Kuma maintenance:", e);
    return false;
  }
}
