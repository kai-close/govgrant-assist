import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { cookies } from "next/headers";

// Dev user for bypassing auth in development
const DEV_USER = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "Admin",
  email: "admin@xisle.dev",
  image: null,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // In development, allow bypass with dev_auth cookie
  const cookieStore = await cookies();
  const devAuth = cookieStore.get("dev_auth")?.value;
  const isDev = process.env.NODE_ENV === "development";

  // Use real session or dev bypass
  const user = session?.user || (isDev && devAuth === "true" ? DEV_USER : null);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <DashboardSidebar user={user} />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top navigation */}
        <DashboardNav user={user} />

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
