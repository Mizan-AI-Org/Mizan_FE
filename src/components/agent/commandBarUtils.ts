/** Tiny helpers for Command Bar presentation (no NL parsing). */
export function commandKindLabel(kind: string | undefined): string {
  return (kind || "question").toLowerCase();
}
