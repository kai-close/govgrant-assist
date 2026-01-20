"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/db/schema";
import { CardAIMenu } from "../ai/card-ai-menu";

interface CardToolbarProps {
  card: Card;
  slideId: string;
}

export function CardToolbar({ card, slideId }: CardToolbarProps) {
  const [showAIMenu, setShowAIMenu] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  const _updateCard = useEditorStore((s) => s.updateCard);
  const deleteCard = useEditorStore((s) => s.deleteCard);
  const duplicateCard = useEditorStore((s) => s.duplicateCard);
  const _pushHistory = useEditorStore((s) => s.pushHistory);

  // Close AI menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAIMenu &&
        aiMenuRef.current &&
        !aiMenuRef.current.contains(event.target as Node) &&
        aiButtonRef.current &&
        !aiButtonRef.current.contains(event.target as Node)
      ) {
        setShowAIMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAIMenu]);

  const handleDelete = useCallback(() => {
    deleteCard(slideId, card.id);
  }, [slideId, card.id, deleteCard]);

  const handleDuplicate = useCallback(() => {
    duplicateCard(slideId, card.id);
  }, [slideId, card.id, duplicateCard]);

  const handleBringToFront = useCallback(() => {
    // Update z-index or reorder cards
    // For now, this is a placeholder
  }, []);

  const handleSendToBack = useCallback(() => {
    // Update z-index or reorder cards
    // For now, this is a placeholder
  }, []);

  return (
    <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-lg border border-border">
      {/* Card type indicator */}
      <div className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground capitalize">
        {card.type}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* AI improve button */}
      <div className="relative">
        <button
          ref={aiButtonRef}
          onClick={() => setShowAIMenu(!showAIMenu)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded px-2 text-xs hover:bg-accent transition-colors",
            showAIMenu && "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          )}
          title="AI Improve"
        >
          <svg
            className="h-3.5 w-3.5 text-purple-500"
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
          <span className="hidden sm:inline">AI</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* AI Menu Popover */}
        {showAIMenu && (
          <div
            ref={aiMenuRef}
            className="absolute left-0 top-full mt-2 z-50"
          >
            <CardAIMenu
              card={card}
              slideId={slideId}
              onClose={() => setShowAIMenu(false)}
            />
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Layer controls */}
      <button
        onClick={handleBringToFront}
        className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent transition-colors"
        title="Bring to front"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <button
        onClick={handleSendToBack}
        className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent transition-colors"
        title="Send to back"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div className="h-5 w-px bg-border" />

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent transition-colors"
        title="Duplicate (Cmd+D)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
          />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
        title="Delete (Backspace)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
}

// Floating toolbar container that positions itself above the selected card
export function FloatingCardToolbar() {
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds);
  const slides = useEditorStore((s) => s.slides);

  if (!selectedSlideId || selectedCardIds.length !== 1) {
    return null;
  }

  const slide = slides.find((s) => s.id === selectedSlideId);
  const card = slide?.cards.find((c) => c.id === selectedCardIds[0]);

  if (!card) {
    return null;
  }

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        // Position will be calculated dynamically in the parent component
        // For now, we'll position it at a fixed location
        top: 150,
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <CardToolbar card={card} slideId={selectedSlideId} />
    </div>
  );
}
