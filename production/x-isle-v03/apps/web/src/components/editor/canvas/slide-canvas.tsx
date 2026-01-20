"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useCollaborationContext } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CardRenderer } from "../cards/card-renderer";
import { RemoteCursors, RemoteSelections } from "../collaboration/remote-cursors";
// Card type imported if needed for future typing
// import type { Card } from "@/lib/db/schema";

interface SlideCanvasProps {
  canEdit: boolean;
}

// Slide dimensions (16:9 aspect ratio)
const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
const GRID_SIZE = 20;

export function SlideCanvas({ canEdit }: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const slides = useEditorStore((s) => s.slides);
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const showGrid = useEditorStore((s) => s.showGrid);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const theme = useEditorStore((s) => s.theme);

  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const selectCard = useEditorStore((s) => s.selectCard);
  const clearCardSelection = useEditorStore((s) => s.clearCardSelection);
  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  // Collaboration context
  const { updateCursor, updateSelection, clearCursor, isConnected } = useCollaborationContext();

  const currentSlide = slides.find((s) => s.id === selectedSlideId);

  // Track cursor position for collaboration
  const handleCursorMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isConnected || !currentSlide || !slideRef.current) return;

      // Get slide position relative to the viewport
      const slideRect = slideRef.current.getBoundingClientRect();

      // Calculate cursor position relative to the slide (unscaled)
      const x = (e.clientX - slideRect.left) / zoom;
      const y = (e.clientY - slideRect.top) / zoom;

      // Only update if cursor is within slide bounds
      if (x >= 0 && x <= SLIDE_WIDTH && y >= 0 && y <= SLIDE_HEIGHT) {
        updateCursor(x, y, currentSlide.id);
      }
    },
    [isConnected, currentSlide, zoom, updateCursor]
  );

  // Clear cursor when leaving the slide
  const handleCursorLeave = useCallback(() => {
    if (isConnected) {
      clearCursor();
    }
  }, [isConnected, clearCursor]);

  // Update selection when cards are selected
  useEffect(() => {
    if (isConnected && currentSlide) {
      updateSelection(currentSlide.id, selectedCardIds);
    }
  }, [isConnected, currentSlide, selectedCardIds, updateSelection]);

  // Helper function to get card position for remote selections
  const getCardPosition = useCallback(
    (cardId: string) => {
      if (!currentSlide) return null;
      const card = currentSlide.cards.find((c) => c.id === cardId);
      if (!card) return null;
      return {
        x: card.position.x,
        y: card.position.y,
        width: card.position.width,
        height: card.position.height,
      };
    },
    [currentSlide]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click or space + click to pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      }
    },
    [panX, panY]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      }
      // Also track cursor for collaboration
      handleCursorMove(e);
    },
    [isPanning, panStart, setPan, handleCursorMove]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle click on canvas (deselect cards)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        clearCardSelection();
      }
    },
    [clearCardSelection]
  );

  // Handle drag end for cards
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (!currentSlide || !canEdit) return;

      const card = currentSlide.cards.find((c) => c.id === active.id);
      if (!card) return;

      let newX = card.position.x + delta.x / zoom;
      let newY = card.position.y + delta.y / zoom;

      // Snap to grid
      if (snapToGrid) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      // Constrain to slide bounds
      newX = Math.max(0, Math.min(SLIDE_WIDTH - card.position.width, newX));
      newY = Math.max(0, Math.min(SLIDE_HEIGHT - card.position.height, newY));

      updateCard(currentSlide.id, card.id, {
        position: {
          ...card.position,
          x: newX,
          y: newY,
        },
      });
      pushHistory();
    },
    [currentSlide, canEdit, zoom, snapToGrid, updateCard, pushHistory]
  );

  // Keyboard shortcuts for canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Reset zoom with 0
      if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
      }
      // Zoom in with +/=
      if ((e.key === "+" || e.key === "=") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setZoom(Math.min(3, zoom + 0.1));
      }
      // Zoom out with -
      if (e.key === "-" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setZoom(Math.max(0.25, zoom - 0.1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom, setZoom, setPan]);

  if (!currentSlide) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">No slide selected</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-muted/50",
        isPanning && "cursor-grabbing"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        handleCursorLeave();
      }}
    >
      {/* Canvas container with zoom and pan */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {/* Slide */}
        <div
          ref={slideRef}
          className="relative shadow-2xl"
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            backgroundColor: theme.backgroundColor || "#ffffff",
          }}
          onClick={handleCanvasClick}
        >
          {/* Grid overlay */}
          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />
          )}

          {/* Cards */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {currentSlide.cards.map((card) => (
              <CardRenderer
                key={card.id}
                card={card}
                slideId={currentSlide.id}
                isSelected={selectedCardIds.includes(card.id)}
                canEdit={canEdit}
                onSelect={(addToSelection) => selectCard(card.id, addToSelection)}
                theme={theme}
              />
            ))}
          </DndContext>

          {/* Empty state */}
          {currentSlide.cards.length === 0 && canEdit && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <svg
                className="mb-4 h-12 w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <p className="text-sm">Click the toolbar to add elements</p>
              <p className="mt-1 text-xs opacity-70">or use AI to generate content</p>
            </div>
          )}

          {/* Remote user selections */}
          <RemoteSelections
            currentSlideId={currentSlide.id}
            getCardPosition={getCardPosition}
            canvasScale={1}
          />

          {/* Remote user cursors */}
          <RemoteCursors
            currentSlideId={currentSlide.id}
            canvasScale={1}
          />
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={() => {
            setZoom(1);
            setPan(0, 0);
          }}
          className="flex h-6 items-center justify-center rounded px-2 hover:bg-accent transition-colors"
          title="Reset view (Cmd+0)"
        >
          Reset
        </button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground opacity-50">
        Alt+drag or middle-click to pan • Ctrl+scroll to zoom
      </div>
    </div>
  );
}
