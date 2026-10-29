/**
 * Links and image sources built from server or agent data go through here: only http(s), blob and relative paths
 * render. React still renders `javascript:` / `data:text/html` URLs, so a crafted value could run script on click.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    return ["http:", "https:", "blob:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
