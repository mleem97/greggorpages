import ErrorDisplay from "./error-display";
import { loadDesignConfig } from "@/lib/design";
import { fetchKumaStatus } from "@/lib/kuma";

export default async function ErrorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const config = loadDesignConfig();
  const kumaStatus = await fetchKumaStatus(config.integrations.uptimeKuma);

  const info = config.errors[code];
  if (!info) {
    return (
      <ErrorDisplay
        code="404"
        info={config.errors["404"]}
        branding={config.branding}
        kumaStatus={kumaStatus}
      />
    );
  }

  return (
    <ErrorDisplay
      code={code}
      info={info}
      branding={config.branding}
      kumaStatus={kumaStatus}
    />
  );
}
