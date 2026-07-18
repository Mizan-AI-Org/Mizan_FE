import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { platformApi, type PlatformMe } from "@/lib/platformApi";
import { KeyRound, Loader2, Unlock } from "lucide-react";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import {
  opsBadgeOk,
  opsBadgeViolet,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

export default function OperatorDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { me } = useOutletContext<{ me: PlatformMe }>();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-operator", id],
    queryFn: () => platformApi.operator(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (!data) return;
    setFirstName(data.first_name || "");
    setLastName(data.last_name || "");
    setPhone(data.phone || "");
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform-operator", id] });
    qc.invalidateQueries({ queryKey: ["platform-operators"] });
  };

  const leaveOperatorsList = (message?: string) => {
    qc.removeQueries({ queryKey: ["platform-operator", id] });
    qc.invalidateQueries({ queryKey: ["platform-operators"] });
    navigate("/admin/operators", {
      replace: true,
      state: message ? { flash: message } : undefined,
    });
  };

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => platformApi.patchOperator(id, body),
    onSuccess: (user) => {
      setActionErr(null);
      if (!user.is_platform_operator) {
        leaveOperatorsList(`Revoked Platform Admin access for ${user.email}.`);
        return;
      }
      qc.setQueryData(["platform-operator", id], user);
      setActionMsg(
        user.is_active
          ? "Operator updated."
          : "Operator deactivated — they cannot sign in until reactivated.",
      );
      invalidate();
    },
    onError: (e: Error) => {
      const msg = e.message || "Update failed";
      if (/no longer a platform operator/i.test(msg) || /operator not found/i.test(msg)) {
        leaveOperatorsList(msg);
        return;
      }
      setActionErr(msg);
    },
  });

  const unlock = useMutation({
    mutationFn: () => platformApi.unlockUser(id),
    onSuccess: () => {
      setActionErr(null);
      setActionMsg("Account unlocked.");
      invalidate();
    },
    onError: (e: Error) => setActionErr(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: (pwd: string) => platformApi.resetUserPassword(id, pwd),
    onSuccess: () => {
      setActionErr(null);
      setActionMsg("Password updated. Share it securely.");
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
      <div className={opsPage}>
        <OpsBackNav to="/admin/operators" label="Operators" />
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="text-sm font-semibold">
            {(error as Error)?.message || "Operator not found"}
          </p>
          <p className={`mt-1 text-xs ${opsMuted}`}>
            This account may no longer be a platform operator, or the ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  const locked = !!data.is_locked;
  const busy = patch.isPending || unlock.isPending || resetPassword.isPending;
  const isSelf = me.id === data.id;

  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/operators" label="Operators" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={opsTitle}>
            {data.first_name} {data.last_name}
          </h2>
          <p className={opsSubtitle}>{data.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={opsBadgeOk}>Ops</span>
            {data.is_superuser ? <span className={opsBadgeViolet}>Super</span> : null}
            {!data.is_active ? (
              <span className="rounded bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
                Inactive
              </span>
            ) : null}
          </div>
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
            Unlock
          </button>
          <button
            type="button"
            className={opsBtnGhost}
            disabled={busy || isSelf}
            title={
              isSelf
                ? "You cannot deactivate yourself"
                : data.is_active
                  ? "Block login — keeps them listed as an operator"
                  : "Restore login access"
            }
            onClick={() => {
              if (data.is_active) {
                if (
                  !window.confirm(
                    `Deactivate login for ${data.email}?\n\nThey stay on the Operators list but cannot sign in until you Activate them again.\n\n(Use “Revoke operator access” below to remove Platform Admin entirely.)`,
                  )
                ) {
                  return;
                }
              }
              setActionMsg(null);
              setActionErr(null);
              patch.mutate({ is_active: !data.is_active });
            }}
          >
            {data.is_active ? "Deactivate" : "Activate"}
          </button>
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

      <section className={`${opsCard} p-5 space-y-4 max-w-lg`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Profile</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              First name
            </span>
            <input
              className={`${opsInput} w-full`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Last name
            </span>
            <input
              className={`${opsInput} w-full`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Phone
            </span>
            <input
              className={`${opsInput} w-full`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className={opsBtnPrimary}
          disabled={busy}
          onClick={() => {
            setActionMsg(null);
            setActionErr(null);
            patch.mutate({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim(),
            });
          }}
        >
          {patch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </button>
      </section>

      {me.is_superuser ? (
        <section className={`${opsCard} p-5 space-y-3 max-w-lg`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Privileges</h3>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={!!data.is_superuser}
              disabled={busy || isSelf}
              onChange={(e) => {
                setActionMsg(null);
                setActionErr(null);
                patch.mutate({ is_superuser: e.target.checked });
              }}
            />
            Superuser (can grant privileges to other operators)
          </label>
          <button
            type="button"
            className={opsBtnGhost}
            disabled={busy || isSelf}
            onClick={() => {
              if (
                !window.confirm(
                  `Revoke Platform Admin access for ${data.email}? They will no longer open /admin.`,
                )
              ) {
                return;
              }
              setActionMsg(null);
              setActionErr(null);
              patch.mutate({ is_platform_operator: false });
            }}
          >
            Revoke operator access
          </button>
        </section>
      ) : null}
    </div>
  );
}
