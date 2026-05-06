import ErrorDisplay from "../[code]/error-display";
import { loadDesignConfig } from "@/lib/design";

export default function MaintenancePage() {
  const config = loadDesignConfig();
  return (
    <ErrorDisplay
      code="503"
      info={config.errors["503"]}
      branding={config.branding}
    />
  );
}
