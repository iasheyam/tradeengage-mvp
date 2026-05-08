"use client";

import { useState } from "react";

type RunState = "idle" | "running" | "done" | "error";

export default function DebugFBGroupEnrichPage() {
  const [url, setUrl] = useState("");
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function run() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setRunState("running");
    setResult(null);
    setErrorMsg(null);
    setElapsed(null);

    const start = Date.now();
    try {
      const res = await fetch("/api/admin/fb-group-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: [
            {
              id: extractGroupId(trimmed) ?? trimmed,
              url: trimmed,
              lastEnrichedAt: null,
            },
          ],
        }),
      });

      const data = await res.json();
      setElapsed(Date.now() - start);

      if (!res.ok) {
        setErrorMsg(data?.error ?? `HTTP ${res.status}`);
        setRunState("error");
        return;
      }

      setResult(data);
      setRunState("done");
    } catch (e) {
      setElapsed(Date.now() - start);
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setRunState("error");
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Debug
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">FB Group Enrich</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test the Apify <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">facebook-group-details-scraper</code> actor with a single group URL.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Facebook Group URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="https://www.facebook.com/groups/example/"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={run}
            disabled={!url.trim() || runState === "running"}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              runState === "running"
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {runState === "running" ? (
              <>
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Running…
              </>
            ) : (
              "Run"
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {(runState === "done" || runState === "error") && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Result header */}
          <div className={`flex items-center gap-2 px-4 py-3 border-b text-xs font-semibold ${
            runState === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}>
            {runState === "error" ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Error
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Success
              </>
            )}
            {elapsed !== null && (
              <span className="ml-auto font-normal opacity-70">{(elapsed / 1000).toFixed(1)}s</span>
            )}
          </div>

          {/* Error message */}
          {runState === "error" && errorMsg && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
              {errorMsg}
            </div>
          )}

          {/* JSON output */}
          {result !== null && (
            <pre className="p-4 text-xs font-mono text-gray-800 bg-gray-50 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function extractGroupId(url: string): string | null {
  const match = url.match(/facebook\.com\/groups\/([^\/\?#]+)/);
  return match ? match[1] : null;
}
