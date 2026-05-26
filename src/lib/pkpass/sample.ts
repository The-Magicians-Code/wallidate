import type {
  Barcode,
  ParsedPass,
  PassJson,
  PassStructure,
  PassStyle,
} from "./types";

export interface SampleTemplate {
  id: string;
  label: string;
  build(): ParsedPass;
}

const TEAM = "WLLDT82XYZ";
const SAMPLE_NOTE = "Synthetic sample. Not signed; not a real pkpass.";

function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function makeBarcode(
  format: Barcode["format"],
  message: string,
  altText?: string,
): Barcode {
  return {
    format,
    message,
    messageEncoding: "iso-8859-1",
    ...(altText ? { altText } : {}),
  };
}

function styleStructure(pass: PassJson, style: PassStyle): PassStructure {
  return (pass[style] ?? {}) as PassStructure;
}

function wrap(pass: PassJson, style: PassStyle): ParsedPass {
  return {
    source: "sample",
    pass,
    style,
    structure: styleStructure(pass, style),
    images: new Map(),
    manifest: [],
    hasSignature: false,
    signatureBytes: 0,
    localizations: [],
    fileCount: 0,
    totalBytes: 0,
    rawFiles: [],
    sampleNote: SAMPLE_NOTE,
  };
}

function buildIndieFestival(): ParsedPass {
  const barcode = makeBarcode(
    "PKBarcodeFormatQR",
    "TKT-7Q9R-2C-SOLSTICE-2026",
    "TKT-7Q9R-2C",
  );
  const pass: PassJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.wallidate.sample.indiefestival",
    serialNumber: uid("SOL"),
    teamIdentifier: TEAM,
    organizationName: "Solstice Sound Festival",
    description: "Solstice Sound 2026 — General Admission",
    logoText: "Solstice Sound",
    backgroundColor: "rgb(214, 31, 122)",
    foregroundColor: "rgb(255, 246, 240)",
    labelColor: "rgb(255, 214, 184)",
    relevantDate: "2026-06-20T18:00:00-07:00",
    expirationDate: "2026-12-31T23:59:59Z",
    barcode,
    barcodes: [barcode],
    eventTicket: {
      headerFields: [
        { key: "gate", label: "GATE", value: "EAST" },
      ],
      primaryFields: [
        { key: "event", label: "EVENT", value: "Solstice Sound 2026" },
      ],
      secondaryFields: [
        { key: "loc", label: "VENUE", value: "Pier 70, San Francisco" },
        { key: "doors", label: "DOORS", value: "6:00 PM" },
      ],
      auxiliaryFields: [
        { key: "section", label: "SECTION", value: "GA" },
        { key: "row", label: "ROW", value: "PIT" },
        { key: "seat", label: "SEAT", value: "STAND" },
      ],
      backFields: [
        {
          key: "lineup",
          label: "Headliners",
          value: "Phantogram • Caribou • Beach House • Jamie xx",
        },
        {
          key: "policy",
          label: "Entry Policy",
          value:
            "18+. Valid photo ID required. No re-entry after 11 PM. Bag size limit 12\"x12\".",
        },
        {
          key: "contact",
          label: "Box Office",
          value: "support@solsticesound.example",
        },
      ],
    },
  };
  return wrap(pass, "eventTicket");
}

function buildTransatlantic(): ParsedPass {
  const barcode = makeBarcode(
    "PKBarcodeFormatPDF417",
    "M1DOE/JANE          EABC123 SFOLHR AA0136 172Y014A0003 100",
    "AA 136 • SFO → LHR",
  );
  const pass: PassJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.wallidate.sample.transatlantic",
    serialNumber: uid("BP"),
    teamIdentifier: TEAM,
    organizationName: "Atlantic Airways",
    description: "Boarding Pass • SFO → LHR",
    logoText: "Atlantic Airways",
    backgroundColor: "rgb(14, 27, 58)",
    foregroundColor: "rgb(244, 247, 255)",
    labelColor: "rgb(150, 175, 220)",
    relevantDate: "2026-06-21T20:30:00-07:00",
    barcode,
    barcodes: [barcode],
    boardingPass: {
      transitType: "PKTransitTypeAir",
      headerFields: [
        { key: "flight", label: "FLIGHT", value: "AA 136" },
      ],
      primaryFields: [
        { key: "from", label: "SAN FRANCISCO", value: "SFO" },
        { key: "to", label: "LONDON", value: "LHR" },
      ],
      secondaryFields: [
        { key: "passenger", label: "PASSENGER", value: "JANE DOE" },
        { key: "class", label: "CLASS", value: "ECONOMY" },
      ],
      auxiliaryFields: [
        { key: "gate", label: "GATE", value: "A14" },
        { key: "boarding", label: "BOARDS", value: "8:30 PM" },
        { key: "seat", label: "SEAT", value: "14A" },
        { key: "group", label: "GROUP", value: "3" },
      ],
      backFields: [
        {
          key: "depart",
          label: "Departs",
          value: "Sun, Jun 21, 2026 • 9:05 PM PDT",
        },
        {
          key: "arrive",
          label: "Arrives",
          value: "Mon, Jun 22, 2026 • 3:25 PM BST",
        },
        {
          key: "confirmation",
          label: "Confirmation",
          value: "EABC123",
        },
        {
          key: "baggage",
          label: "Baggage Allowance",
          value: "1 carry-on (10kg) + 1 personal item",
        },
      ],
    },
  };
  return wrap(pass, "boardingPass");
}

function buildCornerCoffee(): ParsedPass {
  const barcode = makeBarcode(
    "PKBarcodeFormatAztec",
    "CC-MEMBER-4471-8820-2233",
    "Member #4471-8820",
  );
  const pass: PassJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.wallidate.sample.cornercoffee",
    serialNumber: uid("CC"),
    teamIdentifier: TEAM,
    organizationName: "Corner Coffee Roasters",
    description: "Corner Coffee Member Card",
    logoText: "Corner Coffee",
    backgroundColor: "rgb(243, 232, 211)",
    foregroundColor: "rgb(58, 32, 18)",
    labelColor: "rgb(126, 80, 48)",
    relevantDate: isoDaysFromNow(0),
    barcode,
    barcodes: [barcode],
    storeCard: {
      headerFields: [
        {
          key: "balance",
          label: "BALANCE",
          value: 42.5,
          currencyCode: "USD",
        },
      ],
      primaryFields: [
        { key: "member", label: "MEMBER", value: "Alex Rivera" },
      ],
      secondaryFields: [
        { key: "since", label: "MEMBER SINCE", value: "Mar 2024" },
        { key: "tier", label: "TIER", value: "Roaster" },
      ],
      auxiliaryFields: [
        { key: "stars", label: "STARS", value: "128" },
        { key: "next", label: "NEXT REWARD", value: "2 drinks" },
      ],
      backFields: [
        {
          key: "perks",
          label: "Member Perks",
          value:
            "Free refills on drip coffee in-store. Earn 1 star per $1. Bonus star on every Tuesday visit.",
        },
        {
          key: "reload",
          label: "Reload",
          value: "Reload your balance from the Corner Coffee app.",
        },
        {
          key: "contact",
          label: "Support",
          value: "hello@cornercoffee.example",
        },
      ],
    },
  };
  return wrap(pass, "storeCard");
}

function buildSpringPromo(): ParsedPass {
  const barcode = makeBarcode(
    "PKBarcodeFormatCode128",
    "SPRING30-7M2K-9XQ1",
    "SPRING30",
  );
  const pass: PassJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.wallidate.sample.springpromo",
    serialNumber: uid("SPR"),
    teamIdentifier: TEAM,
    organizationName: "Meadowlark Goods",
    description: "30% Off Everything — Spring Promo",
    logoText: "Meadowlark",
    backgroundColor: "rgb(196, 232, 213)",
    foregroundColor: "rgb(24, 64, 48)",
    labelColor: "rgb(64, 120, 96)",
    relevantDate: isoDaysFromNow(1),
    expirationDate: isoDaysFromNow(30),
    barcode,
    barcodes: [barcode],
    coupon: {
      headerFields: [
        { key: "code", label: "CODE", value: "SPRING30" },
      ],
      primaryFields: [
        { key: "offer", label: "OFFER", value: "30% OFF Everything" },
      ],
      secondaryFields: [
        { key: "expires", label: "EXPIRES", value: "30 days" },
        { key: "min", label: "MIN. ORDER", value: "$25" },
      ],
      auxiliaryFields: [
        { key: "where", label: "WHERE", value: "Online + In-store" },
      ],
      backFields: [
        {
          key: "terms",
          label: "Terms",
          value:
            "One use per customer. Cannot combine with other offers. Excludes gift cards and clearance items.",
        },
        {
          key: "redeem",
          label: "Redeem",
          value:
            "Show this pass at checkout in-store, or enter SPRING30 at meadowlark.example.",
        },
      ],
    },
  };
  return wrap(pass, "coupon");
}

function buildMuseumEntry(): ParsedPass {
  const barcode = makeBarcode(
    "PKBarcodeFormatQR",
    "MAM-MEMBER-2026-558102",
    "Member 558102",
  );
  const pass: PassJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.wallidate.sample.museumentry",
    serialNumber: uid("MAM"),
    teamIdentifier: TEAM,
    organizationName: "Marin Art Museum",
    description: "Marin Art Museum — Membership",
    logoText: "Marin Art Museum",
    backgroundColor: "rgb(96, 36, 44)",
    foregroundColor: "rgb(248, 240, 232)",
    labelColor: "rgb(216, 168, 168)",
    relevantDate: isoDaysFromNow(0),
    barcode,
    barcodes: [barcode],
    generic: {
      headerFields: [
        { key: "level", label: "LEVEL", value: "Patron" },
      ],
      primaryFields: [
        { key: "member", label: "MEMBER", value: "Sasha Nilsen" },
      ],
      secondaryFields: [
        { key: "since", label: "MEMBER SINCE", value: "2022" },
        { key: "valid", label: "VALID THROUGH", value: "Dec 2026" },
      ],
      auxiliaryFields: [
        { key: "guests", label: "GUESTS", value: "+2" },
      ],
      backFields: [
        {
          key: "perks",
          label: "Membership Perks",
          value:
            "Unlimited general admission. Two guest passes per visit. 10% off in the museum shop and cafe.",
        },
        {
          key: "hours",
          label: "Hours",
          value: "Tue–Sun 10am–6pm. Closed Mondays and major holidays.",
        },
        {
          key: "address",
          label: "Visit",
          value: "1147 Bay Road, Sausalito, CA 94965",
        },
      ],
    },
  };
  return wrap(pass, "generic");
}

export const SAMPLE_TEMPLATES: SampleTemplate[] = [
  { id: "indie-festival", label: "Indie Festival Ticket", build: buildIndieFestival },
  { id: "transatlantic", label: "Transatlantic Boarding Pass", build: buildTransatlantic },
  { id: "corner-coffee", label: "Corner Coffee Member Card", build: buildCornerCoffee },
  { id: "spring-promo", label: "Spring Promo Coupon", build: buildSpringPromo },
  { id: "museum-entry", label: "Museum Membership", build: buildMuseumEntry },
];

export function pickRandomSample(): ParsedPass {
  const idx = Math.floor(Math.random() * SAMPLE_TEMPLATES.length);
  return SAMPLE_TEMPLATES[idx].build();
}

export function buildSampleById(id: string): ParsedPass | undefined {
  return SAMPLE_TEMPLATES.find((t) => t.id === id)?.build();
}
