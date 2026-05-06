export type AppStatus = "maintenance" | "public" | "devmode" | "testing";

export async function getAppStatus(): Promise<AppStatus> {
  const url = process.env.APP_STATUS_URL;
  if (!url) return "public";

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const text = await res.text();
    const status = text.trim().toLowerCase();
    if (["maintenance", "public", "devmode", "testing"].includes(status)) {
      return status as AppStatus;
    }
  } catch (e) {
    console.error("Failed to fetch app status:", e);
  }

  return "public";
}
