"use client";

import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Card, PresentationTheme } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface ShapeCardProps {
  card: Card;
  slideId: string;
  isSelected: boolean;
  canEdit: boolean;
  theme: PresentationTheme;
}

type ShapeType = "rectangle" | "circle" | "triangle" | "diamond" | "arrow" | "star" | "line";

const SHAPE_TYPES: { type: ShapeType; label: string }[] = [
  { type: "rectangle", label: "Rectangle" },
  { type: "circle", label: "Circle" },
  { type: "triangle", label: "Triangle" },
  { type: "diamond", label: "Diamond" },
  { type: "arrow", label: "Arrow" },
  { type: "star", label: "Star" },
  { type: "line", label: "Line" },
];

export function ShapeCard({
  card,
  slideId,
  isSelected,
  canEdit,
  theme,
}: ShapeCardProps) {
  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const content = card.content as { shapeType?: ShapeType };
  const style = useMemo(() => card.style || {}, [card.style]);

  const shapeType = content.shapeType || "rectangle";
  const fillColor = style.backgroundColor || theme.primaryColor || "#3b82f6";
  const strokeColor = style.borderColor || "#1e40af";
  const strokeWidth = style.borderWidth || 0;

  const handleShapeTypeChange = useCallback(
    (type: ShapeType) => {
      updateCard(slideId, card.id, {
        content: {
          ...content,
          shapeType: type,
        },
      });
      pushHistory();
    },
    [slideId, card.id, content, updateCard, pushHistory]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      updateCard(slideId, card.id, {
        style: {
          ...style,
          backgroundColor: color,
        },
      });
      pushHistory();
    },
    [slideId, card.id, style, updateCard, pushHistory]
  );

  const renderShape = () => {
    const commonProps = {
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };

    switch (shapeType) {
      case "rectangle":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="5" y="5" width="90" height="90" rx="8" {...commonProps} />
          </svg>
        );

      case "circle":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" {...commonProps} />
          </svg>
        );

      case "triangle":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <polygon points="50,5 95,95 5,95" {...commonProps} />
          </svg>
        );

      case "diamond":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <polygon points="50,5 95,50 50,95 5,50" {...commonProps} />
          </svg>
        );

      case "arrow":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,35 60,35 60,10 100,50 60,90 60,65 0,65" {...commonProps} />
          </svg>
        );

      case "star":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <polygon
              points="50,5 61,35 95,35 68,55 79,90 50,70 21,90 32,55 5,35 39,35"
              {...commonProps}
            />
          </svg>
        );

      case "line":
        return (
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1="5"
              y1="50"
              x2="95"
              y2="50"
              stroke={fillColor}
              strokeWidth={Math.max(4, strokeWidth)}
              strokeLinecap="round"
            />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative h-full w-full">
      {renderShape()}

      {/* Shape controls (when selected) */}
      {isSelected && canEdit && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-card/90 p-1 shadow-lg backdrop-blur-sm border border-border">
          {/* Shape type selector */}
          {SHAPE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={(e) => {
                e.stopPropagation();
                handleShapeTypeChange(type);
              }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                shapeType === type
                  ? "bg-primary-100 text-primary-700"
                  : "hover:bg-accent"
              )}
              title={label}
            >
              <ShapeIcon type={type} />
            </button>
          ))}

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Color picker */}
          <div className="relative">
            <input
              type="color"
              value={fillColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              onClick={(e) => e.stopPropagation()}
            />
            <div
              className="h-7 w-7 rounded border border-gray-300"
              style={{ backgroundColor: fillColor }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ type }: { type: ShapeType }) {
  const iconClass = "h-4 w-4";

  switch (type) {
    case "rectangle":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
        </svg>
      );
    case "circle":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "triangle":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <polygon points="12,3 22,21 2,21" />
        </svg>
      );
    case "diamond":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      );
    case "arrow":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <polygon points="2,9 14,9 14,4 22,12 14,20 14,15 2,15" />
        </svg>
      );
    case "star":
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
        </svg>
      );
    case "line":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}
