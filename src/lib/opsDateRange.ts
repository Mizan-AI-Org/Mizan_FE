/** Local calendar date as YYYY-MM-DD (for platform admin date filters). */
export function localIsoDate(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localIsoDateDaysAgo(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return localIsoDate(value);
}

export function dateRangeQueryParams(dateFrom: string, dateTo: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (dateFrom.trim()) params.date_from = dateFrom.trim();
  if (dateTo.trim()) params.date_to = dateTo.trim();
  return params;
}
