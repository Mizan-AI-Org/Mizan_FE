import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsibilitySettings } from "@/components/responsibilities/ResponsibilitySettings";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
};

export function AssignResponsibilitiesDialog({ open, onOpenChange, canEdit = true }: Props) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("cursorUi.resp.assign_dialog_title")}</DialogTitle>
        </DialogHeader>
        <ResponsibilitySettings canEdit={canEdit} />
      </DialogContent>
    </Dialog>
  );
}
