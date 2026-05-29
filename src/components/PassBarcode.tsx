import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Barcode, BarcodeFormat } from "../lib/pkpass/types";

interface PassBarcodeProps {
  barcode: Barcode;
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
        if (barcode.format === "PKBarcodeFormatQR") {
          await renderQR(canvas, barcode.message);
        } else {
          await renderBwip(canvas, barcode.format, barcode.message);
        }
        if (cancelled) return;
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
        <canvas
          ref={canvasRef}
          data-format={barcode.format}
          aria-label={barcode.altText ?? "Barcode"}
        />
      )}
      {barcode.altText && <p class="pass__barcode-alt">{barcode.altText}</p>}
    </div>
  );
}

async function renderQR(canvas: HTMLCanvasElement, text: string): Promise<void> {
  const QRCode = (await import("qrcode")).default;
  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 5,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

const BCID_MAP: Record<BarcodeFormat, string> = {
  PKBarcodeFormatQR: "qrcode",
  PKBarcodeFormatPDF417: "pdf417compact",
  PKBarcodeFormatAztec: "azteccode",
  PKBarcodeFormatCode128: "code128",
};

async function renderBwip(
  canvas: HTMLCanvasElement,
  format: BarcodeFormat,
  text: string,
): Promise<void> {
  const mod = await import("bwip-js/browser");
  const bwip = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const bcid = BCID_MAP[format];

  const opts: Record<string, unknown> = {
    bcid,
    text,
    includetext: false,
    paddingwidth: 4,
    paddingheight: 4,
  };
  if (bcid === "azteccode") {
    opts.scale = 4;
  } else if (bcid === "pdf417compact") {
    opts.scale = 3;
    opts.columns = 6;
  } else {
    opts.scale = 2;
    opts.height = 14;
  }

  canvas.width = 0;
  canvas.height = 0;
  // The qrcode lib sets inline style.width/height when rendering a QR code.
  // Preact reuses this same canvas element across format switches, so clear
  // those leftover dimensions or they'd override the stylesheet and squash
  // wide barcodes (PDF417/Code128) into the QR square.
  canvas.style.width = "";
  canvas.style.height = "";
  bwip.toCanvas(canvas, opts as never);
}
