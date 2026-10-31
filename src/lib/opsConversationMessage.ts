/** Format agent turn user input for platform ops (hide internal photo pipeline prompts). */

export type OpsPhotoReading = {
  kind: string;
  summary: string;
  vendor: string;
  amount: string;
  currency: string;
  date: string;
  invoiceNumber: string;
};

export type ParsedOpsUserMessage =
  | { type: "text"; displayText: string }
  | { type: "photo"; reading: OpsPhotoReading; mediaId: string | null };

const INTERNAL_LINE =
  /^(they did not say|could not read|do not file|do not call|tell them that|this looks like)/i;

function fieldAfter(label: string, block: string): string {
  const re = new RegExp(`${label}:\\s*(.+?)(?:\\n|$)`, "i");
  const m = block.match(re);
  return m?.[1]?.trim() ?? "";
}

export function parseOpsUserMessage(raw: string): ParsedOpsUserMessage {
  const text = (raw || "").trim();
  if (!text.toLowerCase().startsWith("[photo received]")) {
    return { type: "text", displayText: text };
  }

  const body = text.replace(/^\[photo received\]\s*/i, "");
  const readingBlock = body.split(/\nmediaId:/i)[0] ?? body;
  const mediaMatch = body.match(/\nmediaId:\s*(\S+)/i);

  const reading: OpsPhotoReading = {
    kind: fieldAfter("Appears to be", readingBlock) || "unknown",
    summary: fieldAfter("Summary", readingBlock),
    vendor: fieldAfter("Vendor", readingBlock),
    amount: fieldAfter("Amount", readingBlock),
    currency: fieldAfter("Currency", readingBlock),
    date: fieldAfter("Date", readingBlock),
    invoiceNumber: fieldAfter("Invoice number", readingBlock),
  };

  return {
    type: "photo",
    reading,
    mediaId: mediaMatch?.[1]?.trim() ?? null,
  };
}

export function stripInternalAgentInstructions(text: string): string {
  return (text || "")
    .split("\n")
    .filter((line) => !INTERNAL_LINE.test(line.trim()))
    .join("\n")
    .trim();
}

export function opsUserMessagePlainText(raw: string): string {
  const parsed = parseOpsUserMessage(raw);
  if (parsed.type === "text") {
    return parsed.displayText;
  }
  const r = parsed.reading;
  const parts = [
    "Photo message.",
    r.summary ? `Summary: ${r.summary}` : "",
    r.kind && r.kind !== "unknown" ? `Type: ${r.kind}` : "",
    r.vendor && r.vendor !== "unknown" ? `Vendor: ${r.vendor}` : "",
    r.amount && r.amount !== "unknown"
      ? `Amount: ${r.amount}${r.currency && r.currency !== "unknown" ? ` ${r.currency}` : ""}`
      : "",
  ].filter(Boolean);
  return parts.join("\n");
}

export function conversationLikelyNonEnglish(turns: Array<{ language?: string; input_language_detected?: string; input_text?: string; response_text?: string }>): boolean {
  for (const turn of turns) {
    const lang = (turn.input_language_detected || turn.language || "").toLowerCase();
    if (lang && lang !== "en" && lang !== "english") {
      return true;
    }
  }
  const sample = turns
    .slice(-6)
    .map((t) => `${t.input_text || ""}\n${t.response_text || ""}`)
    .join("\n");
  if (/[àâäéèêëïîôùûüç]|(?:\b(?:bonjour|merci|point du|tâches|retard|empl)\b)/i.test(sample)) {
    return true;
  }
  return false;
}
