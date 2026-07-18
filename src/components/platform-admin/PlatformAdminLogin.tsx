import React, { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { API_BASE } from "@/lib/api";
import { platformApi } from "@/lib/platformApi";

type Props = {
  /** Shown when a signed-in restaurant account tried to open /admin */
  deniedMessage?: string | null;
};

/**
 * Dedicated Platform Admin sign-in — stays on /admin (does not use /auth restaurant login).
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
        throw new Error(
          data.error || data.message || `Login failed (${res.status})`,
        );
      }

      const access = data.tokens?.access || data.access;
      const refresh = data.tokens?.refresh || data.refresh;
      if (!access) throw new Error("Login succeeded but no access token returned");

      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      try {
        const me = await platformApi.me();
        if (!me.is_platform_operator) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          throw new Error(
            "This account is not a platform operator. Restaurant admins cannot access /admin.",
          );
        }
      } catch (err) {
        const status = (err as Error & { status?: number })?.status;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (status === 403 || status === 401) {
          throw new Error(
            "This account is not a platform operator. Restaurant admins cannot access /admin.",
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
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(0,230,118,0.14), transparent 55%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="md" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00C853]">
            Mizan Ops
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Platform Admin
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
            Sign in with a dedicated operator account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-lg shadow-slate-200/50 dark:shadow-black/40 space-y-5"
        >
          {error ? (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Email
            </span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@heymizan.ai"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pl-10 pr-3 text-sm outline-none focus:border-[#00E676] focus:ring-2 focus:ring-[#00E676]/25 placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Password
            </span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pl-10 pr-3 text-sm outline-none focus:border-[#00E676] focus:ring-2 focus:ring-[#00E676]/25"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00E676] text-sm font-semibold text-slate-900 hover:bg-[#00F77B] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
