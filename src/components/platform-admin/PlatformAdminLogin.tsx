import React, { useState } from "react";
import { Loader2, Lock, Mail, Shield } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { API_BASE } from "@/lib/api";
import { platformApi } from "@/lib/platformApi";
import {
  AuthAmbientBackground,
  authFieldClass,
  authGlassCardClass,
} from "@/components/AuthAmbientBackground";

type Props = {
  /** Shown when a signed-in restaurant account tried to open /admin */
  deniedMessage?: string | null;
};

/**
 * Dedicated Platform Admin sign-in - stays on /admin (does not use /auth restaurant login).
 */
export default function PlatformAdminLogin({ deniedMessage }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(deniedMessage || null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/platform/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      const data = contentType.includes("application/json") && raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        const errBody = data.data || data;
        throw new Error(
          errBody.error || data.error || data.message || `Login failed (${res.status})`,
        );
      }

      const payload = data.data && typeof data.data === "object" ? data.data : data;
      const access = payload.tokens?.access || payload.access || data.tokens?.access || data.access;
      const refresh = payload.tokens?.refresh || payload.refresh || data.tokens?.refresh || data.refresh;
      const user = payload.user || data.user;
      if (!access) throw new Error("Login succeeded but no access token returned");

      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);
      if (user) localStorage.setItem("user", JSON.stringify(user));

      try {
        const me = await platformApi.me();
        if (!me.is_platform_operator) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          throw new Error(
            "This account is not a platform operator. Restaurant admins cannot access /admin — use /auth instead.",
          );
        }
      } catch (err) {
        const status = (err as Error & { status?: number })?.status;
        if (status === 403 || status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          throw new Error(
            "This account is not a platform operator. Restaurant admins cannot access /admin — use /auth instead.",
          );
        }
        throw err;
      }

      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#060809] text-white">
      <AuthAmbientBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col lg:flex-row">
        {/* Left brand panel */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="max-w-lg">
            <BrandLogo size="lg" />
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#00E676]">
              Mizan Ops
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Platform Admin
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
              Internal console for operators — tenants, billing, agent quality, and system health.
            </p>

            <ul className="mt-10 hidden space-y-4 sm:block">
              {[
                "Cross-tenant visibility and support tools",
                "Agent conversations, turns, and accuracy metrics",
                "WhatsApp, billing, and platform health monitoring",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00E676]/15 text-[#00E676]">
                    <Shield className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right sign-in panel */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
          <div className="w-full max-w-[480px]">
            <div className="mb-6 lg:hidden text-center">
              <p className="text-sm text-slate-400">Sign in with your operator account</p>
            </div>

            <form onSubmit={handleSubmit} className={`${authGlassCardClass} space-y-5`}>
              <div className="hidden lg:block">
                <h2 className="text-xl font-semibold text-white">Sign in</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Dedicated operator credentials — not your restaurant login
                </p>
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ops@heymizan.ai"
                    className={`${authFieldClass} h-12 w-full pl-10 pr-3 text-sm`}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${authFieldClass} h-12 w-full pl-10 pr-3 text-sm`}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00E676] text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(0,230,118,0.25)] hover:bg-[#00F77B] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in to Platform Admin
              </button>

              <p className="text-center text-xs text-slate-500">
                Restaurant managers sign in at{" "}
                <a href="/auth" className="font-medium text-[#00E676] hover:underline">
                  /auth
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
