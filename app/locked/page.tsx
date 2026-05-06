import ErrorDisplay from "../[code]/error-display";
import { loadDesignConfig } from "@/lib/design";
import { getAppStatus } from "@/lib/getAppStatus";
import DevModeButton from "@/components/DevModeButton";

export default async function LockedPage() {
  const config = loadDesignConfig();
  const status = await getAppStatus();
  const mode = status === "testing" ? "testing" : "devmode";

  return (
    <>
      <ErrorDisplay
        code="401"
        info={config.errors["401"]}
        branding={config.branding}
      />
      <DevModeButton mode={mode} />
    </>
  );
}
