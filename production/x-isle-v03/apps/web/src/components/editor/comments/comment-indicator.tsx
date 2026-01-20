"use client";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface CommentIndicatorProps {
  presentationId: string;
  slideId?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Small badge showing comment count
 */
export function CommentIndicator({
  presentationId,
  slideId,
  onClick,
  className,
}: CommentIndicatorProps) {
  const { data } = trpc.comments.count.useQuery({
    presentationId,
    slideId,
  });

  if (!data || data.count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors",
        className
      )}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
      {data.count}
    </button>
  );
}

/**
 * Comments toggle button for toolbar
 */
interface CommentsButtonProps {
  presentationId: string;
  onClick: () => void;
  isOpen: boolean;
}

export function CommentsButton({
  presentationId,
  onClick,
  isOpen,
}: CommentsButtonProps) {
  const { data } = trpc.comments.count.useQuery({ presentationId });
  const count = data?.count || 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        isOpen
          ? "bg-primary-100 text-primary-700"
          : "hover:bg-accent"
      )}
      title="Comments"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
      Comments
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
