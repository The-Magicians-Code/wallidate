import JSZip from "jszip";
import type {
  ImageDensity,
  ImageName,
  ManifestEntry,
  ParsedPass,
  PassImage,
  PassJson,
  PassStructure,
  PassStyle,
} from "./types";

const MAX_PKPASS_BYTES = 25 * 1024 * 1024;
const MAX_FILE_COUNT = 200;
const IMAGE_NAMES: ImageName[] = [
  "icon",
  "logo",
  "strip",
  "thumbnail",
  "background",
  "footer",
];

export class PkpassParseError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "PkpassParseError";
  }
}

export async function parsePkpass(file: File | Blob): Promise<ParsedPass> {
  if (file.size > MAX_PKPASS_BYTES) {
    throw new PkpassParseError(
      `File too large (${formatBytes(file.size)}). Limit is ${formatBytes(MAX_PKPASS_BYTES)}.`,
      "file-too-large",
    );
  }

  const buffer = await file.arrayBuffer();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    throw new PkpassParseError(
      `Not a valid ZIP archive: ${(err as Error).message}`,
      "invalid-zip",
    );
  }

  const entries = Object.values(zip.files).filter((e) => !e.dir);
  if (entries.length > MAX_FILE_COUNT) {
    throw new PkpassParseError(
      `Archive contains ${entries.length} files (limit ${MAX_FILE_COUNT}).`,
      "too-many-files",
    );
  }

  const fileMap = new Map<string, Uint8Array>();
  let totalBytes = 0;
  for (const entry of entries) {
    const bytes = await entry.async("uint8array");
    totalBytes += bytes.byteLength;
    fileMap.set(entry.name, bytes);
  }

  const passBytes = fileMap.get("pass.json");
  if (!passBytes) {
    throw new PkpassParseError(
      "Missing pass.json at the package root.",
      "missing-pass-json",
    );
  }

  let pass: PassJson;
  try {
    pass = JSON.parse(new TextDecoder("utf-8").decode(passBytes)) as PassJson;
  } catch (err) {
    throw new PkpassParseError(
      `pass.json is not valid JSON: ${(err as Error).message}`,
      "invalid-pass-json",
    );
  }

  const style = detectStyle(pass);
  const structure = style ? (pass[style] ?? {}) : {};

  const manifest = await buildManifest(fileMap);
  const images = buildImages(fileMap);
  const localizations = detectLocalizations(fileMap);
  const signatureBytes = fileMap.get("signature")?.byteLength ?? 0;

  return {
    source: "upload",
    pass,
    style: style ?? "generic",
    structure,
    images,
    manifest,
    hasSignature: signatureBytes > 0,
    signatureBytes,
    localizations,
    fileCount: entries.length,
    totalBytes,
    rawFiles: [...fileMap.keys()].sort(),
  };
}

function detectStyle(pass: PassJson): PassStyle | undefined {
  const styles: PassStyle[] = [
    "boardingPass",
    "coupon",
    "eventTicket",
    "generic",
    "storeCard",
  ];
  return styles.find((s) => pass[s]);
}

async function buildManifest(
  files: Map<string, Uint8Array>,
): Promise<ManifestEntry[]> {
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) return [];

  let manifest: Record<string, string>;
  try {
    manifest = JSON.parse(new TextDecoder("utf-8").decode(manifestBytes));
  } catch {
    return [];
  }

  const entries: ManifestEntry[] = [];
  for (const [path, expectedSha1] of Object.entries(manifest)) {
    const bytes = files.get(path);
    if (!bytes) {
      entries.push({
        path,
        expectedSha1,
        actualSha1: "",
        matches: false,
        bytes: 0,
      });
      continue;
    }
    const actualSha1 = await sha1Hex(bytes);
    entries.push({
      path,
      expectedSha1: expectedSha1.toLowerCase(),
      actualSha1,
      matches: actualSha1 === expectedSha1.toLowerCase(),
      bytes: bytes.byteLength,
    });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", bytes as unknown as BufferSource);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildImages(files: Map<string, Uint8Array>): Map<string, PassImage> {
  const out = new Map<string, PassImage>();
  for (const [path, bytes] of files) {
    if (!path.endsWith(".png")) continue;
    if (path.includes("/") && !path.includes(".lproj/")) continue;
    const base = path.split("/").pop() ?? path;
    const match = base.match(/^([a-z]+)(?:@([23])x)?\.png$/i);
    if (!match) continue;
    const name = match[1] as ImageName;
    if (!IMAGE_NAMES.includes(name)) continue;
    const density: ImageDensity = match[2] ? (`${match[2]}x` as ImageDensity) : "1x";

    const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const key = path.includes(".lproj/") ? path : `${name}@${density}`;

    out.set(key, {
      name,
      density,
      url,
      width: 0,
      height: 0,
      bytes: bytes.byteLength,
    });
  }
  return out;
}

function detectLocalizations(files: Map<string, Uint8Array>): string[] {
  const langs = new Set<string>();
  for (const path of files.keys()) {
    const m = path.match(/^([a-zA-Z_-]+)\.lproj\//);
    if (m) langs.add(m[1]);
  }
  return [...langs].sort();
}

export function pickImage(
  images: Map<string, PassImage>,
  name: ImageName,
): PassImage | undefined {
  const densities: ImageDensity[] = ["3x", "2x", "1x"];
  for (const d of densities) {
    const img = images.get(`${name}@${d}`);
    if (img) return img;
  }
  return undefined;
}

export function disposePass(parsed: ParsedPass): void {
  for (const img of parsed.images.values()) {
    if (img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
