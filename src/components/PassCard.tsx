import type { JSX } from "preact";
import type {
  ParsedPass,
  PassField,
  PassJson,
  PassStructure,
  PassStyle,
} from "../lib/pkpass/types";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
  DEFAULT_LABEL,
} from "../lib/pkpass/types";
import { pickImage } from "../lib/pkpass/parse";
import {
  Field,
  FieldRow,
  HeaderFields,
  PrimaryFields,
  formatValue,
} from "./PassCardFields";
import PassBarcode from "./PassBarcode";
import BrandIcon from "./BrandIcon";

interface PassCardProps {
  parsed: ParsedPass;
}

function pickBarcode(pass: PassJson): PassJson["barcode"] | undefined {
  if (pass.barcodes && pass.barcodes.length > 0) return pass.barcodes[0];
  return pass.barcode;
}

function transitLabel(t?: string): string {
  switch (t) {
    case "PKTransitTypeAir":
      return "✈︎ Flight";
    case "PKTransitTypeTrain":
      return "🚆 Train";
    case "PKTransitTypeBus":
      return "🚌 Bus";
    case "PKTransitTypeBoat":
      return "⛴ Boat";
    default:
      return "Transit";
  }
}

function logoFallback(pass: PassJson): string {
  if (pass.logoText) return pass.logoText;
  const initial = (pass.organizationName?.[0] ?? "W").toUpperCase();
  return initial;
}

function TopStrip({
  parsed,
}: {
  parsed: ParsedPass;
}): JSX.Element {
  const { pass, images, brandIcon } = parsed;
  const logo = pickImage(images, "logo");

  return (
    <div class="pass__top">
      <div class="pass__logo">
        {logo ? (
          <img
            class="pass__logo-img"
            src={logo.url}
            alt={pass.logoText ?? pass.organizationName ?? "Logo"}
          />
        ) : (
          <>
            <span class="pass__logo-mark">
              {brandIcon ? (
                <BrandIcon name={brandIcon} class="pass__logo-mark-svg" />
              ) : (
                <span class="pass__logo-mark-letter">
                  {(pass.organizationName ?? "W").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            {pass.logoText && (
              <span class="pass__logo-text">{pass.logoText}</span>
            )}
          </>
        )}
      </div>
      <HeaderFields fields={parsed.structure.headerFields} />
    </div>
  );
}

function BottomChrome({ parsed }: { parsed: ParsedPass }): JSX.Element {
  const { pass, images, brandIcon } = parsed;
  const icon = pickImage(images, "icon");
  return (
    <div class="pass__chrome">
      <span
        class="pass__brand-mark"
        aria-label={pass.organizationName ?? "Pass"}
      >
        {icon ? (
          <img class="pass__brand-mark-img" src={icon.url} alt="" />
        ) : brandIcon ? (
          <BrandIcon name={brandIcon} class="pass__brand-mark-svg" />
        ) : (
          <span class="pass__brand-mark-letter" aria-hidden="true">
            {logoFallback(pass).charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <NfcGlyph />
    </div>
  );
}

function NfcGlyph(): JSX.Element {
  return (
    <svg
      class="pass__nfc"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M5 5 Q9 10 5 15" opacity="0.45" />
      <path d="M9 3 Q15 10 9 17" opacity="0.7" />
      <path d="M13 1 Q21 10 13 19" />
    </svg>
  );
}

function BoardingPrimary({
  fields,
}: {
  fields?: PassField[];
}): JSX.Element | null {
  if (!fields || fields.length === 0) return null;
  const [from, to] = fields;
  if (!from) return null;
  return (
    <div class="pass__boarding-primary">
      <div class="boarding-col">
        {from.label && <p class="field__label">{from.label}</p>}
        <p class="field__value">{formatValue(from)}</p>
      </div>
      <div class="pass__boarding-arrow" aria-hidden="true">
        →
      </div>
      <div class="boarding-col boarding-col--right">
        {to?.label && <p class="field__label">{to.label}</p>}
        {to ? <p class="field__value">{formatValue(to)}</p> : <p class="field__value">—</p>}
      </div>
    </div>
  );
}

function StyleBody({
  style,
  structure,
  parsed,
}: {
  style: PassStyle;
  structure: PassStructure;
  parsed: ParsedPass;
}): JSX.Element {
  const strip = pickImage(parsed.images, "strip");
  const thumbnail = pickImage(parsed.images, "thumbnail");

  if (style === "boardingPass") {
    return (
      <>
        {structure.transitType && (
          <div class="pass__transit-type">
            {transitLabel(structure.transitType)}
          </div>
        )}
        <BoardingPrimary fields={structure.primaryFields} />
        <FieldRow fields={structure.auxiliaryFields} max={4} />
        <FieldRow fields={structure.secondaryFields} max={4} />
      </>
    );
  }

  if (style === "eventTicket") {
    return (
      <>
        {strip && (
          <img
            class="pass__strip"
            src={strip.url}
            alt=""
            aria-hidden="true"
          />
        )}
        <PrimaryFields fields={structure.primaryFields} />
        <FieldRow fields={structure.secondaryFields} max={4} />
        <FieldRow fields={structure.auxiliaryFields} max={4} />
      </>
    );
  }

  if (style === "coupon" || style === "storeCard") {
    return (
      <>
        {strip && (
          <img
            class="pass__strip"
            src={strip.url}
            alt=""
            aria-hidden="true"
          />
        )}
        <PrimaryFields fields={structure.primaryFields} />
        <FieldRow fields={structure.auxiliaryFields} max={4} />
        <FieldRow fields={structure.secondaryFields} max={4} />
      </>
    );
  }

  // generic
  if (thumbnail && structure.primaryFields?.length) {
    return (
      <>
        <div class="pass__thumbnail-row">
          <img class="pass__thumbnail" src={thumbnail.url} alt="" />
          <div class="pass__primary">
            {structure.primaryFields.map((f) => (
              <Field key={f.key} field={f} />
            ))}
          </div>
        </div>
        <FieldRow fields={structure.secondaryFields} max={4} />
        <FieldRow fields={structure.auxiliaryFields} max={4} />
      </>
    );
  }

  return (
    <>
      <PrimaryFields fields={structure.primaryFields} />
      <FieldRow fields={structure.secondaryFields} max={4} />
      <FieldRow fields={structure.auxiliaryFields} max={4} />
    </>
  );
}

export default function PassCard({ parsed }: PassCardProps): JSX.Element {
  const { pass, style, structure } = parsed;
  const barcode = pickBarcode(pass);

  const cardStyle = {
    "--pass-bg": pass.backgroundColor ?? DEFAULT_BACKGROUND,
    "--pass-fg": pass.foregroundColor ?? DEFAULT_FOREGROUND,
    "--pass-label": pass.labelColor ?? DEFAULT_LABEL,
  } as JSX.CSSProperties;

  return (
    <div class="pass-stage">
      {parsed.source === "sample" && (
        <span class="pass-stage__chip" aria-label="Synthetic sample pass">
          Sample · not signed
        </span>
      )}
      <article
        class="pass"
        data-style={style}
        style={cardStyle}
        aria-label={`${pass.description ?? "Pass"} (${style})`}
      >
        <TopStrip parsed={parsed} />
        <StyleBody style={style} structure={structure} parsed={parsed} />
        {barcode && <PassBarcode barcode={barcode} />}
        <BottomChrome parsed={parsed} />
      </article>
    </div>
  );
}
