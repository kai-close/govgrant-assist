"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UserPresenceList } from "../collaboration/remote-cursors";

interface EditorSidebarProps {
  canEdit: boolean;
}

export function EditorSidebar({ canEdit }: EditorSidebarProps) {
  const slides = useEditorStore((s) => s.slides);
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);
  const selectSlide = useEditorStore((s) => s.selectSlide);
  const addSlide = useEditorStore((s) => s.addSlide);
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide);
  const deleteSlide = useEditorStore((s) => s.deleteSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = slides.findIndex((s) => s.id === active.id);
        const newIndex = slides.findIndex((s) => s.id === over.id);
        reorderSlides(oldIndex, newIndex);
      }
    },
    [slides, reorderSlides]
  );

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-medium">Slides</span>
        {canEdit && (
          <button
            onClick={() => addSlide(selectedSlideId || undefined)}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
            title="Add slide"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Slides list */}
      <div className="flex-1 overflow-y-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
            disabled={!canEdit}
          >
            <div className="flex flex-col gap-2">
              {slides.map((slide, index) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isSelected={slide.id === selectedSlideId}
                  canEdit={canEdit}
                  onSelect={() => selectSlide(slide.id)}
                  onDuplicate={() => duplicateSlide(slide.id)}
                  onDelete={() => deleteSlide(slide.id)}
                  canDelete={slides.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* User Presence */}
      <div className="border-t border-border p-3">
        <UserPresenceList />
      </div>
    </aside>
  );
}

interface SortableSlideItemProps {
  slide: { id: string; cards: Array<{ id: string; type: string }> };
  index: number;
  isSelected: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableSlideItem({
  slide,
  index,
  isSelected,
  canEdit,
  canDelete,
  onSelect,
  onDuplicate,
  onDelete,
}: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border-2 transition-all",
        isSelected
          ? "border-primary-500 ring-2 ring-primary-500/20"
          : "border-transparent hover:border-border",
        isDragging && "opacity-50"
      )}
    >
      {/* Slide number */}
      <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {index + 1}
      </div>

      {/* Drag handle */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="flex h-4 w-8 items-center justify-center rounded bg-muted">
            <svg
              className="h-3 w-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9h16.5m-16.5 6.75h16.5"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <button
        onClick={onSelect}
        className="aspect-[16/9] w-full rounded-md bg-background p-2"
      >
        <SlideThumbnail cards={slide.cards} />
      </button>

      {/* Actions */}
      {canEdit && (
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="flex h-6 w-6 items-center justify-center rounded bg-background/80 hover:bg-accent transition-colors"
            title="Duplicate slide"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
              />
            </svg>
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex h-6 w-6 items-center justify-center rounded bg-background/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete slide"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SlideThumbnailProps {
  cards: Array<{ id: string; type: string }>;
}

function SlideThumbnail({ cards }: SlideThumbnailProps) {
  // Simple visual representation of cards
  if (cards.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Empty slide
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm bg-muted/30">
      {/* Simplified card representations */}
      {cards.slice(0, 4).map((card, i) => (
        <div
          key={card.id}
          className={cn(
            "absolute rounded-sm",
            card.type === "text" && "bg-primary-100/50",
            card.type === "image" && "bg-green-100/50",
            card.type === "shape" && "bg-purple-100/50",
            card.type === "chart" && "bg-orange-100/50",
            card.type === "table" && "bg-blue-100/50"
          )}
          style={{
            left: `${10 + i * 5}%`,
            top: `${10 + i * 10}%`,
            width: "40%",
            height: "30%",
          }}
        />
      ))}
      {cards.length > 4 && (
        <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground">
          +{cards.length - 4}
        </div>
      )}
    </div>
  );
}
