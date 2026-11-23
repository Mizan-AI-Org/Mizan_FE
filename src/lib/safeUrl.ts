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

/**
 * Stricter variant for proof / photo links coming from third parties (agency jobs): only https: URLs and our
 * own `/media/...` paths render. Anything else (javascript:, data:, http:, other relative paths) is dropped.
 */
export function safeMediaUrl(value: string | null | undefined): string | undefined {
  const url = safeUrl(value);
  if (!url) return undefined;
  if (url.startsWith("/")) {
    return url.startsWith("/media/") && !url.split(/[?#]/)[0].includes("..") ? url : undefined;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return parsed.toString();
    if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/media/")) return parsed.toString();
  } catch {
    return undefined;
  }
  return undefined;
}
