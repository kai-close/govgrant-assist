"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

type FilterType = "all" | "official" | "community";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  isOfficial: boolean;
}

// Sample templates for display
const sampleTemplates: Template[] = [
  {
    id: "1",
    name: "Professional Business",
    description: "Clean and modern design for corporate presentations",
    thumbnailUrl: null,
    isOfficial: true,
  },
  {
    id: "2",
    name: "Government Report",
    description: "Official template for government agency reports",
    thumbnailUrl: null,
    isOfficial: true,
  },
  {
    id: "3",
    name: "Project Proposal",
    description: "Persuasive layout for project pitches",
    thumbnailUrl: null,
    isOfficial: false,
  },
  {
    id: "4",
    name: "Training Material",
    description: "Educational template with clear hierarchy",
    thumbnailUrl: null,
    isOfficial: false,
  },
  {
    id: "5",
    name: "Quarterly Review",
    description: "Data-focused layout for business reviews",
    thumbnailUrl: null,
    isOfficial: true,
  },
  {
    id: "6",
    name: "Product Launch",
    description: "Engaging template for product announcements",
    thumbnailUrl: null,
    isOfficial: false,
  },
];

export default function TemplatesPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTemplates = useMemo(() => {
    switch (filter) {
      case "official":
        return sampleTemplates.filter((t) => t.isOfficial);
      case "community":
        return sampleTemplates.filter((t) => !t.isOfficial);
      default:
        return sampleTemplates;
    }
  }, [filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Start with a professionally designed template
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "border-b-2 border-primary-500 text-primary-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Templates
        </button>
        <button
          onClick={() => setFilter("official")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === "official"
              ? "border-b-2 border-primary-500 text-primary-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Official
        </button>
        <button
          onClick={() => setFilter("community")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === "community"
              ? "border-b-2 border-primary-500 text-primary-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Community
        </button>
      </div>

      {/* Templates grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No templates found for this filter
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary-300"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 relative">
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-12 w-12 text-primary-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium group-hover:text-primary-600">
                    {template.name}
                  </h3>
                  {template.isOfficial && (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Official
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <Link
                  href={`/dashboard/new?template=${template.id}`}
                  className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  Use Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
