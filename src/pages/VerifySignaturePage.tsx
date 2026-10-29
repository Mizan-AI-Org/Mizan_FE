import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileCheck2, Loader2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { signaturesApi } from "@/lib/signaturesApi";
import { cn } from "@/lib/utils";

/** Public: what the QR code on a signed document's certificate opens. Anyone can check a copy against it. */
export default function VerifySignaturePage() {
  const { ref = "" } = useParams();
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState<string>("");
  const record = useQuery({ queryKey: ["verify", ref], queryFn: () => signaturesApi.verify(ref), retry: false });
  const check = useMutation({
    mutationFn: (file: File) => signaturesApi.checkCopy(ref, file),
    onSuccess: (res) => setChecked(res.result),
  });
  const r = record.data;
  const complete = r?.status === "completed";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center gap-2">
          <img src="/mizan-logo.png" alt="Mizan AI" className="h-8 w-auto" />
          <span className="text-sm font-semibold text-slate-500">{t("verify.heading")}</span>
        </header>

        {record.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        {record.isError ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-slate-900">
            <ShieldAlert className="mb-2 h-6 w-6 text-red-600" aria-hidden />
            <p className="font-semibold">{t("verify.not_found")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("verify.not_found_hint")}</p>
          </div>
        ) : null}

        {r ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              {complete && r.chainOk ? <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden /> : <ShieldAlert className="h-7 w-7 shrink-0 text-amber-600" aria-hidden />}
              <div>
                <h1 className="text-lg font-bold">{r.title}</h1>
                <p className="text-sm text-slate-500">{r.business} · {t("verify.ref", { ref: r.ref })}</p>
                <p className={cn("mt-1 text-sm font-semibold", complete ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
                  {complete ? t("verify.completed", { date: r.completedAt || "" }) : t(`signatures.status.${r.status}`)}
                </p>
                {!r.chainOk ? <p className="mt-1 text-sm font-semibold text-red-600">{t("verify.chain_broken")}</p> : null}
              </div>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {r.signers.map((s, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {s.signedAt ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
                    {s.name}
                  </span>
                  <span className="text-slate-500">
                    {s.signedAt ? t("verify.signed_at", { date: s.signedAt, how: s.verifiedBy }) : t(`signatures.signer.${s.status}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{t("verify.timezone", { tz: r.timezone })}</p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-sm font-semibold">{t("verify.check_title")}</p>
              <p className="text-xs text-slate-500">{t("verify.check_hint")}</p>
              <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) check.mutate(f); }} />
              <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => input.current?.click()}>
                {check.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Upload className="me-1.5 h-4 w-4" aria-hidden />}
                {t("verify.check_button")}
              </Button>
              {checked ? (
                <p className={cn("flex items-center gap-1.5 text-sm font-semibold",
                  checked === "sealed" ? "text-emerald-700 dark:text-emerald-400" : checked === "original" ? "text-amber-700" : "text-red-600")}>
                  <FileCheck2 className="h-4 w-4" aria-hidden />
                  {t(`verify.result.${checked}`)}
                </p>
              ) : null}
              <p className="break-all font-mono text-[11px] text-slate-400">SHA-256 {r.sealedSha256 || r.documentSha256}</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
