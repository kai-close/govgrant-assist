"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const createDocument = trpc.document.create.useMutation();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF, Word, or PowerPoint files.";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum size is 50MB.";
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned URL
      setProgress(10);
      const { uploadUrl, storageKey } = await getUploadUrl.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Step 2: Upload to S3
      setProgress(30);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Create document record
      setProgress(70);
      await createDocument.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        storageKey,
      });

      setProgress(100);

      // Success!
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        onSuccess();
        onClose();
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${uploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          {file ? (
            <div>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {!uploading && (
                <button
                  onClick={() => setFile(null)}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-2">
                Drag and drop your document here, or
              </p>
              <label className="cursor-pointer text-primary hover:underline">
                browse files
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF, Word, PowerPoint (max 50MB)
              </p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {progress < 30 ? "Preparing upload..." :
               progress < 70 ? "Uploading..." :
               progress < 100 ? "Processing..." : "Complete!"}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
