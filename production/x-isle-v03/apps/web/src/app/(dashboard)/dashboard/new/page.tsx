"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPresentationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Presentation",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/editor/${data.id}`);
      } else {
        console.error("Failed to create presentation");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error creating presentation:", error);
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create New Presentation</h1>
        <p className="mt-2 text-muted-foreground">
          Start from scratch or let AI help you create
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Blank presentation */}
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="mt-4 font-semibold">Blank Presentation</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with a blank canvas and create your own design
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Presentation title (optional)"
            className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="mt-3 w-full rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {isCreating ? "Creating..." : "Create Blank"}
          </button>
        </form>

        {/* AI Generate */}
        <Link
          href="/dashboard/ai"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary-300 transition-colors"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <h3 className="mt-4 font-semibold">AI Generate</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your topic and let AI create the presentation
          </p>
          <div className="mt-4 text-sm font-medium text-primary-500">
            Try AI Generation →
          </div>
        </Link>
      </div>

      {/* Additional options */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Other ways to start</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/templates"
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">Use Template</div>
              <div className="text-sm text-muted-foreground">Pick a pre-made design</div>
            </div>
          </Link>
          <Link
            href="/dashboard/import"
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">Import Document</div>
              <div className="text-sm text-muted-foreground">Convert PDF or Word</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
