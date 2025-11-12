// Utilities to derive signature status for checklist executions

export type SignatureMeta = {
  isSigned: boolean;
  requiresSignature: boolean;
  signedBy?: string | null;
  signedAt?: string | null;
};

/**
 * Derive signature status from a checklist execution payload.
 * This function is defensive: it checks multiple common field shapes
 * so we remain compatible with varying backend schemas.
 */
export function deriveSignatureMeta(execution: any): SignatureMeta {
  try {
    const tpl = execution?.template || execution?.template_info || {};
    const steps = tpl?.steps || execution?.steps || [];

    const requiresSignature = Boolean(
      tpl?.requires_supervisor_approval ||
      steps?.some((s: any) => !!(s?.requires_signature))
    );

    // Top-level signature indicators
    const signedBy = execution?.signed_by_name || execution?.approved_by_name || execution?.signed_by || null;
    const signedAt = execution?.signed_at || execution?.approved_at || null;
    const supervisorSig = execution?.supervisor_signature || execution?.signature_url || execution?.signature_data || null;

    // Scan step responses/evidence for signature attachments
    const stepResponses = execution?.step_responses || execution?.responses || [];
    const hasSignatureEvidence = Array.isArray(stepResponses) && stepResponses.some((sr: any) => {
      const ev = sr?.evidence || sr?.attachments || [];
      return Array.isArray(ev) && ev.some((e: any) => String(e?.type || '').toLowerCase() === 'signature');
    });

    const isSigned = Boolean(signedBy || supervisorSig || hasSignatureEvidence);

    return {
      isSigned,
      requiresSignature,
      signedBy: signedBy || null,
      signedAt: signedAt || null,
    };
  } catch {
    return { isSigned: false, requiresSignature: false };
  }
}