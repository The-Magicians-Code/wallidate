import * as asn1js from "asn1js";
import {
  Certificate,
  ContentInfo,
  SignedData,
  type RelativeDistinguishedNames,
} from "pkijs";
import type {
  CertInfo,
  CertRole,
  SignatureInfo,
  ValidationIssue,
} from "./types";

/**
 * Apple Worldwide Developer Relations Certification Authority (G4).
 * Source: https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
 * Issued by Apple Root CA, valid 2020-12-16 → 2030-12-10.
 */
const APPLE_WWDR_G4_PEM = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

const WWDR_G4_SERIAL = "13dc77955271e53dc632e8ccffe521f3ccc5ced2";
const APPLE_WWDR_CN =
  "Apple Worldwide Developer Relations Certification Authority";
const APPLE_O = "Apple Inc.";
const APPLE_PASS_TYPE_OID = "1.2.840.113635.100.6.1.16";

const RDN_OID = {
  CN: "2.5.4.3",
  OU: "2.5.4.11",
  O: "2.5.4.10",
} as const;

const MAX_SIGNATURE_BYTES = 64 * 1024;

export async function verifyPassSignature(
  signatureBytes: Uint8Array,
  manifestBytes: Uint8Array,
  passTypeIdentifier: string,
  teamIdentifier: string,
): Promise<SignatureInfo> {
  const startedAt = Date.now();
  const issues: ValidationIssue[] = [];
  const certs: CertInfo[] = [];

  const err = (code: string, message: string, hint?: string) =>
    issues.push({ severity: "error", code, message, ...(hint ? { hint } : {}) });
  const warn = (code: string, message: string, hint?: string) =>
    issues.push({
      severity: "warning",
      code,
      message,
      ...(hint ? { hint } : {}),
    });
  const info = (code: string, message: string) =>
    issues.push({ severity: "info", code, message });

  if (typeof crypto === "undefined" || !crypto.subtle) {
    err(
      "signature.webcrypto-missing",
      "WebCrypto (crypto.subtle) is not available — signature verification requires HTTPS or localhost.",
    );
    return {
      status: "error",
      certs,
      issues,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  if (signatureBytes.byteLength > MAX_SIGNATURE_BYTES) {
    err(
      "signature.too-large",
      `signature file is ${signatureBytes.byteLength} bytes; refusing to parse (max ${MAX_SIGNATURE_BYTES}).`,
    );
    return {
      status: "error",
      certs,
      issues,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  let signedData: SignedData;
  try {
    const asn1 = asn1js.fromBER(toArrayBuffer(signatureBytes));
    if (asn1.offset === -1) {
      throw new Error("ASN.1 parse failed at offset -1");
    }
    const contentInfo = new ContentInfo({ schema: asn1.result });
    signedData = new SignedData({ schema: contentInfo.content });
  } catch (e) {
    err(
      "signature.pkcs7.parse",
      `PKCS#7 envelope did not parse: ${(e as Error).message}`,
    );
    return {
      status: "error",
      certs,
      issues,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  const wwdrRoot = parsePem(APPLE_WWDR_G4_PEM);

  const embedded = signedData.certificates ?? [];
  let signerCert: Certificate | undefined;
  let passTypeCert: Certificate | undefined;
  let wwdrCert: Certificate | undefined;

  for (const c of embedded) {
    if (!(c instanceof Certificate)) continue;
    const role = classifyCert(c);
    const cinfo = describeCert(c, role);
    certs.push(cinfo);
    if (role === "wwdr") wwdrCert = c;
    else if (role === "passtype") passTypeCert = c;
  }

  if (signedData.signerInfos.length === 0) {
    err("signature.signer.missing", "PKCS#7 envelope contains no SignerInfo.");
  } else {
    signerCert = passTypeCert;
  }

  if (!wwdrCert) {
    err(
      "signature.cert.wwdr-missing",
      "Apple WWDR certificate not found in the signature.",
      "Apple includes the WWDR intermediate inside every signed .pkpass.",
    );
  } else {
    const serial = serialHex(wwdrCert).toLowerCase();
    if (serial === WWDR_G4_SERIAL) {
      info(
        "signature.cert.wwdr-pinned",
        `WWDR cert matches the pinned Apple G4 serial (${serial}).`,
      );
    } else {
      warn(
        "signature.cert.wwdr-unknown",
        `WWDR cert serial ${serial} does not match the pinned Apple G4 serial.`,
        "The validator pins Apple's WWDR G4 cert. Older G1–G3 chains will warn here.",
      );
    }
  }

  const identifiersUsable =
    passTypeIdentifier.length > 0 && teamIdentifier.length > 0;
  if (!identifiersUsable) {
    warn(
      "signature.pass.identifiers-missing",
      "Skipping signer identifier checks — pass.json is missing passTypeIdentifier or teamIdentifier.",
    );
  }

  if (!passTypeCert) {
    err(
      "signature.cert.passtype-missing",
      "Pass Type ID certificate not found in the signature.",
    );
  } else {
    const issuerCN = rdn(passTypeCert.issuer, RDN_OID.CN);
    const issuerO = rdn(passTypeCert.issuer, RDN_OID.O);
    if (issuerCN !== APPLE_WWDR_CN || issuerO !== APPLE_O) {
      err(
        "signature.cert.passtype-issuer",
        `Pass Type cert is not issued by Apple WWDR (got CN="${issuerCN}", O="${issuerO}").`,
      );
    }

    const notAfter = passTypeCert.notAfter.value;
    if (notAfter.getTime() < Date.now()) {
      err(
        "signature.cert.passtype-expired",
        `Pass Type cert expired on ${notAfter.toISOString()}.`,
      );
    }

    const oidValue = readOidExtension(passTypeCert, APPLE_PASS_TYPE_OID);
    if (oidValue == null) {
      warn(
        "signature.cert.passtype-oid-missing",
        `Pass Type cert has no Apple custom extension ${APPLE_PASS_TYPE_OID}.`,
      );
    } else if (identifiersUsable && oidValue !== passTypeIdentifier) {
      err(
        "signature.cert.passtype-id-mismatch",
        `Pass Type cert OID extension "${oidValue}" does not match pass.json passTypeIdentifier "${passTypeIdentifier}".`,
      );
    }

    const subjectCN = rdn(passTypeCert.subject, RDN_OID.CN) ?? "";
    const subjectOU = rdn(passTypeCert.subject, RDN_OID.OU) ?? "";
    const nfcMatch = subjectCN.match(/^Pass Type ID with NFC:\s*(.+)$/);
    const stdMatch = subjectCN.match(/^Pass Type ID:\s*(.+)$/);
    const cnPassType = nfcMatch?.[1] ?? stdMatch?.[1];
    if (nfcMatch) {
      info(
        "signature.cert.nfc",
        "Signer cert is an NFC-capable Pass Type ID certificate.",
      );
    }
    if (cnPassType == null) {
      warn(
        "signature.cert.cn-shape",
        `Signer cert CN "${subjectCN}" does not look like an Apple Pass Type ID certificate.`,
      );
    } else if (identifiersUsable && cnPassType !== passTypeIdentifier) {
      err(
        "signature.cert.cn-mismatch",
        `Signer cert CN pass type "${cnPassType}" does not match pass.json passTypeIdentifier "${passTypeIdentifier}".`,
      );
    }

    if (identifiersUsable && subjectOU && subjectOU !== teamIdentifier) {
      err(
        "signature.cert.ou-mismatch",
        `Signer cert OU "${subjectOU}" does not match pass.json teamIdentifier "${teamIdentifier}".`,
      );
    }
  }

  const signingTime = readSigningTime(signedData);
  if (signingTime) {
    info(
      "signature.signing-time",
      `Signed at ${signingTime.toISOString()}.`,
    );
  }

  let verified = false;
  let chainVerified: boolean | null = null;
  let digestAlgorithm: string | undefined;
  try {
    // pkijs's verify() with extendedMode: true resolves to an object whose
    // `signatureVerified` is a tri-state (true / false / null). Plain
    // `Boolean(result)` would be true for ANY object — including a failed
    // verification — so we must read the field explicitly.
    const result = await signedData.verify({
      signer: 0,
      data: toArrayBuffer(manifestBytes),
      trustedCerts: wwdrRoot ? [wwdrRoot] : [],
      checkChain: Boolean(wwdrRoot),
      extendedMode: true,
    });
    verified = result.signatureVerified === true;
    chainVerified = result.signerCertificateVerified ?? null;
    digestAlgorithm = oidName(
      signedData.signerInfos[0]?.digestAlgorithm?.algorithmId,
    );
    if (verified) {
      info(
        "signature.verified",
        `Signature is cryptographically valid (${digestAlgorithm ?? "unknown digest"}).`,
      );
    } else {
      err(
        "signature.invalid",
        "Signature did not verify against manifest.json.",
      );
    }
  } catch (e) {
    err(
      "signature.verify.error",
      `Signature verification threw: ${(e as Error).message}`,
    );
  }

  // If WWDR was off-pin AND verify failed, the most likely cause is a legacy
  // G1–G3 chain. Add a clearer hint without changing severity.
  const wwdrOffPin = issues.some(
    (i) => i.code === "signature.cert.wwdr-unknown",
  );
  if (wwdrOffPin && !verified) {
    info(
      "signature.legacy-wwdr-hint",
      "Verification probably failed because this pass chains to a legacy Apple WWDR root (G1–G3). The validator currently pins WWDR G4.",
    );
  }

  if (chainVerified === false) {
    // Surface chain-validation failures distinctly from signature digest
    // failures, so the user can tell the difference.
    err(
      "signature.chain.invalid",
      "Signer certificate did not chain to the trusted Apple WWDR G4 root.",
    );
  }

  const errored = issues.some((i) => i.severity === "error");
  const status: SignatureInfo["status"] = verified
    ? errored
      ? "invalid"
      : "verified"
    : errored
      ? "invalid"
      : "error";

  return {
    status,
    signedAt: signingTime?.toISOString(),
    digestAlgorithm,
    certs,
    issues,
    startedAt,
    finishedAt: Date.now(),
  };
}

function parsePem(pem: string): Certificate | undefined {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  try {
    const bytes = base64ToBytes(b64);
    const asn1 = asn1js.fromBER(toArrayBuffer(bytes));
    if (asn1.offset === -1) return undefined;
    return new Certificate({ schema: asn1.result });
  } catch {
    return undefined;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);
}

function rdn(
  name: RelativeDistinguishedNames,
  oid: string,
): string | undefined {
  for (const tv of name.typesAndValues) {
    if (tv.type === oid) {
      const v = tv.value.valueBlock as { value?: string };
      if (typeof v.value === "string") return v.value;
    }
  }
  return undefined;
}

function classifyCert(cert: Certificate): CertRole {
  const subjectCN = rdn(cert.subject, RDN_OID.CN) ?? "";
  const subjectO = rdn(cert.subject, RDN_OID.O) ?? "";
  if (subjectCN === APPLE_WWDR_CN && subjectO === APPLE_O) return "wwdr";
  if (/^Pass Type ID(?: with NFC)?:/.test(subjectCN)) return "passtype";
  return "other";
}

function describeCert(cert: Certificate, role: CertRole): CertInfo {
  return {
    role,
    subjectCN: rdn(cert.subject, RDN_OID.CN),
    subjectOU: rdn(cert.subject, RDN_OID.OU),
    issuerCN: rdn(cert.issuer, RDN_OID.CN),
    issuerO: rdn(cert.issuer, RDN_OID.O),
    serialNumber: serialHex(cert).toLowerCase(),
    notBefore: cert.notBefore.value.toISOString(),
    notAfter: cert.notAfter.value.toISOString(),
    expired: cert.notAfter.value.getTime() < Date.now(),
  };
}

function serialHex(cert: Certificate): string {
  const view = cert.serialNumber.valueBlock.valueHexView;
  return [...view].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readOidExtension(
  cert: Certificate,
  oid: string,
): string | undefined {
  const ext = (cert.extensions ?? []).find((e) => e.extnID === oid);
  if (!ext) return undefined;
  // Apple wraps the value in an OctetString; the inner bytes are typically
  // an ASN.1 IA5String/UTF8String. Try to decode either by parsing the inner
  // BER, falling back to skipping a 2-byte BER prefix and reading as ASCII.
  const raw = ext.extnValue.valueBlock.valueHexView;
  try {
    const inner = asn1js.fromBER(toArrayBuffer(raw));
    if (inner.offset !== -1) {
      const v = (inner.result.valueBlock as { value?: string }).value;
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch {
    // fall through
  }
  if (raw.length > 2) {
    return new TextDecoder("ascii").decode(raw.slice(2));
  }
  return undefined;
}

function readSigningTime(signedData: SignedData): Date | undefined {
  const signer = signedData.signerInfos[0];
  const attrs = signer?.signedAttrs?.attributes ?? [];
  // signing-time attribute OID
  const SIGNING_TIME_OID = "1.2.840.113549.1.9.5";
  const attr = attrs.find((a) => a.type === SIGNING_TIME_OID);
  if (!attr || attr.values.length === 0) return undefined;
  const v = attr.values[0] as { toDate?: () => Date };
  return typeof v.toDate === "function" ? v.toDate() : undefined;
}

function oidName(oid?: string): string | undefined {
  if (!oid) return undefined;
  const map: Record<string, string> = {
    "1.3.14.3.2.26": "SHA-1",
    "2.16.840.1.101.3.4.2.1": "SHA-256",
    "2.16.840.1.101.3.4.2.2": "SHA-384",
    "2.16.840.1.101.3.4.2.3": "SHA-512",
  };
  return map[oid] ?? oid;
}
