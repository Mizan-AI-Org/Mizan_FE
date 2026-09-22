export type DomainCopyParams = Record<string, string | number>;

export function localizedCopy(
  t: (key: string, options?: DomainCopyParams | string) => string,
  key: string | undefined,
  fallback: string,
  params?: DomainCopyParams,
): string {
  if (!key) return fallback;
  return t(key, { ...(params || {}), defaultValue: fallback });
}
