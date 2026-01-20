"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = "pptx" | "pdf" | "png" | "json";

interface ExportOptions {
  format: ExportFormat;
  includeNotes: boolean;
  includeHiddenSlides: boolean;
  quality: "standard" | "high";
  fileName: string;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState<ExportOptions>({
    format: "pptx",
    includeNotes: true,
    includeHiddenSlides: false,
    quality: "high",
    fileName: "",
  });

  const title = useEditorStore((s) => s.title);
  const slides = useEditorStore((s) => s.slides);
  const theme = useEditorStore((s) => s.theme);

  const getDefaultFileName = () => {
    return title || "presentation";
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      const fileName = options.fileName || getDefaultFileName();

      if (options.format === "json") {
        // Export as JSON (for backup/debugging)
        const data = {
          title,
          slides,
          theme,
          exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, `${fileName}.json`);
        setProgress(100);
      } else if (options.format === "pptx") {
        setProgress(30);

        // Prepare slide data for the PPTX service
        const presentationData = {
          title: title || "Untitled Presentation",
          slides: slides.map((slide) => ({
            id: slide.id,
            order: slide.order,
            layout: slide.layout || "blank",
            cards: slide.cards.map((card) => ({
              id: card.id,
              type: card.type,
              position: {
                // Convert from pixel-based (960x540) to percentage
                x: (card.position.x / 960) * 100,
                y: (card.position.y / 540) * 100,
                width: (card.position.width / 960) * 100,
                height: (card.position.height / 540) * 100,
              },
              content: card.content,
              style: card.style,
            })),
            notes: options.includeNotes ? slide.notes : undefined,
          })),
          theme: theme
            ? {
                primaryColor: theme.primaryColor,
                secondaryColor: theme.secondaryColor,
                backgroundColor: theme.backgroundColor,
                textColor: theme.textColor,
                fontFamily: theme.fontFamily,
                headingFont: theme.headingFont,
              }
            : undefined,
        };

        setProgress(50);

        // Call the PPTX service API
        const pptxServiceUrl =
          process.env.NEXT_PUBLIC_PPTX_SERVICE_URL || "http://localhost:8000";

        const response = await fetch(`${pptxServiceUrl}/api/v1/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(presentationData),
        });

        setProgress(80);

        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        downloadBlob(blob, `${fileName}.pptx`);
        setProgress(100);
      } else if (options.format === "pdf") {
        // PDF export would go through PPTX service with conversion
        setError("PDF export coming soon");
        return;
      } else if (options.format === "png") {
        // PNG export for individual slides
        setError("PNG export coming soon");
        return;
      }

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
        setProgress(0);
      }, 500);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [options, title, slides, theme, onClose]);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isExporting && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Export Presentation</h2>
              <p className="text-sm text-muted-foreground">
                Download your presentation
              </p>
            </div>
          </div>
        </div>

        {/* Export options */}
        <div className="space-y-4">
          {/* File name */}
          <div>
            <label className="mb-2 block text-sm font-medium">File name</label>
            <input
              type="text"
              value={options.fileName}
              onChange={(e) =>
                setOptions({ ...options, fileName: e.target.value })
              }
              placeholder={getDefaultFileName()}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Format selector */}
          <div>
            <label className="mb-2 block text-sm font-medium">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <FormatButton
                format="pptx"
                label="PowerPoint"
                description=".pptx file"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V4H6zm2 3h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H9v3H8V7h4zm0 1v4h3c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1H9z" />
                  </svg>
                }
                selected={options.format === "pptx"}
                onClick={() => setOptions({ ...options, format: "pptx" })}
              />
              <FormatButton
                format="pdf"
                label="PDF"
                description=".pdf file"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
                  </svg>
                }
                selected={options.format === "pdf"}
                onClick={() => setOptions({ ...options, format: "pdf" })}
                disabled
              />
              <FormatButton
                format="png"
                label="Images"
                description=".png files"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                }
                selected={options.format === "png"}
                onClick={() => setOptions({ ...options, format: "png" })}
                disabled
              />
              <FormatButton
                format="json"
                label="JSON"
                description="Backup file"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                    />
                  </svg>
                }
                selected={options.format === "json"}
                onClick={() => setOptions({ ...options, format: "json" })}
              />
            </div>
          </div>

          {/* Additional options */}
          {options.format === "pptx" && (
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeNotes}
                  onChange={(e) =>
                    setOptions({ ...options, includeNotes: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm">Include speaker notes</span>
              </label>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Progress bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {progress < 50
                  ? "Preparing slides..."
                  : progress < 80
                  ? "Generating file..."
                  : "Finishing up..."}
              </p>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full rounded-lg bg-blue-500 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting...
              </span>
            ) : (
              `Export as ${options.format.toUpperCase()}`
            )}
          </button>
        </div>

        {/* Slide count */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          {slides.length} slide{slides.length !== 1 ? "s" : ""} will be exported
        </div>
      </div>
    </div>
  );
}

function FormatButton({
  format,
  label,
  description,
  icon,
  selected,
  onClick,
  disabled,
}: {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
          : "border-border hover:bg-accent",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "text-muted-foreground",
          selected && "text-primary-600 dark:text-primary-400"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
