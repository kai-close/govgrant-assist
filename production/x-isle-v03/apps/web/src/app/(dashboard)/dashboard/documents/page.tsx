"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { UploadModal } from "@/components/documents/upload-modal";
import { DocumentCard } from "@/components/documents/document-card";
import { GenerateModal } from "@/components/documents/generate-modal";
import { EmptyState } from "@/components/documents/empty-state";

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

export default function DocumentsPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { data, isLoading, refetch } = trpc.document.list.useQuery({
    limit: 50,
  });

  const handleUploadSuccess = () => {
    refetch();
  };

  const handleDelete = () => {
    refetch();
  };

  const documents = data?.items || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload documents to generate AI-powered presentations
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState onUpload={() => setUploadModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc as Document}
              onGeneratePresentation={(d) => setSelectedDocument(d)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <GenerateModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}
