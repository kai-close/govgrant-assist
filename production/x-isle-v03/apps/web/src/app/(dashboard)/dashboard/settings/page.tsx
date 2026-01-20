"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [aiProvider, setAiProvider] = useState("azure");

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user;

  if (!mounted) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xl font-semibold">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || "?"}
          </div>
          <div>
            <div className="font-medium">{user?.name || "Anonymous"}</div>
            <div className="text-sm text-muted-foreground">{user?.email || "Not signed in"}</div>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">AI Provider</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your preferred AI provider for content generation
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent">
            <input
              type="radio"
              name="provider"
              value="azure"
              checked={aiProvider === "azure"}
              onChange={(e) => setAiProvider(e.target.value)}
              className="text-primary-500"
            />
            <div>
              <div className="font-medium">Azure OpenAI (Default)</div>
              <div className="text-sm text-muted-foreground">Government-approved, no API key needed</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent">
            <input
              type="radio"
              name="provider"
              value="openai"
              checked={aiProvider === "openai"}
              onChange={(e) => setAiProvider(e.target.value)}
              className="text-primary-500"
            />
            <div>
              <div className="font-medium">OpenAI</div>
              <div className="text-sm text-muted-foreground">Requires your own API key</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent">
            <input
              type="radio"
              name="provider"
              value="anthropic"
              checked={aiProvider === "anthropic"}
              onChange={(e) => setAiProvider(e.target.value)}
              className="text-primary-500"
            />
            <div>
              <div className="font-medium">Anthropic Claude</div>
              <div className="text-sm text-muted-foreground">Requires your own API key</div>
            </div>
          </label>
        </div>
      </div>

      {/* Theme settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how X-Isle looks
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
              theme === "light"
                ? "border-primary-500 bg-white"
                : "border-border bg-white hover:border-primary-300"
            }`}
          >
            <div className="text-sm font-medium">Light</div>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
              theme === "dark"
                ? "border-primary-500 bg-gray-900 text-white"
                : "border-border bg-gray-900 text-white hover:border-primary-300"
            }`}
          >
            <div className="text-sm font-medium">Dark</div>
          </button>
          <button
            onClick={() => setTheme("system")}
            className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
              theme === "system"
                ? "border-primary-500"
                : "border-border hover:border-primary-300"
            }`}
          >
            <div className="text-sm font-medium">System</div>
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h2 className="font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
          Irreversible actions
        </p>
        <div className="mt-4">
          <button className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:bg-red-950 dark:hover:bg-red-900">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
