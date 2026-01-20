"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/db/schema";
import { trpc } from "@/lib/trpc/client";

interface CardAIMenuProps {
  card: Card;
  slideId: string;
  onClose: () => void;
}

type AIAction = "improve" | "expand" | "summarize" | "simplify" | "professional" | "casual";

interface AIActionConfig {
  id: AIAction;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AI_ACTIONS: AIActionConfig[] = [
  {
    id: "improve",
    label: "Improve Writing",
    description: "Enhance clarity and professionalism",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    id: "expand",
    label: "Expand",
    description: "Add more detail and examples",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Make it more concise",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
      </svg>
    ),
  },
  {
    id: "simplify",
    label: "Simplify",
    description: "Use simpler language",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    id: "professional",
    label: "Professional",
    description: "Make it more formal",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    id: "casual",
    label: "Casual",
    description: "Make it more friendly",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
];

export function CardAIMenu({ card, slideId, onClose }: CardAIMenuProps) {
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const content = card.content as { text?: string; html?: string };
  const originalText = content.text || "";

  // tRPC mutation
  const improveCardMutation = trpc.ai.improveCard.useMutation();

  // Process with AI using tRPC endpoint
  const processWithAI = useCallback(
    async (action: AIAction) => {
      setIsProcessing(true);
      setSelectedAction(action);
      setError(null);

      try {
        const result = await improveCardMutation.mutateAsync({
          cardContent: originalText,
          action,
        });

        setPreview(result.html || originalText);
      } catch (err) {
        console.error("Failed to improve card:", err);
        setError(err instanceof Error ? err.message : "Failed to process. Using fallback.");

        // Fallback to mock result if API fails
        let result = originalText;
        switch (action) {
          case "improve":
            result = `Enhanced: ${originalText.charAt(0).toUpperCase()}${originalText.slice(1)}. This represents a significant advancement in our approach.`;
            break;
          case "expand":
            result = `${originalText}\n\nTo elaborate further, this encompasses several key aspects:\n• First, we consider the primary implications\n• Second, we examine the supporting evidence\n• Finally, we evaluate the long-term impact`;
            break;
          case "summarize":
            result = originalText.split(".")[0] + ".";
            break;
          case "simplify":
            result = originalText.split(" ").slice(0, 10).join(" ") + "...";
            break;
          case "professional":
            result = `We are pleased to present: ${originalText}`;
            break;
          case "casual":
            result = `Hey there! Here's the deal: ${originalText}`;
            break;
          default:
            result = originalText;
        }
        setPreview(result);
      } finally {
        setIsProcessing(false);
      }
    },
    [originalText, improveCardMutation]
  );

  const applyChanges = useCallback(() => {
    if (!preview) return;

    updateCard(slideId, card.id, {
      content: {
        ...content,
        text: preview,
        html: `<p>${preview.replace(/\n/g, "</p><p>")}</p>`,
      },
    });
    pushHistory();
    onClose();
  }, [preview, slideId, card.id, content, updateCard, pushHistory, onClose]);

  const handleCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim()) return;

    setIsProcessing(true);
    setSelectedAction(null);
    setError(null);

    try {
      const result = await improveCardMutation.mutateAsync({
        cardContent: originalText,
        action: "improve",
        context: customPrompt,
      });

      setPreview(result.html || originalText);
    } catch (err) {
      console.error("Failed to process custom prompt:", err);
      setError(err instanceof Error ? err.message : "Failed to process. Using fallback.");

      // Fallback to mock result
      setPreview(`[AI Response for: "${customPrompt}"]\n\n${originalText}`);
    } finally {
      setIsProcessing(false);
    }
  }, [customPrompt, originalText, improveCardMutation]);

  return (
    <div className="w-80 rounded-xl bg-card shadow-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-purple-500">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!preview ? (
        <>
          {/* Quick actions */}
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => processWithAI(action.id)}
                  disabled={isProcessing}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg p-2 text-left transition-colors",
                    selectedAction === action.id && isProcessing
                      ? "bg-primary-50 dark:bg-primary-950"
                      : "hover:bg-accent",
                    isProcessing && selectedAction !== action.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      selectedAction === action.id && isProcessing
                        ? "text-primary-600"
                        : "text-muted-foreground"
                    )}>
                      {action.icon}
                    </span>
                    <span className="text-xs font-medium">{action.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {action.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask AI anything..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                onKeyDown={(e) => e.key === "Enter" && handleCustomPrompt()}
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim() || isProcessing}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing with AI...
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Error display */}
          {error && (
            <div className="mx-4 mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-2">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">{error}</p>
            </div>
          )}

          {/* Preview */}
          <div className="p-4">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Preview</label>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {preview}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-border p-3">
            <button
              onClick={() => {
                setPreview(null);
                setSelectedAction(null);
              }}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Discard
            </button>
            <button
              onClick={applyChanges}
              className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Floating trigger button for card AI
export function CardAITrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg hover:from-primary-600 hover:to-purple-600 transition-all",
        className
      )}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      AI
    </button>
  );
}
