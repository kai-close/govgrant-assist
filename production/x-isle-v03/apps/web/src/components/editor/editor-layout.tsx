"use client";

import { useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./panels/editor-sidebar";
import { SlideCanvas } from "./canvas/slide-canvas";
import { EditorToolbar } from "./toolbar/editor-toolbar";
import { FloatingCardToolbar } from "./cards/card-toolbar";
import { AISidebarPanel } from "./ai/ai-sidebar-panel";
import { AIGenerateDialog } from "./ai/ai-generate-dialog";
import { CollaborationWrapper } from "./collaboration/collaboration-wrapper";
import { CommentsSidebar } from "./comments";
import type { Slide, PresentationTheme } from "@/lib/db/schema";

interface EditorLayoutProps {
  presentation: {
    id: string;
    title: string;
    slides: Slide[];
    theme: PresentationTheme;
  };
  canEdit: boolean;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  collaborators: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  }>;
}

export function EditorLayout({
  presentation,
  canEdit,
  user,
  collaborators,
}: EditorLayoutProps) {
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const initializePresentation = useEditorStore((s) => s.initializePresentation);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const copyCards = useEditorStore((s) => s.copyCards);
  const pasteCards = useEditorStore((s) => s.pasteCards);
  const cutCards = useEditorStore((s) => s.cutCards);
  const deleteCard = useEditorStore((s) => s.deleteCard);
  const duplicateCard = useEditorStore((s) => s.duplicateCard);
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds);

  // Initialize store with presentation data
  useEffect(() => {
    initializePresentation({
      id: presentation.id,
      title: presentation.title,
      slides: presentation.slides,
      theme: presentation.theme,
    });
  }, [presentation, initializePresentation]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (isMeta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((isMeta && e.key === "z" && e.shiftKey) || (isMeta && e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Copy: Cmd/Ctrl + C
      if (isMeta && e.key === "c") {
        if (selectedCardIds.length > 0) {
          e.preventDefault();
          copyCards();
        }
        return;
      }

      // Cut: Cmd/Ctrl + X
      if (isMeta && e.key === "x") {
        if (selectedCardIds.length > 0) {
          e.preventDefault();
          cutCards();
        }
        return;
      }

      // Paste: Cmd/Ctrl + V
      if (isMeta && e.key === "v") {
        e.preventDefault();
        pasteCards();
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (isMeta && e.key === "d") {
        if (selectedCardIds.length === 1 && selectedSlideId) {
          e.preventDefault();
          duplicateCard(selectedSlideId, selectedCardIds[0]);
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if we're in an input
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement)?.isContentEditable
        ) {
          return;
        }

        if (selectedCardIds.length > 0 && selectedSlideId) {
          e.preventDefault();
          selectedCardIds.forEach((cardId) => {
            deleteCard(selectedSlideId, cardId);
          });
        }
        return;
      }
    },
    [canEdit, undo, redo, copyCards, cutCards, pasteCards, deleteCard, duplicateCard, selectedCardIds, selectedSlideId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CollaborationWrapper
      presentationId={presentation.id}
      user={user}
      enabled={true}
    >
      <div className="flex h-screen flex-col bg-muted/30">
        {/* Header */}
        <EditorHeader
          user={user}
          collaborators={collaborators}
          canEdit={canEdit}
        />

        {/* Toolbar */}
        {canEdit && (
          <EditorToolbar
            onToggleAISidebar={() => setShowAISidebar(!showAISidebar)}
            showAISidebar={showAISidebar}
            onToggleComments={() => setShowComments(!showComments)}
            showComments={showComments}
            presentationId={presentation.id}
          />
        )}

        {/* Floating card toolbar */}
        {canEdit && <FloatingCardToolbar />}

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Slides panel */}
          <EditorSidebar canEdit={canEdit} />

          {/* Canvas */}
          <main className="flex-1 overflow-hidden">
            <SlideCanvas canEdit={canEdit} />
          </main>

          {/* Right sidebar - AI Panel */}
          {canEdit && (
            <AISidebarPanel
              isOpen={showAISidebar}
              onClose={() => setShowAISidebar(false)}
              onOpenGenerateDialog={() => setShowAIDialog(true)}
            />
          )}
        </div>

        {/* AI Generate Dialog */}
        <AIGenerateDialog
          isOpen={showAIDialog}
          onClose={() => setShowAIDialog(false)}
        />

        {/* Comments Sidebar */}
        <CommentsSidebar
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          presentationId={presentation.id}
          currentUserId={user.id}
        />
      </div>
    </CollaborationWrapper>
  );
}
