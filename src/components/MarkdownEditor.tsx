"use client";

import { useState } from "react";

import { MARKDOWN_CONTENT_CLASSNAME, renderMarkdown } from "@/lib/markdown";
import type { FindingImage } from "@/types";

type EditorMode = "raw" | "preview" | "both";

const MODE_LABELS: Record<EditorMode, string> = {
  raw: "編集",
  preview: "プレビュー",
  both: "両方",
};

interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  images?: readonly FindingImage[];
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
}

export default function MarkdownEditor({
  label,
  value,
  onChange,
  images = [],
  rows = 16,
  disabled,
  placeholder,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>("raw");
  const showRaw = mode === "raw" || mode === "both";
  const showPreview = mode === "preview" || mode === "both";

  const textareaBaseStyles =
    "w-full h-full min-h-[16rem] px-3 py-2.5 bg-dark-card bg-opacity-80 backdrop-filter backdrop-blur-sm border border-dark-border rounded-md shadow-sm text-light-text placeholder-medium-text focus:outline-none focus:ring-2 focus:ring-accent-gray focus:ring-opacity-70 focus:border-accent-gray focus:border-opacity-70 transition-all duration-200 font-mono text-sm disabled:bg-dark-card disabled:bg-opacity-50 disabled:border-dark-border disabled:border-opacity-50 disabled:text-dark-text disabled:placeholder-dark-text disabled:cursor-not-allowed disabled:shadow-none";

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {label && <span className="text-sm font-medium text-light-text">{label}</span>}
        <div className="flex gap-1">
          {(Object.keys(MODE_LABELS) as EditorMode[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setMode(candidate)}
              disabled={disabled}
              className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                mode === candidate
                  ? "border-accent-color bg-accent-color text-dark-bg"
                  : "border-dark-border bg-dark-bg text-medium-text hover:text-light-text"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {MODE_LABELS[candidate]}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-3 ${mode === "both" ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {showRaw && (
          <textarea
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className={textareaBaseStyles}
          />
        )}
        {showPreview && (
          <div
            className={`min-h-[16rem] overflow-auto rounded-md border border-dark-border bg-dark-bg p-3 ${MARKDOWN_CONTENT_CLASSNAME}`}
            style={{ maxHeight: mode === "both" ? undefined : "32rem" }}
          >
            {value.trim() ? (
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML comes from our own marked pipeline (src/lib/markdown.ts), not raw user input
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(value, images) }} />
            ) : (
              <p className="text-medium-text">プレビューする内容がありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
