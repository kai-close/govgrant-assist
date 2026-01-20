"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { AIGenerateDialog } from "../ai/ai-generate-dialog";
import { AISidebarPanel } from "../ai/ai-sidebar-panel";

interface EditorToolbarProps {
  onToggleAISidebar?: () => void;
  showAISidebar?: boolean;
  onToggleComments?: () => void;
  showComments?: boolean;
  presentationId?: string;
}

export function EditorToolbar({
  onToggleAISidebar,
  showAISidebar,
  onToggleComments,
  showComments,
  presentationId,
}: EditorToolbarProps) {
  const [showAIDialog, setShowAIDialog] = useState(false);

  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const addCard = useEditorStore((s) => s.addCard);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const resetZoom = useEditorStore((s) => s.resetZoom);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useEditorStore((s) => s.toggleSnapToGrid);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const setIsGenerating = useEditorStore((s) => s.setIsGenerating);

  const handleAddCard = (type: "text" | "image" | "shape" | "chart" | "table") => {
    if (!selectedSlideId) return;

    // Center position on 960x540 slide
    const centerX = 480 - 150; // center - half width
    const centerY = 270 - 75;  // center - half height

    switch (type) {
      case "text":
        addCard(selectedSlideId, {
          type: "text",
          position: { x: centerX, y: centerY, width: 300, height: 150 },
          content: { html: "<p>Click to edit text</p>", text: "Click to edit text" },
          style: { fontSize: "base" },
        });
        break;
      case "image":
        addCard(selectedSlideId, {
          type: "image",
          position: { x: centerX - 50, y: centerY - 50, width: 400, height: 300 },
          content: {},
        });
        break;
      case "shape":
        addCard(selectedSlideId, {
          type: "shape",
          position: { x: centerX + 50, y: centerY + 25, width: 200, height: 100 },
          content: { shapeType: "rectangle" },
          style: { backgroundColor: "#3b82f6" },
        });
        break;
      case "chart":
        addCard(selectedSlideId, {
          type: "chart",
          position: { x: centerX, y: centerY, width: 300, height: 200 },
          content: { chartType: "bar", data: [] },
        });
        break;
      case "table":
        addCard(selectedSlideId, {
          type: "table",
          position: { x: centerX, y: centerY, width: 400, height: 200 },
          content: { rows: 3, cols: 3, data: [] },
        });
        break;
    }
  };

  return (
    <div className="flex h-11 items-center justify-between border-b border-border bg-card px-4">
      {/* Left - Add elements */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
          label="Add"
          dropdown
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          }
          label="Text"
          onClick={() => handleAddCard("text")}
        />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
          label="Image"
          onClick={() => handleAddCard("image")}
        />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
            </svg>
          }
          label="Shape"
          onClick={() => handleAddCard("shape")}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
          label="Chart"
          onClick={() => handleAddCard("chart")}
        />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
            </svg>
          }
          label="Table"
          onClick={() => handleAddCard("table")}
        />
      </div>

      {/* Center - AI Tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowAIDialog(true)}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
            isGenerating
              ? "bg-primary-100 text-primary-700"
              : "bg-gradient-to-r from-primary-500 to-purple-500 text-white hover:from-primary-600 hover:to-purple-600"
          )}
          disabled={isGenerating}
        >
          <svg
            className={cn("h-4 w-4", isGenerating && "animate-pulse")}
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
          {isGenerating ? "Generating..." : "AI Generate"}
        </button>

        {/* AI Sidebar toggle */}
        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          }
          label="AI Panel"
          active={showAISidebar}
          onClick={onToggleAISidebar}
        />
      </div>

      {/* AI Generate Dialog */}
      <AIGenerateDialog isOpen={showAIDialog} onClose={() => setShowAIDialog(false)} />

      {/* Right - View controls */}
      <div className="flex items-center gap-1">
        {/* Grid toggle */}
        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          }
          label="Grid"
          active={showGrid}
          onClick={toggleGrid}
        />

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
            </svg>
          }
          label="Snap"
          active={snapToGrid}
          onClick={toggleSnapToGrid}
        />

        <ToolbarDivider />

        {/* Comments toggle */}
        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          }
          label="Comments"
          active={showComments}
          onClick={onToggleComments}
        />

        <ToolbarDivider />

        {/* Zoom controls */}
        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          }
          onClick={zoomOut}
        />

        <button
          onClick={resetZoom}
          className="w-14 rounded px-2 py-1 text-center text-xs font-medium hover:bg-accent transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>

        <ToolbarButton
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
          onClick={zoomIn}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  dropdown,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  dropdown?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors",
        active
          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          : "hover:bg-accent"
      )}
    >
      {icon}
      {label && <span className="hidden sm:inline">{label}</span>}
      {dropdown && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      )}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
