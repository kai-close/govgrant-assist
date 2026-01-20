"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface Document {
  id: string;
  filename: string;
  pageCount: number | null;
}

interface GenerateModalProps {
  document: Document | null;
  onClose: () => void;
}

export function GenerateModal({ document, onClose }: GenerateModalProps) {
  const router = useRouter();
  const [slideCount, setSlideCount] = useState(8);
  const [focusAreas, setFocusAreas] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const generateMutation = trpc.ai.generateFromDocument.useMutation();
  const createPresentationMutation = trpc.presentation.create.useMutation();
  const updatePresentationMutation = trpc.presentation.update.useMutation();

  const handleGenerate = async () => {
    if (!document) return;

    setGenerating(true);
    setError(null);
    setStatus("Analyzing document...");

    try {
      // Step 1: Generate slides from document
      const generatedContent = await generateMutation.mutateAsync({
        documentId: document.id,
        slideCount,
        focusAreas: focusAreas.trim()
          ? focusAreas.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });

      setStatus("Creating presentation...");

      // Step 2: Create a new presentation
      const presentation = await createPresentationMutation.mutateAsync({
        title: generatedContent.title,
      });

      // Step 3: Update with generated slides
      await updatePresentationMutation.mutateAsync({
        id: presentation.id,
        slides: generatedContent.slides,
      });

      setStatus("Opening editor...");

      // Step 4: Navigate to editor
      router.push(`/editor/${presentation.id}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
      setStatus("");
    }
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Presentation</h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">{document.filename}</p>
          <p className="text-xs text-muted-foreground">
            {document.pageCount ? `${document.pageCount} pages` : "Document ready"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Slides
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full"
              disabled={generating}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3</span>
              <span className="font-medium text-foreground">{slideCount} slides</span>
              <span>30</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Focus Areas <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="e.g., key findings, recommendations, data analysis"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={generating}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated topics to emphasize
            </p>
          </div>
        </div>

        {generating && status && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {status}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
