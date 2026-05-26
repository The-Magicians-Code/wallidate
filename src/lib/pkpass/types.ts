export type PassStyle =
  | "boardingPass"
  | "coupon"
  | "eventTicket"
  | "generic"
  | "storeCard";

export type BarcodeFormat =
  | "PKBarcodeFormatQR"
  | "PKBarcodeFormatPDF417"
  | "PKBarcodeFormatAztec"
  | "PKBarcodeFormatCode128";

export type TransitType =
  | "PKTransitTypeAir"
  | "PKTransitTypeBoat"
  | "PKTransitTypeBus"
  | "PKTransitTypeGeneric"
  | "PKTransitTypeTrain";

export type DataDetectorType =
  | "PKDataDetectorTypePhoneNumber"
  | "PKDataDetectorTypeLink"
  | "PKDataDetectorTypeAddress"
  | "PKDataDetectorTypeCalendarEvent";

export type TextAlignment =
  | "PKTextAlignmentLeft"
  | "PKTextAlignmentCenter"
  | "PKTextAlignmentRight"
  | "PKTextAlignmentNatural";

export interface PassField {
  key: string;
  label?: string;
  value: string | number;
  attributedValue?: string;
  changeMessage?: string;
  textAlignment?: TextAlignment;
  dataDetectorTypes?: DataDetectorType[];
  currencyCode?: string;
  numberStyle?: string;
  dateStyle?: string;
  timeStyle?: string;
  isRelative?: boolean;
  ignoresTimeZone?: boolean;
  row?: number;
}

export interface PassStructure {
  headerFields?: PassField[];
  primaryFields?: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  backFields?: PassField[];
  transitType?: TransitType;
}

export interface Barcode {
  format: BarcodeFormat;
  message: string;
  messageEncoding: string;
  altText?: string;
}

export interface PassLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface PassBeacon {
  proximityUUID: string;
  major?: number;
  minor?: number;
  relevantText?: string;
}

export interface PassNfc {
  message: string;
  encryptionPublicKey?: string;
  requiresAuthentication?: boolean;
}

export interface PassJson {
  formatVersion: 1;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;

  logoText?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  groupingIdentifier?: string;
  suppressStripShine?: boolean;
  sharingProhibited?: boolean;
  voided?: boolean;

  appLaunchURL?: string;
  associatedStoreIdentifiers?: number[];
  userInfo?: Record<string, unknown>;

  expirationDate?: string;
  relevantDate?: string;
  maxDistance?: number;

  locations?: PassLocation[];
  beacons?: PassBeacon[];
  nfc?: PassNfc;

  barcode?: Barcode;
  barcodes?: Barcode[];

  webServiceURL?: string;
  authenticationToken?: string;

  boardingPass?: PassStructure;
  coupon?: PassStructure;
  eventTicket?: PassStructure;
  generic?: PassStructure;
  storeCard?: PassStructure;
}

export type ImageName =
  | "icon"
  | "logo"
  | "strip"
  | "thumbnail"
  | "background"
  | "footer";

export type ImageDensity = "1x" | "2x" | "3x";

export interface PassImage {
  name: ImageName;
  density: ImageDensity;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ManifestEntry {
  path: string;
  expectedSha1: string;
  actualSha1: string;
  matches: boolean;
  bytes: number;
}

export interface ParsedPass {
  source: "upload" | "sample";
  pass: PassJson;
  style: PassStyle;
  structure: PassStructure;
  images: Map<string, PassImage>;
  manifest: ManifestEntry[];
  hasSignature: boolean;
  signatureBytes: number;
  localizations: string[];
  fileCount: number;
  totalBytes: number;
  rawFiles: string[];
  sampleNote?: string;
  brandIcon?: BrandIconName;
}

export type BrandIconName =
  | "festival"
  | "plane"
  | "coffee"
  | "tag"
  | "museum";

export type Severity = "error" | "warning" | "info" | "unsupported";

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  hint?: string;
}

export interface ValidationResult {
  ok: boolean;
  checkedAt: number;
  issues: ValidationIssue[];
  counts: Record<Severity, number>;
}

export const DEFAULT_BACKGROUND = "rgb(245, 245, 247)";
export const DEFAULT_FOREGROUND = "rgb(20, 20, 22)";
export const DEFAULT_LABEL = "rgb(99, 99, 102)";
