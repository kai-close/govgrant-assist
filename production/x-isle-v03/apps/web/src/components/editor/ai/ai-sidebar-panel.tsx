"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";

interface AISidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGenerateDialog: () => void;
}

type PanelTab = "generate" | "suggestions" | "history";

interface SuggestionItem {
  id: string;
  type: "content" | "design" | "image";
  title: string;
  description: string;
  action: () => void;
}

export function AISidebarPanel({
  isOpen,
  onClose,
  onOpenGenerateDialog,
}: AISidebarPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("generate");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const slides = useEditorStore((s) => s.slides);
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const addSlide = useEditorStore((s) => s.addSlide);
  const _updateSlide = useEditorStore((s) => s.updateSlide);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const selectedSlide = slides.find((s) => s.id === selectedSlideId);

  // Mock suggestions based on current slide content
  const suggestions: SuggestionItem[] = selectedSlide
    ? [
        {
          id: "add-image",
          type: "image",
          title: "Add relevant image",
          description: "Add a visual to support your content",
          action: () => handleSuggestion("add-image"),
        },
        {
          id: "add-bullet-points",
          type: "content",
          title: "Add bullet points",
          description: "Break down content into key points",
          action: () => handleSuggestion("add-bullets"),
        },
        {
          id: "add-chart",
          type: "design",
          title: "Visualize with chart",
          description: "Convert data to a visual chart",
          action: () => handleSuggestion("add-chart"),
        },
        {
          id: "improve-layout",
          type: "design",
          title: "Improve layout",
          description: "Optimize card arrangement",
          action: () => handleSuggestion("improve-layout"),
        },
      ]
    : [];

  const handleSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!selectedSlideId) return;

      setIsProcessing(true);
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsProcessing(false);

      // In production, this would call the AI endpoint
      console.log(`Applied suggestion: ${suggestionId}`);
    },
    [selectedSlideId]
  );

  const handleQuickAction = useCallback(
    async (action: string) => {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsProcessing(false);

      switch (action) {
        case "add-slide":
          addSlide();
          pushHistory();
          break;
        case "generate-content":
          onOpenGenerateDialog();
          break;
        default:
          break;
      }
    },
    [addSlide, pushHistory, onOpenGenerateDialog]
  );

  const handleCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim()) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setCustomPrompt("");

    // In production, this would call the AI endpoint with the custom prompt
    console.log(`Custom AI request: ${customPrompt}`);
  }, [customPrompt]);

  if (!isOpen) return null;

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-purple-500">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["generate", "suggestions", "history"] as PanelTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "generate" && (
          <div className="space-y-4">
            {/* Quick actions */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Quick Actions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <QuickActionButton
                  icon={
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  }
                  label="New Slide"
                  onClick={() => handleQuickAction("add-slide")}
                  disabled={isProcessing}
                />
                <QuickActionButton
                  icon={
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  }
                  label="From Doc"
                  onClick={onOpenGenerateDialog}
                  disabled={isProcessing}
                />
                <QuickActionButton
                  icon={
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                      />
                    </svg>
                  }
                  label="Template"
                  onClick={onOpenGenerateDialog}
                  disabled={isProcessing}
                />
                <QuickActionButton
                  icon={
                    <svg
                      className="h-4 w-4"
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
                  label="Find Image"
                  onClick={() => handleQuickAction("find-image")}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Full deck generation */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Full Deck Generation
              </label>
              <button
                onClick={onOpenGenerateDialog}
                className="w-full rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700 p-4 text-center hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-purple-500">
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
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generate Full Deck</p>
                    <p className="text-xs text-muted-foreground">
                      Create presentation from scratch
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Custom prompt */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Ask AI Anything
              </label>
              <div className="space-y-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe what you want to create or modify..."
                  className="w-full h-24 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleCustomPrompt}
                  disabled={!customPrompt.trim() || isProcessing}
                  className="w-full rounded-lg bg-primary-500 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
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
                      Processing...
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "suggestions" && (
          <div className="space-y-3">
            {!selectedSlide ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select a slide to see suggestions
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No suggestions available
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.action}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-border p-3 text-left hover:border-primary-300 hover:bg-accent/50 transition-all disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        suggestion.type === "content" &&
                          "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                        suggestion.type === "design" &&
                          "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
                        suggestion.type === "image" &&
                          "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                      )}
                    >
                      {suggestion.type === "content" && (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                          />
                        </svg>
                      )}
                      {suggestion.type === "design" && (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
                          />
                        </svg>
                      )}
                      {suggestion.type === "image" && (
                        <svg
                          className="h-4 w-4"
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
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="text-center py-8 text-muted-foreground text-sm">
              <svg
                className="mx-auto h-12 w-12 mb-3 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No AI history yet</p>
              <p className="text-xs mt-1">
                Your AI generations will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="border-t border-border px-4 py-3 bg-primary-50/50 dark:bg-primary-950/30">
          <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
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
            AI is processing...
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 hover:border-primary-300 hover:bg-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
