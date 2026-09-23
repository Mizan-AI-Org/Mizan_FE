import { describe, expect, it } from "vitest";

import { normalizeStaffPickerRows } from "./staffPicker";

describe("normalizeStaffPickerRows", () => {
  it("unwraps api_envelope staff list", () => {
    const rows = normalizeStaffPickerRows({
      success: true,
      data: [
        {
          id: "u1",
          email: "adama@example.com",
          first_name: "Adama",
          last_name: "Diallo",
          role: "STAFF",
        },
      ],
      error: null,
      metadata: { count: 1 },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("u1");
    expect(rows[0].first_name).toBe("Adama");
  });

  it("still accepts a bare array", () => {
    const rows = normalizeStaffPickerRows([
      { id: "u2", email: "x@y.com", first_name: "X", last_name: "Y" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("u2");
  });
});
