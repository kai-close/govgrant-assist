"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Card, PresentationTheme } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface TextCardProps {
  card: Card;
  slideId: string;
  isSelected: boolean;
  canEdit: boolean;
  theme: PresentationTheme;
}

export function TextCard({
  card,
  slideId,
  isSelected,
  canEdit,
  theme,
}: TextCardProps) {
  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const content = card.content as { text?: string; html?: string };
  const style = card.style || {};

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
    ],
    content: content.html || content.text || "",
    editable: canEdit && isSelected,
    onUpdate: ({ editor }) => {
      updateCard(slideId, card.id, {
        content: {
          ...content,
          html: editor.getHTML(),
          text: editor.getText(),
        },
      });
    },
    onBlur: () => {
      pushHistory();
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

  // Update content if it changes externally (e.g., undo/redo)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHtml = editor.getHTML();
      const newHtml = content.html || content.text || "";
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml);
      }
    }
  }, [editor, content.html, content.text]);

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
    // If it's a number, we'll use inline style instead
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
          "[&_.ProseMirror_.is-editor-empty::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty::before]:float-left [&_.ProseMirror_.is-editor-empty::before]:pointer-events-none [&_.ProseMirror_.is-editor-empty::before]:h-0"
        )}
      />
    </div>
  );
}

// Text formatting toolbar component (used in card toolbar)
export function TextFormattingToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-lg border border-border">
      {/* Bold */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive("bold") ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Bold (Cmd+B)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h8a4 4 0 004-4 4 4 0 00-4-4H6v8zm0 0h9a4 4 0 010 8H6v-8z" />
        </svg>
      </button>

      {/* Italic */}
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive("italic") ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Italic (Cmd+I)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
        </svg>
      </button>

      {/* Underline */}
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive("underline") ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Underline (Cmd+U)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v4a5 5 0 0010 0V8M5 20h14" />
        </svg>
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Heading 1 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors",
          editor.isActive("heading", { level: 1 }) ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Heading 1"
      >
        H1
      </button>

      {/* Heading 2 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors",
          editor.isActive("heading", { level: 2 }) ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Heading 2"
      >
        H2
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Bullet list */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive("bulletList") ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Bullet list"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </button>

      {/* Numbered list */}
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive("orderedList") ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Numbered list"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Align left */}
      <button
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive({ textAlign: "left" }) ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Align left"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" />
        </svg>
      </button>

      {/* Align center */}
      <button
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive({ textAlign: "center" }) ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Align center"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h10.5M3.75 12h16.5M6.75 17.25h10.5" />
        </svg>
      </button>

      {/* Align right */}
      <button
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded transition-colors",
          editor.isActive({ textAlign: "right" }) ? "bg-primary-100 text-primary-700" : "hover:bg-accent"
        )}
        title="Align right"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M6.75 12h13.5M3.75 17.25h16.5" />
        </svg>
      </button>
    </div>
  );
}
