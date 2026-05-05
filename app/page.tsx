import ErrorDisplay from "./[code]/error-display";
import { loadDesignConfig } from "@/lib/design";
import { fetchKumaStatus } from "@/lib/kuma";

export default async function HomePage() {
  const config = loadDesignConfig();
  const kumaStatus = await fetchKumaStatus(config.integrations.uptimeKuma);

  return (
    <ErrorDisplay
      code="404"
      info={config.errors["404"]}
      branding={config.branding}
      kumaStatus={kumaStatus}
    />
  );
}
