"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { trpc } from "@/lib/trpc/client";
import { CommentThread } from "./comment-thread";
import { cn } from "@/lib/utils";

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  presentationId: string;
  currentUserId: string;
}

export function CommentsSidebar({
  isOpen,
  onClose,
  presentationId,
  currentUserId,
}: CommentsSidebarProps) {
  const [newComment, setNewComment] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [filter, setFilter] = useState<"all" | "slide">("all");

  const selectedSlideId = useEditorStore((s) => s.selectedSlideId);

  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.comments.list.useQuery(
    {
      presentationId,
      slideId: filter === "slide" ? selectedSlideId || undefined : undefined,
      includeResolved: showResolved,
    },
    { enabled: isOpen }
  );

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate({
      presentationId,
      slideId: selectedSlideId || undefined,
      content: newComment.trim(),
    });
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border z-40 transition-transform duration-200",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Comments</h2>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-accent transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === "all"
                ? "bg-primary-500 text-white"
                : "bg-muted hover:bg-accent"
            )}
          >
            All slides
          </button>
          <button
            onClick={() => setFilter("slide")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === "slide"
                ? "bg-primary-500 text-white"
                : "bg-muted hover:bg-accent"
            )}
          >
            Current slide
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Show resolved
        </label>
      </div>

      {/* New comment input */}
      <div className="border-b border-border p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={createComment.isPending || !newComment.trim()}
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {createComment.isPending ? "Adding..." : "Add comment"}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment as any}
              presentationId={presentationId}
              currentUserId={currentUserId}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            <p className="mt-2 text-sm text-muted-foreground">
              No comments yet
            </p>
            <p className="text-xs text-muted-foreground">
              Be the first to add a comment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
