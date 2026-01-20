"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Card } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  card: Card;
  slideId: string;
  isSelected: boolean;
  canEdit: boolean;
}

export function ImageCard({
  card,
  slideId,
  isSelected,
  canEdit,
}: ImageCardProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateCard = useEditorStore((s) => s.updateCard);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const content = card.content as { src?: string; alt?: string; objectFit?: "cover" | "contain" | "fill" | "none" };
  const style = card.style || {};

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      // For now, convert to base64 (in production, would upload to S3)
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        updateCard(slideId, card.id, {
          content: {
            src,
            alt: file.name,
            objectFit: content.objectFit || "cover",
          },
        });
        pushHistory();
      };
      reader.readAsDataURL(file);
    },
    [slideId, card.id, content.objectFit, updateCard, pushHistory]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);

      if (!canEdit) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [canEdit, handleFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (canEdit) {
        setIsDraggingOver(true);
      }
    },
    [canEdit]
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (canEdit && isSelected && !content.src) {
      fileInputRef.current?.click();
    }
  }, [canEdit, isSelected, content.src]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemoveImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateCard(slideId, card.id, {
        content: {
          objectFit: content.objectFit,
        },
      });
      pushHistory();
    },
    [slideId, card.id, content.objectFit, updateCard, pushHistory]
  );

  const handleObjectFitChange = useCallback(
    (objectFit: "cover" | "contain" | "fill" | "none") => {
      updateCard(slideId, card.id, {
        content: {
          ...content,
          objectFit,
        },
      });
      pushHistory();
    },
    [slideId, card.id, content, updateCard, pushHistory]
  );

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg",
        !content.src && "border-2 border-dashed",
        isDraggingOver && "border-primary-500 bg-primary-50",
        !content.src && !isDraggingOver && "border-gray-300 bg-gray-50"
      )}
      style={{
        borderRadius: style.borderRadius || 8,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      {content.src ? (
        <>
          <Image
            src={content.src}
            alt={content.alt || ""}
            fill
            className="h-full w-full"
            style={{
              objectFit: (content.objectFit as "cover" | "contain" | "fill") || "cover",
            }}
            unoptimized
          />

          {/* Image controls (when selected) */}
          {isSelected && canEdit && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-card/90 p-1 shadow-lg backdrop-blur-sm">
              {/* Object fit buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleObjectFitChange("cover");
                }}
                className={cn(
                  "flex h-7 px-2 items-center justify-center rounded text-xs transition-colors",
                  content.objectFit === "cover" || !content.objectFit
                    ? "bg-primary-100 text-primary-700"
                    : "hover:bg-accent"
                )}
                title="Cover"
              >
                Cover
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleObjectFitChange("contain");
                }}
                className={cn(
                  "flex h-7 px-2 items-center justify-center rounded text-xs transition-colors",
                  content.objectFit === "contain"
                    ? "bg-primary-100 text-primary-700"
                    : "hover:bg-accent"
                )}
                title="Contain"
              >
                Contain
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleObjectFitChange("fill");
                }}
                className={cn(
                  "flex h-7 px-2 items-center justify-center rounded text-xs transition-colors",
                  content.objectFit === "fill"
                    ? "bg-primary-100 text-primary-700"
                    : "hover:bg-accent"
                )}
                title="Fill"
              >
                Fill
              </button>

              <div className="mx-1 h-5 w-px bg-border" />

              {/* Replace image */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex h-7 px-2 items-center justify-center rounded text-xs hover:bg-accent transition-colors"
                title="Replace image"
              >
                Replace
              </button>

              {/* Remove image */}
              <button
                onClick={handleRemoveImage}
                className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 transition-colors"
                title="Remove image"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
          <svg
            className={cn(
              "h-10 w-10",
              isDraggingOver ? "text-primary-500" : "text-gray-400"
            )}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <p
            className={cn(
              "text-sm",
              isDraggingOver ? "text-primary-600" : "text-gray-500"
            )}
          >
            {isDraggingOver
              ? "Drop image here"
              : canEdit
              ? "Click or drag to add image"
              : "No image"}
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
