/** E-signatures (Approvals → Signatures) and the public verification page. */
import { API_BASE } from "@/lib/api";
import type { ApprovalRow, SignatureRequestRow, SignatureVerifyRecord } from "@/lib/types";

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${localStorage.getItem("access_token") || ""}`;
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.detail || payload.message || "Request failed");
  return (payload && typeof payload === "object" && "data" in payload ? payload.data : payload) as T;
}

export const signaturesApi = {
  list: (status = "") => call<SignatureRequestRow[]>(`/signatures/${status ? `?status=${status}` : ""}`),
  get: (id: string) => call<SignatureRequestRow>(`/signatures/${id}/`),
  create: (form: FormData) => call<SignatureRequestRow>("/signatures/", { method: "POST", body: form }),
  remind: (id: string) =>
    call<SignatureRequestRow>(`/signatures/${id}/remind/`, { method: "POST", body: "{}" }),
  void: (id: string, reason: string) =>
    call<SignatureRequestRow>(`/signatures/${id}/void/`, { method: "POST", body: JSON.stringify({ reason }) }),
  sign: (id: string, typedName: string, title = "") =>
    call<SignatureRequestRow>(`/signatures/${id}/sign/`, {
      method: "POST",
      body: JSON.stringify({ typed_name: typedName, consent: true, title }),
    }),
  decline: (id: string, reason: string) =>
    call<SignatureRequestRow>(`/signatures/${id}/decline/`, { method: "POST", body: JSON.stringify({ reason }) }),
  /** Approve an approval whose rule makes approvers sign. */
  approveSigned: (approvalId: string, name: string, note = "") =>
    call<ApprovalRow>(`/approvals/${approvalId}/decide/`, {
      method: "POST",
      body: JSON.stringify({ decision: "approve", note, signature: { name, consent: true } }),
    }),
  /** Opens the original or sealed PDF in a new tab (the files are private, so it goes through the API). */
  async open(path: string) {
    const tab = window.open("", "_blank");
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    });
    if (!response.ok) {
      tab?.close();
      throw new Error("Could not open the PDF");
    }
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url;
    else window.location.href = url;
  },
  verify: (ref: string) => call<SignatureVerifyRecord>(`/sign/verify/${encodeURIComponent(ref)}/`, {}, false),
  checkCopy: (ref: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return call<{ result: "sealed" | "original" | "mismatch" | "unknown" }>(
      `/sign/verify/${encodeURIComponent(ref)}/`,
      { method: "POST", body: form },
      false,
    );
  },
};
