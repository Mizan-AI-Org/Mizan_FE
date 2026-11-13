import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";

const saveReservation = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, saveReservation: (...a: unknown[]) => saveReservation(...a) } };
});
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

import ReservationDialog from "./ReservationDialog";

const t = (key: string) => key;
const wrap = (props: Partial<React.ComponentProps<typeof ReservationDialog>> = {}) =>
  render(
    <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t, isRTL: false, isChanging: false }}>
      <ReservationDialog open accessToken="tok" reservation={null} onClose={() => {}} onSaved={() => {}} {...props} />
    </LanguageContext.Provider>,
  );

describe("ReservationDialog", () => {
  beforeEach(() => {
    saveReservation.mockReset();
    toastError.mockReset();
  });

  it("refuses a booking without a guest name", () => {
    wrap();
    fireEvent.click(screen.getByText("reservations.form.save"));
    expect(toastError).toHaveBeenCalledWith("reservations.form.err_name");
    expect(saveReservation).not.toHaveBeenCalled();
  });

  it("creates a reservation with party size, table, phone and notes", async () => {
    saveReservation.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    wrap({ onSaved });
    fireEvent.change(screen.getByLabelText("reservations.form.guest"), { target: { value: "Benali" } });
    fireEvent.change(screen.getByLabelText("reservations.form.phone"), { target: { value: "+212600112233" } });
    fireEvent.change(screen.getByLabelText("reservations.form.party_size"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("reservations.form.table"), { target: { value: "T4" } });
    fireEvent.click(screen.getByText("reservations.form.save"));
    await waitFor(() => expect(saveReservation).toHaveBeenCalled());
    const [, body] = saveReservation.mock.calls[0];
    expect(body).toMatchObject({ name: "Benali", phone: "+212600112233", party_size: 6, table: "T4" });
    expect(body.id).toBeUndefined();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("edits an existing reservation by id", async () => {
    saveReservation.mockResolvedValue(undefined);
    wrap({ reservation: { id: "r1", guest_name: "Alaoui", covers: 3, start_time: "2026-11-20T19:00:00Z" } });
    fireEvent.click(screen.getByText("reservations.form.save"));
    await waitFor(() => expect(saveReservation).toHaveBeenCalled());
    expect(saveReservation.mock.calls[0][1]).toMatchObject({ id: "r1", name: "Alaoui", party_size: 3 });
  });
});
