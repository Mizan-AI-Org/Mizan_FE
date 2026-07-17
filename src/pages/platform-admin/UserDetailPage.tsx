import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { platformApi, type PlatformMe } from "@/lib/platformApi";
import { ArrowLeft, KeyRound, Loader2, Unlock } from "lucide-react";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsLink,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { me } = useOutletContext<{ me: PlatformMe }>();
  const qc = useQueryClient();
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-user", id],
    queryFn: () => platformApi.user(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform-user", id] });
    qc.invalidateQueries({ queryKey: ["platform-users"] });
  };

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => platformApi.patchUser(id, body),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e: Error) => setActionErr(e.message),
  });

  const unlock = useMutation({
    mutationFn: () => platformApi.unlockUser(id),
    onSuccess: () => {
      setActionErr(null);
      setActionMsg("Account unlocked. The user can sign in again.");
      invalidate();
    },
    onError: (e: Error) => setActionErr(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: (pwd: string) => platformApi.resetUserPassword(id, pwd),
    onSuccess: () => {
      setActionErr(null);
      setActionMsg("Password updated. Share it with the user securely.");
      setShowReset(false);
      setPassword("");
      setConfirm("");
      invalidate();
    },
    onError: (e: Error) => setActionErr(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-rose-600">{(error as Error)?.message || "User not found"}</div>
    );
  }

  const locked = !!data.is_locked;
  const busy = patch.isPending || unlock.isPending || resetPassword.isPending;

  return (
    <div className={opsPage}>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Users
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={opsTitle}>
            {data.first_name} {data.last_name}
          </h2>
          <p className={opsSubtitle}>{data.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={opsBtnGhost}
            disabled={busy}
            onClick={() => {
              setActionMsg(null);
              setActionErr(null);
              setShowReset((v) => !v);
            }}
          >
            <KeyRound className="h-4 w-4" />
            Reset password
          </button>
          <button
            type="button"
            className={opsBtnGhost}
            disabled={busy || !locked}
            title={locked ? "Clear lockout from failed logins" : "Account is not locked"}
            onClick={() => {
              setActionMsg(null);
              setActionErr(null);
              unlock.mutate();
            }}
          >
            {unlock.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
            Unlock account
          </button>
          <button
            type="button"
            className={opsBtnGhost}
            disabled={busy}
            onClick={() => patch.mutate({ is_active: !data.is_active })}
          >
            {data.is_active ? "Deactivate" : "Activate"}
          </button>
          {me.is_superuser ? (
            <button
              type="button"
              className={opsBtnGhost}
              disabled={busy}
              onClick={() => patch.mutate({ is_staff: !data.is_staff })}
            >
              {data.is_staff ? "Revoke ops access" : "Grant ops access"}
            </button>
          ) : null}
        </div>
      </header>

      {actionMsg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-3 py-2">
          {actionMsg}
        </p>
      ) : null}
      {actionErr ? (
        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-lg px-3 py-2">
          {actionErr}
        </p>
      ) : null}

      {showReset ? (
        <section className={`${opsCard} p-5 space-y-4 max-w-lg`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Set new password</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Min 8 characters with upper, lower, digit, and special character (for admin roles).
          </p>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              New password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${opsInput} w-full`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Confirm
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${opsInput} w-full`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={opsBtnPrimary}
              disabled={busy}
              onClick={() => {
                setActionErr(null);
                if (password !== confirm) {
                  setActionErr("Passwords do not match");
                  return;
                }
                resetPassword.mutate(password);
              }}
            >
              {resetPassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save password
            </button>
            <button
              type="button"
              className={opsBtnGhost}
              onClick={() => {
                setShowReset(false);
                setPassword("");
                setConfirm("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Role" value={data.role} />
        <Info label="Phone" value={data.phone || "—"} />
        <Info
          label="Tenant"
          value={data.restaurant_name || "—"}
          link={data.restaurant ? `/admin/tenants/${data.restaurant}` : undefined}
        />
        <Info label="Active" value={data.is_active ? "Yes" : "No"} />
        <Info
          label="Locked"
          value={
            locked
              ? `Yes${
                  data.account_locked_until
                    ? ` until ${new Date(data.account_locked_until).toLocaleString()}`
                    : ""
                }`
              : "No"
          }
          tone={locked ? "danger" : undefined}
        />
        <Info
          label="Failed login attempts"
          value={String(data.failed_login_attempts ?? 0)}
        />
        <Info label="Platform ops (is_staff)" value={data.is_staff ? "Yes" : "No"} />
        <Info label="Superuser" value={data.is_superuser ? "Yes" : "No"} />
        <Info label="Created" value={new Date(data.created_at).toLocaleString()} />
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  link,
  tone,
}: {
  label: string;
  value: string;
  link?: string;
  tone?: "danger";
}) {
  return (
    <div
      className={`${opsCard} px-4 py-3 ${
        tone === "danger"
          ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30"
          : ""
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {link ? (
        <Link to={link} className={`mt-1 block text-sm ${opsLink}`}>
          {value}
        </Link>
      ) : (
        <p
          className={`mt-1 text-sm ${
            tone === "danger"
              ? "text-rose-700 dark:text-rose-400 font-semibold"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}
