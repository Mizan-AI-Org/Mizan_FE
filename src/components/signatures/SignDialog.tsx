import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";

/** Typed full name + explicit consent: the same signature people give on WhatsApp. */
export default function SignDialog({
  open,
  onOpenChange,
  title,
  expectedName,
  intro,
  confirmLabel,
  pending,
  onSign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  expectedName: string;
  intro?: string;
  confirmLabel?: string;
  pending: boolean;
  onSign: (typedName: string) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const ready = name.trim().split(/\s+/).length >= (expectedName.trim().includes(" ") ? 2 : 1) && consent;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName("");
          setConsent(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>{intro || t("signatures.sign.intro")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !pending) onSign(name.trim());
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="sign-name">{t("signatures.sign.name_label")}</Label>
            <Input
              id="sign-name"
              autoFocus
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={expectedName}
            />
            {name.trim() ? (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 font-serif text-2xl italic text-foreground" aria-hidden>
                {name}
              </p>
            ) : null}
          </div>
          <label className="flex items-start gap-2.5 text-sm leading-snug">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>{t("signatures.sign.consent")}</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("approvals.back")}
            </Button>
            <Button type="submit" disabled={!ready || pending}>
              {pending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <PenLine className="me-1.5 h-4 w-4" aria-hidden />}
              {confirmLabel || t("signatures.sign.button")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
