import type { JSX } from "preact";
import type { PassField, TextAlignment } from "../lib/pkpass/types";

function alignAttr(a?: TextAlignment): "center" | "right" | "left" {
  switch (a) {
    case "PKTextAlignmentCenter":
      return "center";
    case "PKTextAlignmentRight":
      return "right";
    default:
      return "left";
  }
}

function formatValue(field: PassField): string {
  if (field.attributedValue) {
    // strip HTML tags for plain visual display
    return field.attributedValue.replace(/<[^>]*>/g, "");
  }
  if (typeof field.value === "number") {
    if (field.currencyCode) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: field.currencyCode,
        }).format(field.value);
      } catch {
        return String(field.value);
      }
    }
    return field.value.toLocaleString();
  }
  return String(field.value);
}

interface FieldProps {
  field: PassField;
}

export function Field({ field }: FieldProps): JSX.Element {
  return (
    <div class="field" data-align={alignAttr(field.textAlignment)}>
      {field.label && <p class="field__label">{field.label}</p>}
      <p class="field__value">{formatValue(field)}</p>
    </div>
  );
}

interface RowProps {
  fields?: PassField[];
  className?: string;
  max?: number;
}

export function FieldRow({
  fields,
  className = "pass__row",
  max = 4,
}: RowProps): JSX.Element | null {
  if (!fields || fields.length === 0) return null;
  const visible = fields.slice(0, max);
  return (
    <div class={className}>
      {visible.map((f) => (
        <Field key={f.key} field={f} />
      ))}
    </div>
  );
}

interface HeaderFieldsProps {
  fields?: PassField[];
}

export function HeaderFields({ fields }: HeaderFieldsProps): JSX.Element | null {
  if (!fields || fields.length === 0) return null;
  const visible = fields.slice(0, 3);
  return (
    <div class="pass__header-fields">
      {visible.map((f) => (
        <div class="pass__header-field" key={f.key}>
          {f.label && <p class="field__label">{f.label}</p>}
          <p class="field__value">{formatValue(f)}</p>
        </div>
      ))}
    </div>
  );
}

interface PrimaryProps {
  fields?: PassField[];
}

export function PrimaryFields({ fields }: PrimaryProps): JSX.Element | null {
  if (!fields || fields.length === 0) return null;
  return (
    <div class="pass__primary">
      {fields.map((f) => (
        <div class="field" data-align={alignAttr(f.textAlignment)} key={f.key}>
          {f.label && <p class="field__label">{f.label}</p>}
          <p class="field__value">{formatValue(f)}</p>
        </div>
      ))}
    </div>
  );
}

export { formatValue };
