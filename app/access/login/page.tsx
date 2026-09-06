import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AccessLoginForm from "@/components/AccessLoginForm";
import {
  buildAppLoginUrl,
  getAccessAuthMode,
  getSessionCookieName,
  sanitizeReturnTo,
  verifyLocalSessionToken,
} from "@/lib/access-auth";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function AccessLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = sanitizeReturnTo(
    Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo
  );
  const mode = getAccessAuthMode();

  if (mode === "app") {
    const loginUrl = buildAppLoginUrl(returnTo);
    if (loginUrl) redirect(loginUrl);
  }

  if (mode === "local") {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    const audience =
      headerStore.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase() ||
      headerStore.get("host")?.toLowerCase() ||
      "localhost";
    const session = verifyLocalSessionToken(
      cookieStore.get(getSessionCookieName())?.value,
      audience
    );

    if (session) redirect(returnTo);
  }

  const brand = process.env.ACCESS_LOGIN_BRAND?.trim() || "Meyer Media";
  const title =
    mode === "disabled"
      ? "Access Gateway nicht konfiguriert"
      : mode === "app"
        ? "Anmeldung nicht konfiguriert"
        : process.env.ACCESS_LOGIN_TITLE?.trim() || "Geschützter Bereich";
  const subtitle =
    mode === "disabled"
      ? "Setze ACCESS_AUTH_MODE=local oder ACCESS_AUTH_MODE=app, bevor diese Route verwendet wird."
      : mode === "app"
        ? "ACCESS_APP_LOGIN_URL fehlt. Hinterlege die Login-Route der geschützten Anwendung."
        : process.env.ACCESS_LOGIN_SUBTITLE?.trim() ||
          "Melde dich mit einem berechtigten Konto an, um fortzufahren.";

  if (mode !== "local") {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <section className="glass-card w-full max-w-xl rounded-3xl border border-outline-variant/25 p-8 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            {brand} · Access Gateway
          </p>
          <h1 className="mt-4 font-headline text-3xl font-semibold text-on-surface">
            {title}
          </h1>
          <p className="mt-4 leading-7 text-on-surface-variant">{subtitle}</p>
        </section>
      </main>
    );
  }

  return (
    <AccessLoginForm
      returnTo={returnTo}
      title={title}
      subtitle={subtitle}
      brand={brand}
    />
  );
}
