import { useState } from "react";

import { downloadExport } from "../api/exports";

type ExportKind = "csv" | "pdf";

interface ExportButtonProps {
  path: string;
  filename: string;
  kind: ExportKind;
  label?: string;
}

const ICONS: Record<ExportKind, JSX.Element> = {
  csv: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="6.5" y="17.5" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">
        CSV
      </text>
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="6.5" y="17.5" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">
        PDF
      </text>
    </svg>
  ),
};

export function ExportButton({ path, filename, kind, label }: ExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      await downloadExport(path, filename);
      setStatus("idle");
    } catch (error) {
      console.error(`Export ${kind} failed`, error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      className={`export-btn export-btn-${kind} export-btn-${status}`}
      onClick={() => void handleClick()}
      disabled={status === "loading"}
      title={status === "error" ? "Échec de l'export, réessayez" : undefined}
    >
      {status === "loading" ? (
        <span className="export-btn-spinner" aria-hidden="true" />
      ) : status === "error" ? (
        <span className="export-btn-icon" aria-hidden="true">⚠</span>
      ) : (
        <span className="export-btn-icon">{ICONS[kind]}</span>
      )}
      <span>{status === "error" ? "Échec" : (label ?? kind.toUpperCase())}</span>
    </button>
  );
}
