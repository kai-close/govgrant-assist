"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface CommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isResolved: boolean;
  user: CommentUser;
  replies?: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  presentationId: string;
  currentUserId: string;
  onReply?: () => void;
}

export function CommentThread({
  comment,
  presentationId,
  currentUserId,
  onReply: _onReply,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const utils = trpc.useUtils();

  const createReply = trpc.comments.create.useMutation({
    onSuccess: () => {
      setReplyContent("");
      setIsReplying(false);
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const resolveComment = trpc.comments.resolve.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const unresolveComment = trpc.comments.unresolve.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ presentationId });
    },
  });

  const isOwner = comment.user.id === currentUserId;

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createReply.mutate({
      presentationId,
      parentId: comment.id,
      content: replyContent.trim(),
    });
  };

  const handleUpdateComment = () => {
    if (!editContent.trim()) return;
    updateComment.mutate({
      id: comment.id,
      content: editContent.trim(),
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3",
        comment.isResolved && "opacity-60"
      )}
    >
      {/* Comment header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 relative"
          >
            {comment.user.image ? (
              <Image
                src={comment.user.image}
                alt={comment.user.name || ""}
                fill
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              comment.user.name?.[0] || comment.user.email?.[0] || "?"
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {comment.user.name || comment.user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {comment.isResolved ? (
            <button
              onClick={() => unresolveComment.mutate({ id: comment.id })}
              className="rounded p-1 text-xs text-muted-foreground hover:bg-accent"
              title="Reopen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => resolveComment.mutate({ id: comment.id })}
              className="rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-green-600"
              title="Resolve"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-accent"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this comment?")) {
                    deleteComment.mutate({ id: comment.id });
                  }
                }}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-red-600"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Comment content */}
      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              className="rounded px-3 py-1 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateComment}
              disabled={updateComment.isPending}
              className="rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
      )}

      {/* Resolved badge */}
      {comment.isResolved && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Resolved
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="rounded bg-muted/50 p-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-medium text-primary-700 relative">
                  {reply.user.image ? (
                    <Image
                      src={reply.user.image}
                      alt={reply.user.name || ""}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    reply.user.name?.[0] || "?"
                  )}
                </div>
                <span className="text-xs font-medium">{reply.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1 text-sm">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {!comment.isResolved && (
        <div className="mt-3">
          {isReplying ? (
            <div>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                  className="rounded px-3 py-1 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={createReply.isPending || !replyContent.trim()}
                  className="rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsReplying(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
