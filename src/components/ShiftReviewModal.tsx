import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Frown, Meh, Smile, Laugh, Angry } from "lucide-react";

export type ShiftFeeling = 1 | 2 | 3 | 4 | 5; // 1 awful -> 5 great

export interface ShiftReviewPayload {
  session_id: string;
  rating: ShiftFeeling;
  tags: string[];
  comments?: string;
  completed_at_iso: string;
  hours_decimal?: number;
}

interface ShiftReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ShiftReviewPayload) => Promise<void> | void;
  submitting?: boolean;
  shiftTitle?: string; // e.g. "Dustin's Pizza"
  shiftTimeRange?: string; // e.g. "Mon, Aug 25 | 12:00am – 12:00pm"
  sessionId: string;
  completedAtISO: string;
  hoursDecimal?: number;
}

const defaultTags = [
  "Smooth service flow",
  "Happy customers",
  "Supportive team",
  "Good management",
  "Engaging tasks",
  "Efficient staff",
];

export default function ShiftReviewModal({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  shiftTitle,
  shiftTimeRange,
  sessionId,
  completedAtISO,
  hoursDecimal,
}: ShiftReviewModalProps) {
  const [rating, setRating] = useState<ShiftFeeling>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comments, setComments] = useState<string>("");

  const emojis = useMemo(
    () => [
      { value: 1 as ShiftFeeling, label: "Awful", Icon: Angry },
      { value: 2 as ShiftFeeling, label: "Bad", Icon: Frown },
      { value: 3 as ShiftFeeling, label: "Decent", Icon: Meh },
      { value: 4 as ShiftFeeling, label: "Good", Icon: Smile },
      { value: 5 as ShiftFeeling, label: "Great", Icon: Laugh },
    ],
    []
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    
    const payload: ShiftReviewPayload = {
      session_id: sessionId,
      rating,
      tags: selectedTags,
      comments: comments.trim() || undefined,
      completed_at_iso: completedAtISO,
      hours_decimal: typeof hoursDecimal === "number" ? hoursDecimal : undefined,
    };
    console.log("session_id: ", sessionId);
    console.log(payload);
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How was your shift{shiftTitle ? ` at ${shiftTitle}` : ""}?</DialogTitle>
          {shiftTimeRange && (
            <DialogDescription>{shiftTimeRange}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating icons */}
          <div className="flex items-center justify-between">
            {emojis.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                onClick={() => setRating(value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                  rating === value ? "bg-green-100 text-green-700" : "hover:bg-muted"
                }`}
              >
                <Icon className={`h-8 w-8 ${rating === value ? "text-green-600" : "text-muted-foreground"}`} />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-3">
            {defaultTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full border transition-all text-sm ${
                    active ? "bg-green-200 border-green-300" : "bg-muted"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="shift-comments" className="sr-only">
              Additional comments
            </label>
            <textarea
              id="shift-comments"
              className="w-full border rounded-md p-2 text-sm"
              placeholder="Add any comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!!submitting || !sessionId} className="min-w-[160px]">
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </span>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}