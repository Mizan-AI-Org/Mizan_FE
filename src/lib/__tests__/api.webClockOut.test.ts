import { describe, it, expect, beforeEach, vi } from "vitest";
import { api } from "../api";

// Helper to set API base env
const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

describe("api.webClockOut", () => {
  const token = "test-token";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("includes Authorization header and payload fields", async () => {
    const latitude = 1.23;
    const longitude = 4.56;
    const accuracy = 7.89;

    const json = vi.fn().mockResolvedValue({ message: "ok", clock_out_time: new Date().toISOString() });
    const fetchMock = vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json } as any);

    const res = await api.webClockOut(token, latitude, longitude, accuracy);
    expect(res.message).toBe("ok");

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/timeclock/web-clock-out/`, expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
    }));

    const bodyStr = (fetchMock.mock.calls[0][1] as any).body as string;
    const body = JSON.parse(bodyStr);
    expect(body).toEqual({ latitude, longitude, accuracy });
    // Ensure we do not send UI-only fields
    expect("method" in body).toBe(false);
    expect("device_id" in body).toBe(false);
    expect("override" in body).toBe(false);
  });

  it("surfaces server-provided error message 'error' when 'message' missing", async () => {
    const json = vi.fn().mockResolvedValue({ error: "Not clocked in" });
    vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request", json } as any);

    await expect(api.webClockOut(token)).rejects.toThrowError(/Not clocked in/);
  });

  it("falls back to default message when server error payload is unparsable", async () => {
    const badJson = vi.fn().mockRejectedValue(new Error("parse error"));
    vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request", json: badJson } as any);

    await expect(api.webClockOut(token)).rejects.toThrowError(/Failed to clock out/);
  });
});