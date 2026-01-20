"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { ExportDialog } from "./export/export-dialog";
import { CollaborationStatus } from "./collaboration/remote-cursors";

interface EditorHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  collaborators: Array<{
    id: string;
    name?: string | null;
    image?: string | null;
  }>;
  canEdit: boolean;
}

export function EditorHeader({ user, collaborators: _collaborators, canEdit }: EditorHeaderProps) {
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const isSaving = useEditorStore((s) => s.isSaving);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const historyLength = useEditorStore((s) => s.history.length);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    if (editedTitle.trim()) {
      setTitle(editedTitle.trim());
    } else {
      setEditedTitle(title);
    }
    setIsEditingTitle(false);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          title="Back to dashboard"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>

        {/* Logo */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white">
          X
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Title */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") {
                setEditedTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="h-8 rounded border border-primary-500 bg-background px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        ) : (
          <button
            onClick={() => canEdit && setIsEditingTitle(true)}
            className={cn(
              "rounded px-2 py-1 text-sm font-medium",
              canEdit && "hover:bg-accent cursor-pointer"
            )}
            disabled={!canEdit}
          >
            {title}
          </button>
        )}

        {/* Save status */}
        <span className="text-xs text-muted-foreground">
          {isSaving ? (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
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
              Saving...
            </span>
          ) : (
            "Saved"
          )}
        </span>
      </div>

      {/* Center section - Undo/Redo */}
      {canEdit && (
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Undo (Cmd+Z)"
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
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Redo (Cmd+Shift+Z)"
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
                d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Real-time collaboration status */}
        <CollaborationStatus />

        {/* Divider when connected */}
        <div className="h-6 w-px bg-border" />

        {/* Share button */}
        <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent transition-colors">
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
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          Share
        </button>

        {/* Present button */}
        <button className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
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
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
          Present
        </button>

        {/* Export button */}
        <button
          onClick={() => setShowExportDialog(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          title="Export presentation"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </button>

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 relative">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || ""}
              fill
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            user.name?.[0] || user.email?.[0] || "U"
          )}
        </div>
      </div>
    </header>
  );
}
