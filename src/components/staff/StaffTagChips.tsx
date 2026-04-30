import React from "react";
import { Check } from "lucide-react";
import {
    STAFF_TAGS,
    STAFF_TAG_TONE,
    type StaffTag,
    isCanonicalStaffTag,
    normalizeStaffTags,
    staffTagI18nKey,
} from "@/lib/staff-tags";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

/**
 * Read-only horizontal list of department tags. Renders nothing when
 * the list is empty (callers can opt into a placeholder via the
 * ``placeholder`` prop) so it's safe to drop into a row that may or
 * may not have tags without conditional rendering at the call site.
 *
 * Used on staff cards, the staff profile detail screen, the escalate
 * picker, and anywhere we surface a teammate.
 */
export function StaffTagChips({
    tags,
    size = "sm",
    placeholder = null,
    max,
    className,
}: {
    tags: readonly string[] | null | undefined;
    size?: "xs" | "sm";
    placeholder?: React.ReactNode;
    max?: number;
    className?: string;
}) {
    const { t } = useLanguage();
    const normalised = normalizeStaffTags(tags ?? []);

    if (!normalised.length) {
        return placeholder ? <>{placeholder}</> : null;
    }

    // ``max`` lets compact rows (e.g. the escalate picker) cap the
    // visible chips and surface "+N" so the row never grows beyond a
    // single line. Hidden tags still show in the title attribute so
    // they're recoverable on hover.
    const visible = max != null ? normalised.slice(0, max) : normalised;
    const hidden = max != null ? normalised.slice(max) : [];

    const chipBase =
        size === "xs"
            ? "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            : "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

    return (
        <div className={cn("flex flex-wrap items-center gap-1", className)}>
            {visible.map((tag) => (
                <span
                    key={tag}
                    title={t(staffTagI18nKey(tag))}
                    className={cn(chipBase, STAFF_TAG_TONE[tag as StaffTag])}
                >
                    {t(staffTagI18nKey(tag))}
                </span>
            ))}
            {hidden.length ? (
                <span
                    title={hidden
                        .map((h) => t(staffTagI18nKey(h)))
                        .join(", ")}
                    className={cn(
                        chipBase,
                        "bg-slate-100 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300",
                    )}
                >
                    +{hidden.length}
                </span>
            ) : null}
        </div>
    );
}

/**
 * Editable tag picker — a row of toggleable chips, one per canonical
 * tag, with a check mark on selected ones. Multi-select; tag order is
 * preserved across toggles so clicking the same tag twice doesn't
 * reorder the user's mental model of "primary department first".
 *
 * Why chips and not a dropdown / multi-select listbox?
 * - 10 options total — chips are visible-by-default and faster to
 *   tap on touch devices.
 * - We want the manager to *see* the available departments so adding
 *   the right ones doesn't require remembering keywords.
 */
export function StaffTagSelector({
    value,
    onChange,
    disabled = false,
    className,
    showHelp = true,
}: {
    value: readonly string[] | null | undefined;
    onChange: (tags: StaffTag[]) => void;
    disabled?: boolean;
    className?: string;
    showHelp?: boolean;
}) {
    const { t } = useLanguage();
    const selected = new Set(normalizeStaffTags(value ?? []));

    const toggle = (tag: StaffTag) => {
        if (disabled) return;
        const next = new Set(selected);
        if (next.has(tag)) {
            next.delete(tag);
        } else {
            next.add(tag);
        }
        // Preserve canonical order so the rendered output is stable
        // across re-renders regardless of click sequence.
        onChange(STAFF_TAGS.filter((t) => next.has(t)));
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div>
                <p className="text-sm font-medium">{t("staff.tags.section_title")}</p>
                {showHelp ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t("staff.tags.section_help")}
                    </p>
                ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {STAFF_TAGS.map((tag) => {
                    const active = selected.has(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggle(tag)}
                            disabled={disabled}
                            aria-pressed={active}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                                active
                                    ? cn(
                                          STAFF_TAG_TONE[tag],
                                          "border-transparent ring-1 ring-current/30",
                                      )
                                    : "border-border bg-background text-foreground hover:bg-muted/60",
                                disabled && "opacity-50 cursor-not-allowed",
                            )}
                        >
                            {active ? (
                                <Check className="h-3 w-3" aria-hidden />
                            ) : null}
                            {t(staffTagI18nKey(tag))}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Re-export so call sites that already import from this file don't
// need to learn a second module path. Useful when an upstream
// component just wants `isCanonicalStaffTag` for a quick guard.
export { isCanonicalStaffTag, normalizeStaffTags };
