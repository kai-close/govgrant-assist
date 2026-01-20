"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AIGeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState("5");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      // Create presentation and generate with AI
      const response = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          slideCount: parseInt(slideCount),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/editor/${data.id}`);
      } else {
        console.error("Failed to generate presentation");
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Error generating presentation:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900">
          <svg
            className="h-8 w-8"
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
        <h1 className="mt-4 text-2xl font-bold">AI Presentation Generator</h1>
        <p className="mt-2 text-muted-foreground">
          Describe your topic and let AI create a professional presentation
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="font-medium">What is your presentation about?</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Quarterly sales report for Q4 2024 highlighting key achievements, challenges faced, and goals for the next quarter..."
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-medium">Number of slides</span>
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="3">3 slides (Brief)</option>
              <option value="5">5 slides (Standard)</option>
              <option value="8">8 slides (Detailed)</option>
              <option value="10">10 slides (Comprehensive)</option>
              <option value="15">15 slides (In-depth)</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Presentation"
          )}
        </button>
      </form>

      {/* Tips */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Tips for better results</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Be specific about your topic and audience
          </li>
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Include key points you want to cover
          </li>
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Mention the tone (formal, casual, persuasive)
          </li>
        </ul>
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link href="/dashboard/new" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to creation options
        </Link>
      </div>
    </div>
  );
}
