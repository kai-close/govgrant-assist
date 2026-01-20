"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Card, PresentationTheme } from "@/lib/db/schema";
import { TextCard } from "./text-card";
import { ImageCard } from "./image-card";
import { ShapeCard } from "./shape-card";

interface CardRendererProps {
  card: Card;
  slideId: string;
  isSelected: boolean;
  canEdit: boolean;
  onSelect: (addToSelection: boolean) => void;
  theme: PresentationTheme;
}

const MIN_SIZE = 40;

export function CardRenderer({
  card,
  slideId,
  isSelected,
  canEdit,
  onSelect,
  theme,
}: CardRendererProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startCardPos, setStartCardPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setHoveredCard = useEditorStore((s) => s.setHoveredCard);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !canEdit || isResizing,
  });

  // Handle click to select
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(e.shiftKey || e.metaKey || e.ctrlKey);
    },
    [onSelect]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      if (!canEdit) return;
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      setResizeDirection(direction);
      setStartPos({ x: e.clientX, y: e.clientY });
      setStartSize({ width: card.position.width, height: card.position.height });
      setStartCardPos({ x: card.position.x, y: card.position.y });
    },
    [canEdit, card.position]
  );

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      let newWidth = startSize.width;
      let newHeight = startSize.height;
      let newX = startCardPos.x;
      let newY = startCardPos.y;

      // Calculate new dimensions based on resize direction
      if (resizeDirection?.includes("e")) {
        newWidth = Math.max(MIN_SIZE, startSize.width + deltaX);
      }
      if (resizeDirection?.includes("w")) {
        newWidth = Math.max(MIN_SIZE, startSize.width - deltaX);
        newX = startCardPos.x + (startSize.width - newWidth);
      }
      if (resizeDirection?.includes("s")) {
        newHeight = Math.max(MIN_SIZE, startSize.height + deltaY);
      }
      if (resizeDirection?.includes("n")) {
        newHeight = Math.max(MIN_SIZE, startSize.height - deltaY);
        newY = startCardPos.y + (startSize.height - newHeight);
      }

      updateCard(slideId, card.id, {
        position: {
          ...card.position,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        },
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      pushHistory();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isResizing,
    resizeDirection,
    startPos,
    startSize,
    startCardPos,
    slideId,
    card.id,
    card.position,
    updateCard,
    pushHistory,
  ]);

  // Render card content based on type
  const renderCardContent = () => {
    switch (card.type) {
      case "text":
        return (
          <TextCard
            card={card}
            slideId={slideId}
            isSelected={isSelected}
            canEdit={canEdit}
            theme={theme}
          />
        );
      case "image":
        return (
          <ImageCard
            card={card}
            slideId={slideId}
            isSelected={isSelected}
            canEdit={canEdit}
          />
        );
      case "shape":
        return (
          <ShapeCard
            card={card}
            slideId={slideId}
            isSelected={isSelected}
            canEdit={canEdit}
            theme={theme}
          />
        );
      case "chart":
        return (
          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="ml-2 text-sm">Chart</span>
          </div>
        );
      case "table":
        return (
          <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
            </svg>
            <span className="ml-2 text-sm">Table</span>
          </div>
        );
      default:
        return (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            Unknown card type
          </div>
        );
    }
  };

  const style = {
    position: "absolute" as const,
    left: card.position.x,
    top: card.position.y,
    width: card.position.width,
    height: card.position.height,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    zIndex: isDragging ? 1000 : isSelected ? 10 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      className={cn(
        "group transition-shadow",
        isDragging && "opacity-80 shadow-lg",
        isSelected && "ring-2 ring-primary-500 ring-offset-2",
        canEdit && "cursor-move"
      )}
      onClick={handleClick}
      onMouseEnter={() => setHoveredCard(card.id)}
      onMouseLeave={() => setHoveredCard(null)}
      {...(canEdit && !isResizing ? { ...attributes, ...listeners } : {})}
    >
      {/* Card content */}
      <div className="h-full w-full overflow-hidden rounded-lg">
        {renderCardContent()}
      </div>

      {/* Resize handles (only when selected and can edit) */}
      {isSelected && canEdit && (
        <>
          {/* Corner handles */}
          <ResizeHandle direction="nw" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="ne" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="sw" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="se" onResizeStart={handleResizeStart} />
          {/* Edge handles */}
          <ResizeHandle direction="n" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="s" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="e" onResizeStart={handleResizeStart} />
          <ResizeHandle direction="w" onResizeStart={handleResizeStart} />
        </>
      )}
    </div>
  );
}

interface ResizeHandleProps {
  direction: string;
  onResizeStart: (e: React.MouseEvent, direction: string) => void;
}

function ResizeHandle({ direction, onResizeStart }: ResizeHandleProps) {
  const isCorner = direction.length === 2;
  const positionStyles: Record<string, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: "nw-resize" },
    ne: { top: -4, right: -4, cursor: "ne-resize" },
    sw: { bottom: -4, left: -4, cursor: "sw-resize" },
    se: { bottom: -4, right: -4, cursor: "se-resize" },
    n: { top: -4, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" },
    s: { bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" },
    e: { right: -4, top: "50%", transform: "translateY(-50%)", cursor: "e-resize" },
    w: { left: -4, top: "50%", transform: "translateY(-50%)", cursor: "w-resize" },
  };

  return (
    <div
      className={cn(
        "absolute bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity",
        isCorner ? "h-3 w-3 rounded-sm" : "rounded-full",
        !isCorner && (direction === "n" || direction === "s") && "h-2 w-6",
        !isCorner && (direction === "e" || direction === "w") && "h-6 w-2"
      )}
      style={positionStyles[direction]}
      onMouseDown={(e) => onResizeStart(e, direction)}
    />
  );
}
