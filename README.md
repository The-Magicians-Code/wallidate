# Wallidate

A web viewer + structural validator for Apple Wallet `.pkpass` files. Everything runs client-side — files never leave the browser.

## What it does

- **Upload** a `.pkpass` (or drag it onto the drop zone) and see it rendered like in Wallet
- **Surprise me** picks one of five built-in synthetic samples (event ticket, boarding pass, store card, coupon, generic) so you can see the renderer without uploading anything
- **Validation report** flags issues by severity (error / warning / info / unsupported):
  - required `pass.json` fields, format version, style detection
  - `manifest.json` SHA-1 hashes vs. actual file bytes
  - `signature` blob presence (chain verification is *not* performed — see caveat in the UI)
  - per-style requirements (e.g. `boardingPass` needs `transitType`)
  - color format, barcode format/encoding, legacy `barcode` vs. modern `barcodes`, dates, web service URL pairing, etc.

## Stack

- Astro 5 + Preact (one client island, `PassExplorer`)
- JSZip for unpacking `.pkpass`
- `bwip-js` (lazy-loaded) for QR / PDF417 / Aztec / Code128 rendering
- Vanilla CSS, Apple HIG-inspired aesthetic

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
npm run preview
```

## Layout

```
src/
  pages/index.astro            entry point
  layouts/Layout.astro         page shell
  components/
    Hero.astro                 product header
    Footer.astro
    Uploader.tsx               drop zone + file input + "Surprise me"
    PassExplorer.tsx           state machine: idle / parsing / ready
    PassCard.tsx               renders the pass card, routes by style
    PassCardFields.tsx         shared field renderers
    PassBack.tsx               back-of-pass fields list
    PassBarcode.tsx            lazy bwip-js canvas
    ValidationPanel.tsx        grouped issues + severity counts
  lib/pkpass/
    types.ts                   shared type contract
    parse.ts                   ZIP → ParsedPass (manifest hashes, images, localizations)
    validate.ts                ParsedPass → ValidationResult
    sample.ts                  5 synthetic templates for "Surprise me"
  styles/
    global.css                 layout primitives, tokens, panel/issue styles
    wallet.css                 pass card visual styles, per-style tweaks
```

## Notes

- Apple WWDR certificate-chain verification cannot be done in the browser. The validator only confirms that the `signature` file is present and surfaces a clear caveat.
- Synthetic samples deliberately omit images, manifest, and signature; the in-app banner explains this so the resulting validation report isn't misread.
- File-size limit is 25 MB and 200 files per archive.

Not affiliated with Apple. Visual conventions inspired by Apple's [Human Interface Guidelines for Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet).
