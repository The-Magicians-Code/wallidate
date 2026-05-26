import { useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

export interface UploaderProps {
  onFile: (file: File) => void;
  onSample: () => void;
  busy: boolean;
  error: string | null;
}

const ACCEPT = ".pkpass,application/vnd.apple.pkpass,application/zip";

export default function Uploader(props: UploaderProps): JSX.Element {
  const { onFile, onSample, busy, error } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f) onFile(f);
  };

  const onDrop = (e: JSX.TargetedDragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    handleFiles(e.dataTransfer?.files ?? null);
  };

  const onDragOver = (e: JSX.TargetedDragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (busy) return;
    setDragOver(true);
  };

  const onDragLeave = (e: JSX.TargetedDragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
  };

  const onChange = (e: JSX.TargetedEvent<HTMLInputElement>): void => {
    handleFiles((e.currentTarget as HTMLInputElement).files);
  };

  const openPicker = (): void => {
    inputRef.current?.click();
  };

  return (
    <section class="uploader container" aria-label="Upload a pass">
      <div
        class="dropzone"
        data-dragover={dragOver}
        data-busy={busy}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <p class="dropzone__title">
          {busy ? "Reading your pass…" : "Drop a .pkpass here"}
        </p>
        <p class="dropzone__sub">
          Or use a sample — nothing is uploaded, ever.
        </p>
        <div class="dropzone__actions">
          <button
            type="button"
            class="btn btn--primary"
            onClick={openPicker}
            disabled={busy}
          >
            Choose file
          </button>
          <button
            type="button"
            class="btn btn--ghost"
            onClick={onSample}
            disabled={busy}
          >
            Surprise me
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          class="uploader__input"
          onChange={onChange}
          disabled={busy}
          aria-label="Choose a .pkpass file"
          tabIndex={-1}
        />
      </div>
      {error && (
        <div class="uploader__error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
