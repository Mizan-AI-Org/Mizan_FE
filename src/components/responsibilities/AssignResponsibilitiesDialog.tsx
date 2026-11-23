import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsibilitySettings } from "@/components/responsibilities/ResponsibilitySettings";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssignResponsibilitiesDialog({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("responsibilities.assign_dialog_title")}</DialogTitle>
        </DialogHeader>
        <ResponsibilitySettings />
      </DialogContent>
    </Dialog>
  );
}