import type { JSX } from "preact";
import type {
  CertInfo,
  Severity,
  SignatureInfo,
  ValidationIssue,
} from "../lib/pkpass/types";

interface SignaturePanelProps {
  info: SignatureInfo;
}

const STATUS_TEXT: Record<SignatureInfo["status"], string> = {
  verifying: "Verifying signature…",
  verified: "Signature verified by Apple WWDR",
  invalid: "Signature failed verification",
  error: "Signature could not be processed",
  skipped: "Signature verification skipped",
};

const STATUS_CLASS: Record<SignatureInfo["status"], string> = {
  verifying: "signature__status--pending",
  verified: "signature__status--ok",
  invalid: "signature__status--bad",
  error: "signature__status--bad",
  skipped: "signature__status--neutral",
};

export default function SignaturePanel({
  info,
}: SignaturePanelProps): JSX.Element {
  const elapsed =
    info.finishedAt && info.startedAt
      ? `${info.finishedAt - info.startedAt} ms`
      : null;

  return (
    <section class="panel signature" aria-label="Signature verification">
      <div class="panel__header">
        <h3 class="panel__title">Signature</h3>
        <span class={`signature__status ${STATUS_CLASS[info.status]}`}>
          {STATUS_TEXT[info.status]}
        </span>
      </div>

      <div class="signature__meta">
        {info.digestAlgorithm && (
          <span class="signature__meta-item">
            <span class="signature__meta-label">Digest</span>
            {info.digestAlgorithm}
          </span>
        )}
        {info.signedAt && (
          <span class="signature__meta-item">
            <span class="signature__meta-label">Signed at</span>
            {formatTime(info.signedAt)}
          </span>
        )}
        {elapsed && (
          <span class="signature__meta-item">
            <span class="signature__meta-label">Verified in</span>
            {elapsed}
          </span>
        )}
      </div>

      {info.certs.length > 0 && (
        <ul class="signature__certs">
          {info.certs.map((c, i) => (
            <CertRow key={i} cert={c} />
          ))}
        </ul>
      )}

      {info.issues.length > 0 && (
        <ul class="signature__issues">
          {info.issues.map((it, i) => (
            <IssueRow key={i} issue={it} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CertRow({ cert }: { cert: CertInfo }): JSX.Element {
  const roleLabel =
    cert.role === "wwdr"
      ? "Apple WWDR"
      : cert.role === "passtype"
        ? "Pass Type ID"
        : "Other";
  return (
    <li class={`signature__cert signature__cert--${cert.role}`}>
      <div class="signature__cert-head">
        <span class="signature__cert-role">{roleLabel}</span>
        {cert.expired && <span class="signature__cert-expired">Expired</span>}
      </div>
      {cert.subjectCN && (
        <div class="signature__cert-cn">{cert.subjectCN}</div>
      )}
      <dl class="signature__cert-meta">
        {cert.subjectOU && (
          <>
            <dt>OU</dt>
            <dd>{cert.subjectOU}</dd>
          </>
        )}
        <dt>Issuer</dt>
        <dd>
          {cert.issuerCN ?? "?"}
          {cert.issuerO ? ` · ${cert.issuerO}` : ""}
        </dd>
        <dt>Serial</dt>
        <dd class="signature__cert-serial">{cert.serialNumber}</dd>
        <dt>Valid</dt>
        <dd>
          {formatDate(cert.notBefore)} → {formatDate(cert.notAfter)}
        </dd>
      </dl>
    </li>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }): JSX.Element {
  return (
    <li class={`signature__issue signature__issue--${issue.severity}`}>
      <span class={`sev-chip sev-chip--${issue.severity}`}>
        {SEV_LABEL[issue.severity]}
      </span>
      <div class="signature__issue-body">
        <div class="signature__issue-message">{issue.message}</div>
        <div class="signature__issue-meta">
          <code>{issue.code}</code>
          {issue.hint && (
            <span class="signature__issue-hint">{issue.hint}</span>
          )}
        </div>
      </div>
    </li>
  );
}

const SEV_LABEL: Record<Severity, string> = {
  error: "ERROR",
  warning: "WARNING",
  info: "INFO",
  unsupported: "UNSUPPORTED",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}
