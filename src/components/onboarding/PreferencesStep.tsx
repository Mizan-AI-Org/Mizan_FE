import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { API_BASE, api, authFetch } from "@/lib/api";
import { useMyLanguage } from "@/hooks/use-my-language";
import { cn } from "@/lib/utils";
import type { OnboardingStepActionsProps } from "@/components/onboarding/OnboardingStepActions";

type Lang = "en" | "fr" | "ar";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "ar", label: "العربية" },
];

type ShellProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  alreadyDoneBadge?: boolean;
};

type Beat = 0 | 1 | 2;

function ColumnHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

async function saveFloorFlag(body: Record<string, boolean>) {
  const res = await authFetch(`${API_BASE}/settings/unified/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("save failed");
  }
}

export default function PreferencesStep({
  Shell,
  Actions,
  alreadyDone,
  onSaved,
  onSkip,
}: {
  Shell: React.ComponentType<ShellProps>;
  Actions: React.ComponentType<OnboardingStepActionsProps>;
  alreadyDone?: boolean;
  onSaved: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useMyLanguage();
  const current = (LANGS.some((row) => row.id === language) ? language : "en") as Lang;
  const [beat, setBeat] = useState<Beat>(0);
  const [mine, setMine] = useState<Lang>(current);
  const [business, setBusiness] = useState<Lang | "same">( "same");
  const [autoClockOut, setAutoClockOut] = useState<boolean | null>(null);
  const [checklistWithoutClockIn, setChecklistWithoutClockIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const questions = [
    {
      title: t("onboarding.preferences.q_language", "Which language should I use with you?"),
      hint: t(
        "onboarding.preferences.q_language_hint",
        "This is how I talk to you in the app, on WhatsApp, and in Miya.",
      ),
    },
    {
      title: t("onboarding.preferences.q_business", "Should the rest of the team default to this too?"),
      hint: t(
        "onboarding.preferences.q_business_hint",
        "People who have not picked their own language follow the business default.",
      ),
    },
    {
      title: t("onboarding.preferences.q_clockout", "When a shift ends, should people be clocked out automatically?"),
      hint: t(
        "onboarding.preferences.q_clockout_hint",
        "If you say no, they stay clocked in until they clock out themselves.",
      ),
    },
    {
      title: t("onboarding.preferences.q_checklist", "Can someone start a checklist before they clock in?"),
      hint: t(
        "onboarding.preferences.q_checklist_hint",
        "If you say no, staff clock in first. Owners and managers are never asked to clock in.",
      ),
    },
  ];

  const saveBeat = async () => {
    if (beat === 0) {
      await changeLanguage(mine);
      const lng = business === "same" ? mine : business;
      await api.updateMyLanguage({ language: lng, businessOnly: true });
      return;
    }
    if (beat === 1) {
      if (autoClockOut === null) throw new Error("pick");
      await saveFloorFlag({ automatic_clock_out: autoClockOut });
      return;
    }
    if (checklistWithoutClockIn === null) throw new Error("pick");
    await saveFloorFlag({ allow_checklist_without_clock_in: checklistWithoutClockIn });
  };

  const needsChoice =
    (beat === 1 && autoClockOut === null) || (beat === 2 && checklistWithoutClockIn === null);

  const forward = async () => {
    if (needsChoice) {
      toast.error(t("onboarding.preferences.pick", "Pick one to continue."));
      return;
    }
    setSaving(true);
    try {
      await saveBeat();
      if (beat < 2) {
        setBeat((beat + 1) as Beat);
        return;
      }
      await onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message !== "pick"
          ? t("onboarding.preferences.err", "Could not save that. Try again.")
          : t("onboarding.preferences.pick", "Pick one to continue."),
      );
    } finally {
      setSaving(false);
    }
  };

  const choiceClass = (active: boolean) =>
    cn(
      "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
      active
        ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100"
        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    );

  const shellTitle =
    beat === 0
      ? t("onboarding.preferences.language_step_title", "Languages")
      : questions[beat + 1].title;
  const shellSubtitle =
    beat === 0
      ? t(
          "onboarding.preferences.language_step_subtitle",
          "Your language and the default for everyone else on the team.",
        )
      : questions[beat + 1].hint;

  return (
    <Shell
      icon={<Languages className="h-6 w-6" />}
      title={shellTitle}
      subtitle={shellSubtitle}
      alreadyDoneBadge={alreadyDone}
    >
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === beat ? "w-8 bg-emerald-500" : "w-4 bg-slate-200 dark:bg-slate-700",
            )}
          />
        ))}
      </div>

      {beat === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-3">
            <ColumnHeading title={questions[0].title} hint={questions[0].hint} />
            <div className="grid gap-2">
              {LANGS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={choiceClass(mine === row.id)}
                  onClick={() => setMine(row.id)}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 md:border-s md:border-slate-200 md:ps-8 dark:md:border-slate-700">
            <ColumnHeading title={questions[1].title} hint={questions[1].hint} />
            <div className="grid gap-2">
              <button
                type="button"
                className={choiceClass(business === "same")}
                onClick={() => setBusiness("same")}
              >
                {t("onboarding.preferences.same", "Yes — same as mine")}
              </button>
              <p className="text-xs text-muted-foreground">
                {t("onboarding.preferences.different", "Or pick the team default")}
              </p>
              {LANGS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={choiceClass(business === row.id)}
                  onClick={() => setBusiness(row.id)}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {beat === 1 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={choiceClass(autoClockOut === true)} onClick={() => setAutoClockOut(true)}>
            {t("onboarding.preferences.yes", "Yes")}
          </button>
          <button type="button" className={choiceClass(autoClockOut === false)} onClick={() => setAutoClockOut(false)}>
            {t("onboarding.preferences.no", "No")}
          </button>
        </div>
      ) : null}

      {beat === 2 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={choiceClass(checklistWithoutClockIn === true)}
            onClick={() => setChecklistWithoutClockIn(true)}
          >
            {t("onboarding.preferences.yes", "Yes")}
          </button>
          <button
            type="button"
            className={choiceClass(checklistWithoutClockIn === false)}
            onClick={() => setChecklistWithoutClockIn(false)}
          >
            {t("onboarding.preferences.no", "No")}
          </button>
        </div>
      ) : null}

      <Actions
        onSkip={() => {
          void onSkip();
        }}
        skipDisabled={saving}
        hideWizardBack={beat > 0}
        backOverride={
          beat > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setBeat((beat - 1) as Beat)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("onboarding.back", "Back")}
            </Button>
          ) : undefined
        }
      >
        <Button
          type="button"
          disabled={saving}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600"
          onClick={() => void forward()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {beat === 2 ? t("onboarding.continue", "Continue") : t("onboarding.preferences.next", "Next")}
        </Button>
      </Actions>
    </Shell>
  );
}
