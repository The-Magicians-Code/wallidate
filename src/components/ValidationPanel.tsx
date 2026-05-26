import type { JSX } from "preact";
import type {
  Severity,
  ValidationIssue,
  ValidationResult,
} from "../lib/pkpass/types";

interface ValidationPanelProps {
  result: ValidationResult;
}

const SEV_ORDER: Severity[] = ["error", "warning", "info", "unsupported"];

const SEV_LABEL: Record<Severity, string> = {
  error: "Errors",
  warning: "Warnings",
  info: "Info",
  unsupported: "Unsupported",
};

function groupBySeverity(
  issues: ValidationIssue[],
): Map<Severity, ValidationIssue[]> {
  const map = new Map<Severity, ValidationIssue[]>();
  for (const sev of SEV_ORDER) map.set(sev, []);
  for (const issue of issues) {
    const bucket = map.get(issue.severity);
    if (bucket) bucket.push(issue);
  }
  return map;
}

export default function ValidationPanel({
  result,
}: ValidationPanelProps): JSX.Element {
  const grouped = groupBySeverity(result.issues);
  const total = result.issues.length;

  return (
    <section class="panel" aria-label="Validation report">
      <header class="panel__header">
        <h2 class="panel__title">Validation</h2>
        <div class="validation__counts" role="status">
          {SEV_ORDER.map((sev) => (
            <span class="count-chip" data-sev={sev} key={sev}>
              {SEV_LABEL[sev]} {result.counts[sev] ?? 0}
            </span>
          ))}
        </div>
      </header>

      <p class="caveat" role="note">
        <strong>Structural validator —</strong>
        &nbsp;these checks cover pass.json shape, manifest SHA-1 hashes, and
        style-specific requirements. Cryptographic signature verification
        runs in the Signature panel below.
      </p>

      {total === 0 ? (
        <p class="validation__empty">No issues found — pass looks clean.</p>
      ) : (
        <ul class="issue-list">
          {SEV_ORDER.flatMap((sev) => grouped.get(sev) ?? []).map(
            (issue, idx) => (
              <li
                class="issue"
                data-sev={issue.severity}
                key={`${issue.code}-${idx}`}
              >
                <span class="sev-chip" data-sev={issue.severity}>
                  {issue.severity}
                </span>
                <div class="issue__main">
                  <p class="issue__msg">{issue.message}</p>
                  <div class="issue__meta">
                    <span class="issue__code">{issue.code}</span>
                    {issue.path && (
                      <span class="issue__path">@ {issue.path}</span>
                    )}
                  </div>
                  {issue.hint && <p class="issue__hint">{issue.hint}</p>}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
