import React, { createContext, useContext } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type OnboardingNavContextValue = {
  goBack: () => void;
  backDisabled: boolean;
};

const OnboardingNavContext = createContext<OnboardingNavContextValue | null>(null);

export function OnboardingNavProvider({
  value,
  children,
}: {
  value: OnboardingNavContextValue;
  children: React.ReactNode;
}) {
  return <OnboardingNavContext.Provider value={value}>{children}</OnboardingNavContext.Provider>;
}

export type OnboardingStepActionsProps = {
  children: React.ReactNode;
  onSkip?: () => void;
  skipDisabled?: boolean;
  /** Replaces the wizard Back control (e.g. preferences sub-steps). */
  backOverride?: React.ReactNode;
  hideWizardBack?: boolean;
};

export function OnboardingStepActions({
  children,
  onSkip,
  skipDisabled,
  backOverride,
  hideWizardBack,
}: OnboardingStepActionsProps) {
  const ctx = useContext(OnboardingNavContext);
  const { t } = useTranslation();

  const wizardBack =
    !hideWizardBack && ctx ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={ctx.goBack}
        disabled={ctx.backDisabled}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("onboarding.back", "Back")}
      </Button>
    ) : null;

  const backControl = backOverride ?? wizardBack;

  return (
    <div className="pt-4 mt-auto shrink-0 border-t border-slate-100 dark:border-slate-800/60">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="justify-self-start flex min-h-10 items-center">{backControl}</div>
        <div className="justify-self-center">
          {onSkip ? (
            <Button type="button" variant="outline" onClick={onSkip} disabled={skipDisabled}>
              {t("onboarding.skip_step", "Skip for now")}
            </Button>
          ) : null}
        </div>
        <div className="justify-self-end flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
    </div>
  );
}