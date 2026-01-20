"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

interface Document {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  error: string | null;
  textContent: string | null;
  pageCount: number | null;
  storageKey: string;
  createdAt: Date;
  processedAt: Date | null;
}

interface DocumentCardProps {
  document: Document;
  onGeneratePresentation: (document: Document) => void;
  onDelete: (id: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-powerpoint": "PPT",
};

export function DocumentCard({ document, onGeneratePresentation, onDelete }: DocumentCardProps) {
  const [status, setStatus] = useState(document.status);
  const [error, setError] = useState(document.error);
  const [showMenu, setShowMenu] = useState(false);

  const { data: statusData } = trpc.document.getStatus.useQuery(
    { id: document.id },
    {
      enabled: status === "pending" || status === "processing",
      refetchInterval: status === "pending" || status === "processing" ? 2000 : false,
    }
  );

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => onDelete(document.id),
  });

  useEffect(() => {
    if (statusData) {
      setStatus(statusData.status);
      setError(statusData.error);
    }
  }, [statusData]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fileType = FILE_ICONS[document.mimeType] || "FILE";
  const isReady = status === "ready";
  const isProcessing = status === "pending" || status === "processing";
  const isError = status === "error";

  return (
    <div
      className={`
        relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md
        ${isError ? "border-red-300 bg-red-50/50" : "border-border"}
        ${isProcessing ? "opacity-70" : ""}
      `}
    >
      {/* File type badge */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className={`
            inline-flex items-center rounded px-2 py-1 text-xs font-medium
            ${fileType === "PDF" ? "bg-red-100 text-red-700" : ""}
            ${fileType === "DOCX" || fileType === "DOC" ? "bg-blue-100 text-blue-700" : ""}
            ${fileType === "PPTX" || fileType === "PPT" ? "bg-orange-100 text-orange-700" : ""}
          `}
        >
          {fileType}
        </div>

        {/* Status badge */}
        {isProcessing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </div>
        )}
        {isReady && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Ready
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Error
          </div>
        )}
      </div>

      {/* Filename */}
      <h3 className="font-medium truncate" title={document.filename}>
        {document.filename}
      </h3>

      {/* Error message */}
      {isError && error && (
        <p className="mt-1 text-xs text-red-600 line-clamp-2">{error}</p>
      )}

      {/* Metadata */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatSize(document.size)}</span>
        <span>·</span>
        <span>{formatDate(document.createdAt)}</span>
        {document.pageCount && (
          <>
            <span>·</span>
            <span>{document.pageCount} pages</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onGeneratePresentation(document)}
          disabled={!isReady}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Presentation
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg border border-border p-2 hover:bg-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={() => {
                    deleteMutation.mutate({ id: document.id });
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
