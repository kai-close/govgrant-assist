"use client";

/**
 * CollaborativeTextCard
 *
 * TipTap editor with Yjs collaboration support.
 * Real-time text editing with multiple users.
 */

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent, type AnyExtension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

import { useEditorStore } from "@/lib/store/editor-store";
import type { Card, PresentationTheme } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface CollaborativeTextCardProps {
  card: Card;
  slideId: string;
  isSelected: boolean;
  canEdit: boolean;
  theme: PresentationTheme;
  // Collaboration props
  yDoc?: Y.Doc;
  awareness?: Awareness;
  currentUser?: {
    id: string;
    name: string;
    color: string;
  };
}

export function CollaborativeTextCard({
  card,
  slideId,
  isSelected,
  canEdit,
  theme,
  yDoc,
  awareness,
  currentUser,
}: CollaborativeTextCardProps) {
  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const content = card.content as { text?: string; html?: string };
  const style = card.style || {};

  // Get or create Y.XmlFragment for this card's content
  const yFragment = useMemo(() => {
    if (!yDoc) return undefined;
    // Use card.id as the key for this card's content in the Yjs document
    return yDoc.getXmlFragment(`card-${card.id}`);
  }, [yDoc, card.id]);

  // Build extensions array
  const extensions = useMemo((): AnyExtension[] => {
    const baseExtensions: AnyExtension[] = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Disable history when using collaboration (Yjs handles it)
        history: yFragment ? false : undefined,
      }),
      Placeholder.configure({
        placeholder: "Type something...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ];

    // Add collaboration extensions if Yjs is available
    if (yFragment && awareness && currentUser) {
      baseExtensions.push(
        Collaboration.configure({
          fragment: yFragment,
        })
      );

      baseExtensions.push(
        CollaborationCursor.configure({
          provider: { awareness } as { awareness: Awareness },
          user: {
            name: currentUser.name,
            color: currentUser.color,
          },
        })
      );
    }

    return baseExtensions;
  }, [yFragment, awareness, currentUser]);

  const editor = useEditor({
    extensions,
    content: yFragment ? undefined : (content.html || content.text || ""),
    editable: canEdit && isSelected,
    onUpdate: ({ editor }) => {
      // Only update local store if not using collaboration
      // (Yjs handles sync automatically)
      if (!yFragment) {
        updateCard(slideId, card.id, {
          content: {
            ...content,
            html: editor.getHTML(),
            text: editor.getText(),
          },
        });
      }
    },
    onBlur: () => {
      if (!yFragment) {
        pushHistory();
      }
    },
    editorProps: {
      attributes: {
        class: "outline-none h-full",
      },
    },
  });

  // Update editor editable state when selection changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit && isSelected);
    }
  }, [editor, canEdit, isSelected]);

  // Update content if it changes externally (e.g., undo/redo) - only for non-collaborative mode
  useEffect(() => {
    if (editor && !editor.isFocused && !yFragment) {
      const currentHtml = editor.getHTML();
      const newHtml = content.html || content.text || "";
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml);
      }
    }
  }, [editor, content.html, content.text, yFragment]);

  // Initialize Yjs fragment with initial content if empty
  useEffect(() => {
    if (yFragment && editor && yFragment.length === 0 && content.html) {
      // Set initial content in the Yjs fragment
      editor.commands.setContent(content.html);
    }
  }, [yFragment, editor, content.html]);

  const getFontSize = (): string => {
    const fs = style.fontSize;
    if (typeof fs === "string") {
      switch (fs) {
        case "xs": return "text-xs";
        case "sm": return "text-sm";
        case "base": return "text-base";
        case "lg": return "text-lg";
        case "xl": return "text-xl";
        case "2xl": return "text-2xl";
        case "3xl": return "text-3xl";
        case "4xl": return "text-4xl";
        default: return "text-base";
      }
    }
    return "";
  };

  return (
    <div
      className={cn(
        "h-full w-full p-4 overflow-auto",
        getFontSize(),
        isSelected && canEdit && "bg-white/50"
      )}
      style={{
        backgroundColor: style.backgroundColor || "transparent",
        color: style.textColor || "#000000",
        fontFamily: style.fontFamily || theme.fontFamily || "Inter",
        borderRadius: style.borderRadius || 8,
      }}
    >
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none h-full",
          "[&_.ProseMirror]:h-full",
          "[&_.ProseMirror_p]:my-2",
          "[&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4",
          "[&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3",
          "[&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-2",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4",
          "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic",
          "[&_.ProseMirror_.is-editor-empty::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty::before]:float-left [&_.ProseMirror_.is-editor-empty::before]:pointer-events-none [&_.ProseMirror_.is-editor-empty::before]:h-0",
          // Collaboration cursor styles
          "[&_.collaboration-cursor__caret]:relative [&_.collaboration-cursor__caret]:ml-[-1px] [&_.collaboration-cursor__caret]:mr-[-1px] [&_.collaboration-cursor__caret]:border-l-[2px] [&_.collaboration-cursor__caret]:border-solid [&_.collaboration-cursor__caret]:pointer-events-none [&_.collaboration-cursor__caret]:break-normal",
          "[&_.collaboration-cursor__label]:absolute [&_.collaboration-cursor__label]:top-[-1.4em] [&_.collaboration-cursor__label]:left-[-1px] [&_.collaboration-cursor__label]:text-xs [&_.collaboration-cursor__label]:font-medium [&_.collaboration-cursor__label]:text-white [&_.collaboration-cursor__label]:px-1 [&_.collaboration-cursor__label]:py-0.5 [&_.collaboration-cursor__label]:rounded [&_.collaboration-cursor__label]:whitespace-nowrap [&_.collaboration-cursor__label]:select-none"
        )}
      />
    </div>
  );
}

// Re-export the formatting toolbar from the original component
export { TextFormattingToolbar } from "./text-card";
