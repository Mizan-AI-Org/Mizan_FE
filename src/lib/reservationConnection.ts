/** Fields from GET /settings/unified/ used to decide if Bookings can load data. */
export type ReservationSettingsSnapshot = {
  reservation_provider?: string | null;
  eatnow_restaurant_id?: string | null;
  eatnow_api_key_set?: boolean;
  eatnow_webhook_secret_set?: boolean;
  reservation_widget_url?: string | null;
};

export const RESERVATION_BOOKING_CONNECT_PATH =
  "/dashboard/settings?tab=integrations&focus=reservations";

export function isBookingSystemConnected(
  data: ReservationSettingsSnapshot | null | undefined,
): boolean {
  if (!data) return false;
  const provider = String(data.reservation_provider || "NONE").toUpperCase();
  if (provider === "NONE") return false;
  if (provider === "EATAPP") {
    const restaurantId = String(data.eatnow_restaurant_id || "").trim();
    const hasApiKey = Boolean(data.eatnow_api_key_set);
    const hasWebhook = Boolean(data.eatnow_webhook_secret_set);
    return restaurantId.length > 0 && (hasApiKey || hasWebhook);
  }
  if (provider === "CUSTOM") {
    return String(data.reservation_widget_url || "").trim().length > 0;
  }
  return true;
}
