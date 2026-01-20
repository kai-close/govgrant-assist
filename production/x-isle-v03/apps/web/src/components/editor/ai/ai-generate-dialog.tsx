"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import type { Slide, Card } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { trpc } from "@/lib/trpc/client";

interface AIGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type GenerationMode = "scratch" | "outline" | "document";

interface GeneratedOutline {
  title: string;
  description?: string;
  slides: Array<{
    title: string;
    points: string[];
  }>;
}

export function AIGenerateDialog({ isOpen, onClose }: AIGenerateDialogProps) {
  const [mode, setMode] = useState<GenerationMode>("scratch");
  const [prompt, setPrompt] = useState("");
  const [outline, setOutline] = useState<GeneratedOutline | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"input" | "outline" | "generating">("input");
  const [slideCount, setSlideCount] = useState(5);
  const [style, setStyle] = useState<"professional" | "creative" | "minimal" | "corporate">("professional");
  const [error, setError] = useState<string | null>(null);

  const _setTitle = useEditorStore((s) => s.setTitle);
  const _slides = useEditorStore((s) => s.slides);
  const theme = useEditorStore((s) => s.theme);

  // tRPC mutations
  const generateOutlineMutation = trpc.ai.generateOutline.useMutation();
  const generatePresentationMutation = trpc.ai.generatePresentation.useMutation();

  // Generate outline using tRPC
  const generateOutline = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setStep("outline");
    setError(null);

    try {
      const result = await generateOutlineMutation.mutateAsync({
        prompt,
        slideCount,
      });

      setOutline({
        title: result.title,
        description: result.description,
        slides: result.slides.map((slide: { title: string; keyPoints?: string[] }) => ({
          title: slide.title,
          points: slide.keyPoints || [],
        })),
      });
    } catch (err) {
      console.error("Failed to generate outline:", err);
      setError(err instanceof Error ? err.message : "Failed to generate outline. Using fallback.");

      // Fallback to mock outline if API fails
      const mockOutline: GeneratedOutline = {
        title: prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt,
        slides: Array.from({ length: slideCount }, (_, i) => ({
          title: i === 0 ? "Introduction" : i === slideCount - 1 ? "Conclusion" : `Key Point ${i}`,
          points: [
            `Main insight about ${prompt.substring(0, 20)}...`,
            "Supporting detail with data",
            "Actionable takeaway",
          ],
        })),
      };
      setOutline(mockOutline);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, slideCount, generateOutlineMutation]);

  // Generate slides using tRPC
  const generateSlides = useCallback(async () => {
    if (!outline) return;

    setIsGenerating(true);
    setStep("generating");
    setError(null);

    try {
      const result = await generatePresentationMutation.mutateAsync({
        prompt,
        slideCount: outline.slides.length,
        style,
      });

      // Create slides from API result
      const newSlides: Slide[] = result.slides.map((slideData: { title?: string; content?: string; cards?: Card[] }, index: number) => {
        const cards: Card[] = slideData.cards || [
          // Title card
          {
            id: nanoid(),
            type: "text" as const,
            position: { x: 40, y: 40, width: 880, height: 80 },
            content: {
              html: `<h1>${slideData.title || outline.slides[index]?.title || ''}</h1>`,
              text: slideData.title || outline.slides[index]?.title || '',
            },
            style: {
              fontSize: "3xl",
              fontWeight: "bold",
            },
          },
          // Content card
          {
            id: nanoid(),
            type: "text" as const,
            position: { x: 40, y: 150, width: 880, height: 300 },
            content: {
              html: slideData.content || `<ul>${outline.slides[index]?.points.map((p: string) => `<li>${p}</li>`).join("")}</ul>`,
              text: slideData.content || outline.slides[index]?.points.join("\n") || '',
            },
            style: {
              fontSize: "lg",
            },
          },
        ];

        return {
          id: nanoid(),
          order: index,
          layout: "title-content",
          cards,
        };
      });

      // Update store with generated slides
      const initializePresentation = useEditorStore.getState().initializePresentation;
      initializePresentation({
        id: useEditorStore.getState().presentationId || nanoid(),
        title: result.title || outline.title,
        slides: newSlides,
        theme,
      });

      onClose();
      setPrompt("");
      setOutline(null);
      setStep("input");
    } catch (err) {
      console.error("Failed to generate slides:", err);
      setError(err instanceof Error ? err.message : "Failed to generate slides. Using fallback.");

      // Fallback to local generation if API fails
      const newSlides: Slide[] = outline.slides.map((slideOutline, index) => {
        const cards: Card[] = [
          {
            id: nanoid(),
            type: "text" as const,
            position: { x: 40, y: 40, width: 880, height: 80 },
            content: {
              html: `<h1>${slideOutline.title}</h1>`,
              text: slideOutline.title,
            },
            style: {
              fontSize: "3xl",
              fontWeight: "bold",
            },
          },
          {
            id: nanoid(),
            type: "text" as const,
            position: { x: 40, y: 150, width: 880, height: 300 },
            content: {
              html: `<ul>${slideOutline.points.map((p) => `<li>${p}</li>`).join("")}</ul>`,
              text: slideOutline.points.join("\n"),
            },
            style: {
              fontSize: "lg",
            },
          },
        ];

        return {
          id: nanoid(),
          order: index,
          layout: "title-content",
          cards,
        };
      });

      const initializePresentation = useEditorStore.getState().initializePresentation;
      initializePresentation({
        id: useEditorStore.getState().presentationId || nanoid(),
        title: outline.title,
        slides: newSlides,
        theme,
      });

      onClose();
      setPrompt("");
      setOutline(null);
      setStep("input");
    } finally {
      setIsGenerating(false);
    }
  }, [outline, prompt, style, theme, onClose, generatePresentationMutation]);

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
      setPrompt("");
      setOutline(null);
      setStep("input");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isGenerating}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Generate Presentation</h2>
              <p className="text-sm text-muted-foreground">
                {step === "input" && "Describe what you want to create"}
                {step === "outline" && "Review and customize your outline"}
                {step === "generating" && "Creating your slides..."}
              </p>
            </div>
          </div>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-6">
            {/* Mode selector */}
            <div className="flex gap-2">
              <ModeButton
                active={mode === "scratch"}
                onClick={() => setMode("scratch")}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                }
                label="From Scratch"
              />
              <ModeButton
                active={mode === "outline"}
                onClick={() => setMode("outline")}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                }
                label="From Outline"
              />
              <ModeButton
                active={mode === "document"}
                onClick={() => setMode("document")}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
                label="From Document"
              />
            </div>

            {/* Prompt input */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {mode === "scratch" && "What's your presentation about?"}
                {mode === "outline" && "Paste your outline or key points"}
                {mode === "document" && "Describe what to extract from your document"}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === "scratch"
                    ? "e.g., A quarterly business review for Q4 2024, highlighting revenue growth, new product launches, and 2025 strategy..."
                    : mode === "outline"
                    ? "1. Introduction\n2. Problem Statement\n3. Our Solution\n4. Results & Impact\n5. Next Steps"
                    : "Extract key insights and data points for an executive summary..."
                }
                className="h-32 w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Slide count */}
              <div>
                <label className="mb-2 block text-sm font-medium">Number of slides</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value={3}>3 slides</option>
                  <option value={5}>5 slides</option>
                  <option value={8}>8 slides</option>
                  <option value={10}>10 slides</option>
                  <option value={15}>15 slides</option>
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="mb-2 block text-sm font-medium">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as typeof style)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="professional">Professional</option>
                  <option value="creative">Creative</option>
                  <option value="minimal">Minimal</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
                </div>
              </div>
            )}

            {/* Document upload for document mode */}
            {mode === "document" && (
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <svg className="mx-auto h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop a PDF, Word, or text file
                </p>
                <button className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                  Browse files
                </button>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generateOutline}
              disabled={!prompt.trim() || isGenerating}
              className="w-full rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 py-3 text-sm font-medium text-white hover:from-primary-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating outline...
                </span>
              ) : (
                "Generate Outline"
              )}
            </button>
          </div>
        )}

        {/* Step: Outline review */}
        {step === "outline" && outline && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium">Presentation Title</label>
              <input
                type="text"
                value={outline.title}
                onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Slides outline */}
            <div>
              <label className="mb-2 block text-sm font-medium">Slide Outline</label>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {outline.slides.map((slide, index) => (
                  <div key={index} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => {
                          const newSlides = [...outline.slides];
                          newSlides[index] = { ...slide, title: e.target.value };
                          setOutline({ ...outline, slides: newSlides });
                        }}
                        className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                      />
                    </div>
                    <ul className="ml-8 mt-2 space-y-1">
                      {slide.points.map((point, pIndex) => (
                        <li key={pIndex} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1">•</span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const newSlides = [...outline.slides];
                              const newPoints = [...slide.points];
                              newPoints[pIndex] = e.target.value;
                              newSlides[index] = { ...slide, points: newPoints };
                              setOutline({ ...outline, slides: newSlides });
                            }}
                            className="flex-1 bg-transparent focus:outline-none"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="flex-1 rounded-lg border border-border py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Back
              </button>
              <button
                onClick={generateSlides}
                disabled={isGenerating}
                className="flex-1 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 py-3 text-sm font-medium text-white hover:from-primary-600 hover:to-purple-600 transition-colors disabled:opacity-50"
              >
                Generate Slides
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-purple-500">
              <svg className="h-8 w-8 animate-pulse text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Creating your presentation</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI is generating slides based on your outline...
            </p>
            <div className="mx-auto mt-6 h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-[shimmer_1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary-500 to-purple-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
          : "border-border hover:bg-accent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
