import type {
  ParsedPass,
  PassJson,
  PassStyle,
  Barcode,
  ValidationIssue,
  ValidationResult,
  Severity,
} from "./types";

const STYLE_KEYS: PassStyle[] = [
  "boardingPass",
  "coupon",
  "eventTicket",
  "generic",
  "storeCard",
];

const ALLOWED_BARCODE_FORMATS = new Set([
  "PKBarcodeFormatQR",
  "PKBarcodeFormatPDF417",
  "PKBarcodeFormatAztec",
  "PKBarcodeFormatCode128",
]);

const ALLOWED_TRANSIT_TYPES = new Set([
  "PKTransitTypeAir",
  "PKTransitTypeBoat",
  "PKTransitTypeBus",
  "PKTransitTypeGeneric",
  "PKTransitTypeTrain",
]);

const COLOR_RE = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
const REVERSE_DNS_RE = /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)+$/;
const TEAM_ID_RE = /^[A-Z0-9]{10}$/;

export function validatePass(parsed: ParsedPass): ValidationResult {
  const issues: ValidationIssue[] = [];
  const pass = parsed.pass as PassJson & Record<string, unknown>;

  const err = (code: string, message: string, path?: string, hint?: string) =>
    issues.push({ severity: "error", code, message, path, hint });
  const warn = (code: string, message: string, path?: string, hint?: string) =>
    issues.push({ severity: "warning", code, message, path, hint });
  const info = (code: string, message: string, path?: string, hint?: string) =>
    issues.push({ severity: "info", code, message, path, hint });
  const unsupported = (code: string, message: string, path?: string, hint?: string) =>
    issues.push({ severity: "unsupported", code, message, path, hint });

  // --- Errors ---

  // 1. formatVersion
  if (pass.formatVersion !== 1) {
    err(
      "pass.formatVersion",
      `formatVersion must be 1 (got ${JSON.stringify(pass.formatVersion)}).`,
      "formatVersion",
    );
  }

  // 2. Required top-level strings
  const required: (keyof PassJson)[] = [
    "passTypeIdentifier",
    "serialNumber",
    "teamIdentifier",
    "organizationName",
    "description",
  ];
  for (const field of required) {
    const v = pass[field as string];
    if (typeof v !== "string" || v.trim() === "") {
      err(
        `pass.${String(field)}.missing`,
        `Required field \`${String(field)}\` is missing or empty.`,
        String(field),
      );
    }
  }

  // 3. Exactly one pass style key
  const presentStyles = STYLE_KEYS.filter(
    (k) => pass[k] !== undefined && pass[k] !== null,
  );
  if (presentStyles.length === 0) {
    err(
      "pass.style.missing",
      "No pass style detected. Exactly one of boardingPass, coupon, eventTicket, generic, or storeCard must be present.",
    );
  } else if (presentStyles.length > 1) {
    err(
      "pass.style.multiple",
      `Multiple pass style keys present: ${presentStyles.join(", ")}. Exactly one is allowed.`,
    );
  }

  // 4. icon image present
  let hasIcon = false;
  for (const key of parsed.images.keys()) {
    if (key.startsWith("icon@")) {
      hasIcon = true;
      break;
    }
  }
  if (!hasIcon) {
    err(
      "manifest.icon.missing",
      "Required `icon.png` (or @2x/@3x variant) image is missing from the package.",
    );
  }

  // 5. Manifest hash mismatches
  for (const entry of parsed.manifest) {
    if (entry.matches === false) {
      err(
        "manifest.hash.mismatch",
        `Manifest hash mismatch for \`${entry.path}\` (expected ${entry.expectedSha1}, got ${entry.actualSha1 || "<missing>"}).`,
        entry.path,
      );
    }
  }

  // 6/7. Barcodes
  const checkBarcode = (b: Barcode | undefined, path: string) => {
    if (!b || typeof b !== "object") {
      err("barcode.invalid", `Barcode at \`${path}\` is not an object.`, path);
      return;
    }
    if (!ALLOWED_BARCODE_FORMATS.has(b.format as string)) {
      err(
        "barcode.format.invalid",
        `Barcode format \`${String(b.format)}\` at \`${path}\` is not one of PKBarcodeFormatQR/PDF417/Aztec/Code128.`,
        path,
      );
    }
    if (typeof b.message !== "string" || b.message === "") {
      err(
        "barcode.message.missing",
        `Barcode at \`${path}\` is missing a non-empty \`message\`.`,
        path,
      );
    }
    if (typeof b.messageEncoding !== "string" || b.messageEncoding === "") {
      err(
        "barcode.messageEncoding.missing",
        `Barcode at \`${path}\` is missing a non-empty \`messageEncoding\` (e.g. \`iso-8859-1\`).`,
        path,
      );
    }
  };

  if (Array.isArray(pass.barcodes)) {
    pass.barcodes.forEach((b, i) => checkBarcode(b, `barcodes[${i}]`));
  }
  if (pass.barcode !== undefined) {
    checkBarcode(pass.barcode, "barcode");
  }

  // 8. boardingPass requires transitType
  if (parsed.style === "boardingPass") {
    const tt = parsed.structure?.transitType;
    if (!tt || !ALLOWED_TRANSIT_TYPES.has(tt as string)) {
      err(
        "boardingPass.transitType.invalid",
        tt
          ? `boardingPass.transitType \`${tt}\` is not one of PKTransitTypeAir/Boat/Bus/Generic/Train.`
          : "boardingPass requires a `transitType` (PKTransitTypeAir/Boat/Bus/Generic/Train).",
        "boardingPass.transitType",
      );
    }
  }

  // --- Warnings ---

  // 1/2. manifest.json / signature presence inferred from rawFiles
  const hasManifestFile = parsed.rawFiles.includes("manifest.json");
  if (!hasManifestFile) {
    warn(
      "manifest.missing",
      "`manifest.json` is missing — hash integrity checks were skipped.",
      "manifest.json",
    );
  }
  if (!parsed.hasSignature) {
    warn(
      "signature.missing",
      "`signature` file is missing from the package.",
      "signature",
    );
  } else {
    // 3. Signature unverifiable info
    info(
      "signature.unverifiable",
      `Signature blob present (${parsed.signatureSize} bytes). Cryptographic verification runs asynchronously — see the Signature panel below.`,
      "signature",
    );
  }

  // 4. passTypeIdentifier reverse-DNS shape
  if (typeof pass.passTypeIdentifier === "string" && pass.passTypeIdentifier !== "") {
    if (!REVERSE_DNS_RE.test(pass.passTypeIdentifier)) {
      warn(
        "passTypeIdentifier.shape",
        `\`passTypeIdentifier\` should look like reverse-DNS (e.g. \`pass.com.example.foo\`); got \`${pass.passTypeIdentifier}\`.`,
        "passTypeIdentifier",
      );
    }
  }

  // 5. teamIdentifier 10 alphanumeric uppercase
  if (typeof pass.teamIdentifier === "string" && pass.teamIdentifier !== "") {
    if (!TEAM_ID_RE.test(pass.teamIdentifier)) {
      warn(
        "teamIdentifier.shape",
        `\`teamIdentifier\` should be 10 uppercase alphanumeric characters; got \`${pass.teamIdentifier}\`.`,
        "teamIdentifier",
      );
    }
  }

  // 5a. serialNumber length — Apple recommends >= 16 chars for uniqueness
  if (typeof pass.serialNumber === "string" && pass.serialNumber.length < 16) {
    warn(
      "serialNumber.short",
      `\`serialNumber\` is ${pass.serialNumber.length} chars; Apple recommends 16+ for uniqueness across passes.`,
      "serialNumber",
    );
  }

  // 5b. authenticationToken length — Apple requires >= 16 chars
  if (
    typeof pass.authenticationToken === "string" &&
    pass.authenticationToken.length > 0 &&
    pass.authenticationToken.length < 16
  ) {
    err(
      "authenticationToken.short",
      `\`authenticationToken\` is ${pass.authenticationToken.length} chars; Apple requires at least 16.`,
      "authenticationToken",
    );
  }

  // 6. Color fields
  for (const field of ["backgroundColor", "foregroundColor", "labelColor"] as const) {
    const v = pass[field];
    if (v !== undefined && v !== null) {
      if (typeof v !== "string" || !COLOR_RE.test(v)) {
        warn(
          `color.${field}.invalid`,
          `\`${field}\` should match \`rgb(R, G, B)\`; got \`${String(v)}\`.`,
          field,
        );
      }
    }
  }

  // 7. logo.png present
  let hasLogo = false;
  for (const key of parsed.images.keys()) {
    if (key.startsWith("logo@")) {
      hasLogo = true;
      break;
    }
  }
  if (!hasLogo) {
    warn(
      "logo.missing",
      "`logo.png` (any density) is missing — most pass styles display the logo in the header.",
    );
  }

  // 8. Style structure primaryFields
  if (presentStyles.length === 1) {
    const style = presentStyles[0];
    if (style !== "storeCard") {
      const struct = parsed.structure;
      const primary = struct?.primaryFields;
      if (!Array.isArray(primary) || primary.length === 0) {
        warn(
          "structure.primaryFields.missing",
          `\`${style}.primaryFields\` is missing or empty.`,
          `${style}.primaryFields`,
        );
      }
    }
  }

  // 9. Date fields parseable
  for (const field of ["expirationDate", "relevantDate"] as const) {
    const v = pass[field];
    if (v !== undefined && v !== null) {
      const d = new Date(v as string);
      if (Number.isNaN(d.getTime())) {
        warn(
          `date.${field}.invalid`,
          `\`${field}\` is not a valid date: \`${String(v)}\`. Expected ISO-8601 (e.g. \`2025-12-31T23:59:59Z\`).`,
          field,
        );
      }
    }
  }

  // 10. Legacy barcode without modern barcodes
  if (pass.barcode !== undefined && !Array.isArray(pass.barcodes)) {
    warn(
      "barcode.legacy",
      "Legacy `barcode` field used. iOS 9+ prefers the `barcodes` array.",
      "barcode",
    );
  }

  // 11. webServiceURL / authenticationToken pairing
  const hasWebUrl =
    typeof pass.webServiceURL === "string" && pass.webServiceURL !== "";
  const hasAuthToken =
    typeof pass.authenticationToken === "string" && pass.authenticationToken !== "";
  if (hasWebUrl !== hasAuthToken) {
    warn(
      "webService.pair",
      hasWebUrl
        ? "`webServiceURL` is present but `authenticationToken` is missing — pass updates will fail."
        : "`authenticationToken` is present but `webServiceURL` is missing — pass updates will fail.",
    );
  }

  // 12. webServiceURL must be https
  if (hasWebUrl && pass.webServiceURL!.startsWith("http://")) {
    warn(
      "webServiceURL.insecure",
      "`webServiceURL` must use `https://`. Apple Wallet rejects insecure update endpoints.",
      "webServiceURL",
    );
  }

  // --- Info ---

  // 1. voided
  if (pass.voided === true) {
    info("pass.voided", "Pass is marked voided.", "voided");
  }

  // 2. nfc
  if (pass.nfc !== undefined && pass.nfc !== null) {
    info(
      "pass.nfc",
      "NFC payload present — requires Apple-issued NFC entitlement.",
      "nfc",
    );
  }

  // 3. Localizations
  if (parsed.localizations.length > 0) {
    info(
      "localizations.detected",
      `Localizations detected: ${parsed.localizations.join(", ")}.`,
    );
  }

  // 4. Package size and file count
  info(
    "package.size",
    `Package: ${parsed.fileCount} files, ${parsed.totalBytes} bytes.`,
  );

  // --- Unsupported ---

  // 1. relevantDates (plural)
  if ((pass as Record<string, unknown>).relevantDates !== undefined) {
    unsupported(
      "relevantDates.unsupported",
      "`relevantDates` not validated.",
      "relevantDates",
      "iOS 18+ multi-relevant-date array is not yet supported by this validator.",
    );
  }

  // 2. Poster event ticket
  if ((pass as Record<string, unknown>).preferredStyleSchemes !== undefined) {
    unsupported(
      "preferredStyleSchemes.unsupported",
      "Poster event ticket fields (`preferredStyleSchemes`) are not validated.",
      "preferredStyleSchemes",
    );
  }

  // --- Tally ---
  const counts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
    unsupported: 0,
  };
  for (const i of issues) counts[i.severity]++;

  return {
    ok: counts.error === 0,
    checkedAt: Date.now(),
    issues,
    counts,
  };
}
