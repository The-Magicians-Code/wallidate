import type { JSX } from "preact";
import type { PassField } from "../lib/pkpass/types";

interface PassBackProps {
  fields?: PassField[];
}

function plainValue(field: PassField): string {
  if (field.attributedValue) {
    return field.attributedValue.replace(/<[^>]*>/g, "");
  }
  return typeof field.value === "number"
    ? field.value.toLocaleString()
    : String(field.value);
}

export default function PassBack({ fields }: PassBackProps): JSX.Element {
  if (!fields || fields.length === 0) {
    return (
      <div class="panel__body">
        <p style="margin:0;color:var(--muted);font-size:13px;">
          No back fields on this pass.
        </p>
      </div>
    );
  }

  return (
    <ul class="back-fields">
      {fields.map((f) => (
        <li key={f.key}>
          {f.label && <p class="back-fields__label">{f.label}</p>}
          <p class="back-fields__value">{plainValue(f)}</p>
        </li>
      ))}
    </ul>
  );
}
