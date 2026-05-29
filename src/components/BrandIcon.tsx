import type { JSX } from "preact";
import type { BrandIconName } from "../lib/pkpass/types";

interface BrandIconProps {
  name: BrandIconName;
  class?: string;
}

export default function BrandIcon({
  name,
  class: className,
}: BrandIconProps): JSX.Element {
  return (
    <svg
      class={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<BrandIconName, JSX.Element> = {
  festival: (
    <path d="M9 17.5a2.5 2.5 0 1 1-2.5-2.5c.18 0 .35.02.5.05V6l10-2v9.55a2.5 2.5 0 1 1-2-2.45V7.5L9 8.7v8.8z" />
  ),
  plane: (
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
  ),
  coffee: (
    <path d="M18 4H3v8a5 5 0 0 0 5 5h4a5 5 0 0 0 4.9-4H18a3.5 3.5 0 0 0 0-7zm0 5V6a1.5 1.5 0 0 1 0 3zM3 19h14v2H3z" />
  ),
  tag: (
    <path d="M12.4 3H4a1 1 0 0 0-1 1v8.4a1 1 0 0 0 .3.7l8.6 8.6a1 1 0 0 0 1.4 0l7.4-7.4a1 1 0 0 0 0-1.4L13.1 3.3a1 1 0 0 0-.7-.3zm-5.4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
  ),
  museum: (
    <path d="M12 2 2 7v2h20V7L12 2zM4 10v8H3v2h18v-2h-1v-8h-2v8h-3v-8h-2v8h-2v-8H9v8H6v-8H4z" />
  ),
};
