import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  disposePass,
  formatBytes,
  parsePkpass,
  PkpassParseError,
} from "../lib/pkpass/parse";
import { pickRandomSample } from "../lib/pkpass/sample";
import { validatePass } from "../lib/pkpass/validate";
import type {
  ParsedPass,
  SignatureInfo,
  ValidationResult,
} from "../lib/pkpass/types";
import Uploader from "./Uploader";
import PassCard from "./PassCard";
import PassBack from "./PassBack";
import ValidationPanel from "./ValidationPanel";
import SignaturePanel from "./SignaturePanel";

type Status = "idle" | "parsing" | "ready";

export default function PassExplorer() {
  const [status, setStatus] = useState<Status>("idle");
  const [parsed, setParsed] = useState<ParsedPass | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [signature, setSignature] = useState<SignatureInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parsedRef = useRef<ParsedPass | null>(null);
  const verifyTokenRef = useRef(0);

  useEffect(() => {
    parsedRef.current = parsed;
  }, [parsed]);

  useEffect(() => {
    return () => {
      if (parsedRef.current && parsedRef.current.source === "upload") {
        disposePass(parsedRef.current);
      }
    };
  }, []);

  const apply = useCallback((next: ParsedPass) => {
    const prev = parsedRef.current;
    if (prev && prev.source === "upload") disposePass(prev);
    setParsed(next);
    setResult(validatePass(next));
    setError(null);
    setStatus("ready");

    const token = ++verifyTokenRef.current;

    if (next.source !== "upload" || !next.hasSignature) {
      setSignature(null);
      return;
    }

    if (!next.signatureBytes || !next.manifestBytes) {
      // Signature present but manifest missing (or vice versa) — the verifier
      // can't run, but we shouldn't silently skip. Surface as a signature
      // error so the user sees the cause.
      const reason = !next.manifestBytes
        ? "manifest.json is missing from the package — cannot verify the detached signature."
        : "signature file bytes were not retained by the parser.";
      setSignature({
        status: "error",
        certs: [],
        issues: [
          {
            severity: "error",
            code: !next.manifestBytes
              ? "signature.manifest-missing"
              : "signature.bytes-missing",
            message: reason,
          },
        ],
        startedAt: Date.now(),
        finishedAt: Date.now(),
      });
      return;
    }

    setSignature({
      status: "verifying",
      certs: [],
      issues: [],
      startedAt: Date.now(),
    });
    const sigBytes = next.signatureBytes;
    const manBytes = next.manifestBytes;
    void (async () => {
      try {
        const { verifyPassSignature } = await import(
          "../lib/pkpass/signature"
        );
        if (verifyTokenRef.current !== token) return;
        const info = await verifyPassSignature(
          sigBytes,
          manBytes,
          next.pass.passTypeIdentifier ?? "",
          next.pass.teamIdentifier ?? "",
        );
        if (verifyTokenRef.current !== token) return;
        setSignature(info);
      } catch (e) {
        if (verifyTokenRef.current !== token) return;
        setSignature({
          status: "error",
          certs: [],
          issues: [
            {
              severity: "error",
              code: "signature.verify.import",
              message: `Could not load the signature verifier: ${(e as Error).message}`,
            },
          ],
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
      }
    })();
  }, []);

  const onFile = useCallback(
    async (file: File) => {
      setStatus("parsing");
      setError(null);
      try {
        const next = await parsePkpass(file);
        apply(next);
      } catch (err) {
        setStatus("idle");
        if (err instanceof PkpassParseError) {
          setError(err.message);
        } else {
          setError(
            err instanceof Error ? err.message : "Unknown error while parsing.",
          );
        }
      }
    },
    [apply],
  );

  const onSample = useCallback(() => {
    apply(pickRandomSample());
  }, [apply]);

  return (
    <>
      <Uploader
        onFile={onFile}
        onSample={onSample}
        busy={status === "parsing"}
        error={error}
      />

      {parsed && result && (
        <section class="container results" aria-label="Pass and validation">
          <div class="results__card">
            <PassCard parsed={parsed} />
          </div>

          <div class="results__right">
            {parsed.source === "sample" && <SampleBanner />}
            <ValidationPanel result={result} />
            {signature && <SignaturePanel info={signature} />}

            {parsed.structure.backFields &&
              parsed.structure.backFields.length > 0 && (
                <details class="panel" open>
                  <summary>
                    Back of pass
                    <span class="count-chip">
                      {parsed.structure.backFields.length}
                    </span>
                  </summary>
                  <div class="panel__body panel__body--flush">
                    <PassBack fields={parsed.structure.backFields} />
                  </div>
                </details>
              )}

            <PackageSummary parsed={parsed} />
          </div>
        </section>
      )}
    </>
  );
}

function SampleBanner() {
  return (
    <div class="sample-banner" role="note">
      <strong>Synthetic sample.</strong> Image files, manifest, and signature
      are deliberately omitted — the structural errors below show what the
      validator would catch on a real <code>.pkpass</code>. Drop your own
      <code> .pkpass</code> to see a clean run.
    </div>
  );
}

function PackageSummary({ parsed }: { parsed: ParsedPass }) {
  if (parsed.source === "sample") {
    return (
      <div class="panel">
        <div class="panel__header">
          <h3 class="panel__title">Package</h3>
        </div>
        <div class="panel__body" style={{ color: "var(--muted)", fontSize: 13 }}>
          {parsed.sampleNote ?? "Synthetic sample — no archive to inspect."}
        </div>
      </div>
    );
  }

  return (
    <details class="panel">
      <summary>
        Files in package
        <span class="count-chip">{parsed.fileCount}</span>
      </summary>
      <div class="panel__body panel__body--flush">
        <ul class="files-list">
          {parsed.rawFiles.map((path) => {
            const entry = parsed.manifest.find((m) => m.path === path);
            return (
              <li key={path}>
                <span class="file-name">{path}</span>
                <span>
                  {entry ? (entry.matches ? "sha1 ✓" : "sha1 ✗") : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <div
          class="panel__body"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          {parsed.fileCount} files · {formatBytes(parsed.totalBytes)} ·{" "}
          {parsed.hasSignature
            ? `signature ${formatBytes(parsed.signatureSize)}`
            : "no signature"}
        </div>
      </div>
    </details>
  );
}
