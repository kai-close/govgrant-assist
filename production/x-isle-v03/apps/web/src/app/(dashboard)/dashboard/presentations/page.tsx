import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { presentations } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { formatRelativeDate } from "@/lib/utils";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "My Presentations | X-Isle",
  description: "View and manage your presentations",
};

// Dev user for bypassing auth in development
const DEV_USER = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "Admin",
  email: "admin@xisle.dev",
};

export default async function PresentationsPage() {
  const session = await auth();

  // In development, allow bypass with dev_auth cookie
  const cookieStore = await cookies();
  const devAuth = cookieStore.get("dev_auth")?.value;
  const isDev = process.env.NODE_ENV === "development";
  const user = session?.user || (isDev && devAuth === "true" ? DEV_USER : null);

  if (!user) {
    return null;
  }

  // Fetch all presentations
  const userPresentations = await db.query.presentations.findMany({
    where: and(
      eq(presentations.ownerId, user.id),
      isNull(presentations.deletedAt)
    ),
    orderBy: [desc(presentations.lastEditedAt)],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Presentations</h1>
          <p className="mt-1 text-muted-foreground">
            {userPresentations.length} presentation{userPresentations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Presentation
        </Link>
      </div>

      {/* Presentations grid */}
      {userPresentations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userPresentations.map((presentation) => (
            <Link
              key={presentation.id}
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
            href="/dashboard/new"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Presentation
          </Link>
        </div>
      )}
    </div>
  );
}
