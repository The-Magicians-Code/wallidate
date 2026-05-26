import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Barcode, BarcodeFormat } from "../lib/pkpass/types";

interface PassBarcodeProps {
  barcode: Barcode;
}

const BCID_MAP: Record<BarcodeFormat, string> = {
  PKBarcodeFormatQR: "qrcode",
  PKBarcodeFormatPDF417: "pdf417compact",
  PKBarcodeFormatAztec: "azteccode",
  PKBarcodeFormatCode128: "code128",
};

function bcidFor(format: BarcodeFormat): string {
  return BCID_MAP[format] ?? "qrcode";
}

export default function PassBarcode({ barcode }: PassBarcodeProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function render(): Promise<void> {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const mod = await import("bwip-js/browser");
        const bwip =
          (mod as unknown as { default?: typeof mod }).default ?? mod;
        if (cancelled) return;

        const bcid = bcidFor(barcode.format);

        const opts: Record<string, unknown> = {
          bcid,
          text: barcode.message,
          includetext: false,
          paddingwidth: 4,
          paddingheight: 4,
        };
        if (bcid === "qrcode" || bcid === "azteccode") {
          // Matrix codes: scale only. Passing `height` squashes them.
          opts.scale = 4;
        } else if (bcid === "pdf417compact") {
          opts.scale = 3;
          opts.columns = 6;
        } else {
          // Linear (code128): `height` is bar height in mm.
          opts.scale = 2;
          opts.height = 14;
        }

        // bwip-js mutates the supplied canvas. Reset first.
        canvas.width = 0;
        canvas.height = 0;
        bwip.toCanvas(canvas, opts as never);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Could not render ${barcode.format}: ${msg}`);
      }
    }

    void render();
    return (): void => {
      cancelled = true;
    };
  }, [barcode.format, barcode.message]);

  return (
    <div class="pass__barcode">
      {error ? (
        <p class="pass__barcode-error">{error}</p>
      ) : (
        <canvas ref={canvasRef} aria-label={barcode.altText ?? "Barcode"} />
      )}
      {barcode.altText && <p class="pass__barcode-alt">{barcode.altText}</p>}
    </div>
  );
}
