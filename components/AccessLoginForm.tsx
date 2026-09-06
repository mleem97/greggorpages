"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

interface AccessLoginFormProps {
  returnTo: string;
  title: string;
  subtitle: string;
  brand: string;
}

export default function AccessLoginForm({
  returnTo,
  title,
  subtitle,
  brand,
}: AccessLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/access/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, returnTo }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Anmeldung fehlgeschlagen");
      }

      window.location.assign(payload.redirectTo || returnTo || "/");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Anmeldung fehlgeschlagen"
      );
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-outline-variant/25 bg-surface-container-low/75 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden min-h-[620px] flex-col justify-between border-r border-outline-variant/20 p-10 lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                <ShieldCheck className="h-4 w-4" />
                Access Gateway
              </div>
              <h1 className="mt-10 max-w-lg font-headline text-5xl font-semibold leading-tight text-on-surface">
                Geschützter Zugriff, bevor die Anwendung antwortet.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant">
                Die Freigabe erfolgt zentral über Traefik ForwardAuth. Erst nach
                erfolgreicher Prüfung wird der ursprüngliche Request an den
                geschützten Dienst weitergeleitet.
              </p>
            </div>

            <div className="space-y-4 font-mono text-sm text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Session-Cookie: HttpOnly + Secure
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Passwörter: scrypt-Hash, kein Klartext
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Autorisierung: vor dem Upstream
              </div>
            </div>
          </div>

          <div className="flex min-h-[620px] items-center p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-9 lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Access Gateway
                </div>
              </div>

              <div className="mb-8">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
                  {brand}
                </p>
                <h2 className="mt-3 font-headline text-3xl font-semibold text-on-surface sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-3 leading-6 text-on-surface-variant">{subtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface">
                    Benutzername
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest/80 px-4 py-3.5 text-on-surface outline-none transition focus:border-primary/70 focus:ring-4 focus:ring-primary/10"
                    placeholder="name@example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface">
                    Passwort
                  </span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant/60" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest/80 py-3.5 pl-12 pr-4 text-on-surface outline-none transition focus:border-primary/70 focus:ring-4 focus:ring-primary/10"
                      placeholder="••••••••••••"
                    />
                  </div>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Prüfe Zugriff…
                    </>
                  ) : (
                    <>
                      Anmelden
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center font-mono text-xs leading-5 text-on-surface-variant/70">
                Unberechtigte Zugriffsversuche können protokolliert und limitiert werden.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
