"use client";

/**
 * CollaborationWrapper
 *
 * Handles fetching collaboration token and wrapping children
 * with the CollaborationProvider.
 */

import { useEffect, useState, type ReactNode } from "react";
import { CollaborationProvider } from "@/lib/collaboration";

interface CollaborationWrapperProps {
  children: ReactNode;
  presentationId: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  enabled?: boolean;
}

export function CollaborationWrapper({
  children,
  presentationId,
  user,
  enabled = true,
}: CollaborationWrapperProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    async function fetchToken() {
      try {
        const response = await fetch("/api/collaboration/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presentationId }),
        });

        if (!response.ok) {
          throw new Error("Failed to get collaboration token");
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error("[CollaborationWrapper] Token error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, [presentationId, enabled]);

  // If collaboration is disabled, render children directly
  if (!enabled) {
    return <>{children}</>;
  }

  // Show loading state briefly (collaboration is optional)
  if (isLoading) {
    return <>{children}</>;
  }

  // If there was an error or no token, still render but without collaboration
  if (error || !token) {
    console.warn("[CollaborationWrapper] Running without collaboration:", error);
    return <>{children}</>;
  }

  return (
    <CollaborationProvider
      presentationId={presentationId}
      token={token}
      user={{
        id: user.id,
        name: user.name || "Anonymous",
        email: user.email || undefined,
        image: user.image || undefined,
      }}
      enabled={enabled}
    >
      {children}
    </CollaborationProvider>
  );
}
