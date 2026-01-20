"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (validTypes.includes(file.type)) {
      setFile(file);
    } else {
      alert("Please upload a PDF, Word document, or text file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to AI generation with document context
        router.push(`/dashboard/ai?documentId=${data.id}`);
      } else {
        console.error("Failed to upload document");
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Import Document</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a document and convert it into a presentation
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragActive
            ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
            : file
            ? "border-success bg-success/5"
            : "border-border hover:border-primary-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {file ? (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-4 font-medium">{file.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => setFile(null)}
              className="mt-4 text-sm text-red-500 hover:text-red-600"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="mt-4 font-medium">Drop your file here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Supports PDF, Word (.doc, .docx), and text files
            </p>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full rounded-lg bg-primary-500 px-4 py-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            "Continue to Generate"
          )}
        </button>
      )}

      {/* Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">How it works</h3>
        <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600">
              1
            </span>
            <span>Upload your document (PDF, Word, or text)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600">
              2
            </span>
            <span>AI extracts key information and structure</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600">
              3
            </span>
            <span>Review and customize your generated slides</span>
          </li>
        </ol>
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link href="/dashboard/new" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to creation options
        </Link>
      </div>
    </div>
  );
}
