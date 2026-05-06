"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

interface DevModeButtonProps {
  mode: "devmode" | "testing";
}

export default function DevModeButton({ mode }: DevModeButtonProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Authentication failed");
      }

      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-surface-container-high border border-outline-variant/30 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 backdrop-blur-md"
        aria-label="Unlock application"
      >
        <Lock className="w-6 h-6 text-primary" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-xl p-8 border border-outline-variant/20">
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
              {mode === "testing" ? "Testing Access" : "Dev Access"}
            </h2>
            <p className="text-on-surface-variant mb-6">
              This application is currently locked. Please enter the access
              password to continue.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-3 border border-outline-variant/30 rounded-lg text-on-surface font-medium hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
