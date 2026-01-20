"use client";

/**
 * Remote Cursors & Selections
 *
 * Display other users' cursors and card selections in real-time.
 * Integrates with the collaboration context.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCollaborationContext, type UserAwareness } from "@/lib/collaboration";

// User colors palette (consistent with backend)
const USER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6366f1", "#06b6d4",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface RemoteCursorsProps {
  currentSlideId: string;
  canvasScale: number;
}

/**
 * Display remote user cursors on the canvas
 */
export function RemoteCursors({
  currentSlideId,
  canvasScale,
}: RemoteCursorsProps) {
  const { remoteUsers, isConnected } = useCollaborationContext();

  if (!isConnected) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      {remoteUsers.map((user) => {
        // Only show cursors on the current slide
        if (!user.cursor || user.cursor.slideId !== currentSlideId) return null;

        return (
          <RemoteCursor
            key={user.id}
            user={user}
            scale={canvasScale}
          />
        );
      })}
    </div>
  );
}

interface RemoteCursorProps {
  user: UserAwareness;
  scale: number;
}

function RemoteCursor({ user, scale }: RemoteCursorProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Hide cursor after inactivity
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [user.cursor?.x, user.cursor?.y]);

  if (!isVisible || !user.cursor) return null;

  const color = user.color || getUserColor(user.id);

  return (
    <div
      className="absolute transition-all duration-75 ease-out"
      style={{
        left: user.cursor.x * scale,
        top: user.cursor.y * scale,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.4567L17.8135 2.83181L14.1627 19.1691L10.6969 14.5211L5.65376 12.4567Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User name label */}
      <div
        className="absolute left-4 top-4 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {user.name || "Anonymous"}
      </div>
    </div>
  );
}

interface RemoteSelectionsProps {
  currentSlideId: string;
  getCardPosition: (cardId: string) => { x: number; y: number; width: number; height: number } | null;
  canvasScale: number;
}

/**
 * Display remote user card selections
 */
export function RemoteSelections({
  currentSlideId,
  getCardPosition,
  canvasScale,
}: RemoteSelectionsProps) {
  const { remoteUsers, isConnected } = useCollaborationContext();

  if (!isConnected) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {remoteUsers.map((user) => {
        if (!user.selection || user.selection.slideId !== currentSlideId) {
          return null;
        }

        const color = user.color || getUserColor(user.id);

        return user.selection.cardIds.map((cardId) => {
          const position = getCardPosition(cardId);
          if (!position) return null;

          return (
            <div
              key={`${user.id}-${cardId}`}
              className="absolute rounded-lg border-2 transition-all duration-75"
              style={{
                left: position.x * canvasScale,
                top: position.y * canvasScale,
                width: position.width * canvasScale,
                height: position.height * canvasScale,
                borderColor: color,
                boxShadow: `0 0 0 2px ${color}20`,
              }}
            >
              {/* User indicator */}
              <div
                className="absolute -top-6 left-0 flex items-center gap-1 rounded-t-md px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={16}
                    height={16}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                    {user.name?.[0] || "?"}
                  </div>
                )}
                <span>{user.name}</span>
              </div>
            </div>
          );
        });
      })}
    </div>
  );
}

/**
 * Collaboration status indicator
 */
export function CollaborationStatus() {
  const { isConnected, isSynced, remoteUsers } = useCollaborationContext();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (!isSynced) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-green-500" />
      {remoteUsers.length > 0 ? (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {remoteUsers.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white relative"
                style={{ backgroundColor: user.color || getUserColor(user.id) }}
                title={user.name}
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    fill
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  user.name?.[0] || "?"
                )}
              </div>
            ))}
            {remoteUsers.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-xs font-medium">
                +{remoteUsers.length - 3}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {remoteUsers.length} online
          </span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Connected</span>
      )}
    </div>
  );
}

/**
 * User presence list (for sidebar)
 */
export function UserPresenceList() {
  const { remoteUsers, currentUser, isConnected } = useCollaborationContext();

  if (!isConnected) return null;

  const allUsers = currentUser
    ? [{ ...currentUser, isCurrentUser: true }, ...remoteUsers.map((u) => ({ ...u, isCurrentUser: false }))]
    : remoteUsers.map((u) => ({ ...u, isCurrentUser: false }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Online ({allUsers.length})
      </h3>
      <div className="space-y-1">
        {allUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white relative"
              style={{ backgroundColor: user.color || getUserColor(user.id) }}
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                user.name?.[0] || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.name}
                {user.isCurrentUser && (
                  <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                )}
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
