import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { presentations } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your X-Isle dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Fetch recent presentations
  const recentPresentations = await db.query.presentations.findMany({
    where: and(
      eq(presentations.ownerId, session.user.id),
      isNull(presentations.deletedAt)
    ),
    orderBy: [desc(presentations.lastEditedAt)],
    limit: 6,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create stunning presentations with AI assistance
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href={"/dashboard/new" as Route}
          icon={
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          }
          title="New Presentation"
          description="Start from scratch or use AI"
          variant="primary"
        />
        <QuickActionCard
          href={"/dashboard/templates" as Route}
          icon={
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
                d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25z"
              />
            </svg>
          }
          title="Use Template"
          description="Start with a pre-made design"
        />
        <QuickActionCard
          href={"/dashboard/import" as Route}
          icon={
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          }
          title="Upload Document"
          description="Generate slides from PDF/Word"
        />
        <QuickActionCard
          href={"/dashboard/ai" as Route}
          icon={
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
          }
          title="AI Generate"
          description="Create with a single prompt"
        />
      </div>

      {/* Recent presentations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Presentations</h2>
          <Link
            href={"/dashboard/presentations" as Route}
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            View all
          </Link>
        </div>

        {recentPresentations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentPresentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium">No presentations yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first presentation to get started
            </p>
            <Link
              href={"/dashboard/new" as Route}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create Presentation
            </Link>
          </div>
        )}
      </div>

      {/* Tips section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Tips for better presentations</h3>
        <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Use AI to generate content, then refine it yourself
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Upload documents to extract key information automatically
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Use templates to ensure compliance with branding guidelines
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Export to PowerPoint for final edits and sharing
          </li>
        </ul>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  variant = "default",
}: {
  href: Route;
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border p-5 transition-colors ${
        variant === "primary"
          ? "border-primary-200 bg-primary-50 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:hover:bg-primary-900"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          variant === "primary"
            ? "bg-primary-500 text-white"
            : "bg-muted text-muted-foreground group-hover:bg-primary-100 group-hover:text-primary-600"
        }`}
      >
        {icon}
      </div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function PresentationCard({
  presentation,
}: {
  presentation: {
    id: string;
    title: string;
    slideCount: number | null;
    lastEditedAt: Date;
    thumbnailUrl: string | null;
  };
}) {
  return (
    <Link
      href={`/editor/${presentation.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary-300"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative">
        {presentation.thumbnailUrl ? (
          <Image
            src={presentation.thumbnailUrl}
            alt={presentation.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
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
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate font-medium group-hover:text-primary-600">
          {presentation.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {presentation.slideCount || 0} slides &middot;{" "}
          {formatRelativeDate(presentation.lastEditedAt)}
        </p>
      </div>
    </Link>
  );
}
