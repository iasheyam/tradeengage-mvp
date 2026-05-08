"use client";

import React, { useState, useEffect } from "react";
import type { RedditFetchResponse, SubredditResult } from "@/app/api/debug/reddit-fetch/route";
import {
  extractUniqueSubreddits,
  mergeSubredditsWithStored,
  type Subreddit,
  type MergeStats,
} from "@/lib/extract-subreddits";

const DEBUG_KEY = "debug_reddit_fetch_last";

const TRADES = ["HVAC", "Plumbing", "Electrical", "Roofing", "Cleaning", "Landscaping"];
const LOCATIONS = ["Atlanta, GA"];

interface SavedFetch {
  trade: string;
  location: string;
  fetchedAt: string;
  response: RedditFetchResponse;
}

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function RedditFetchPage() {
  const [trade, setTrade] = useState("HVAC");
  const [location, setLocation] = useState("Atlanta, GA");
  const [loading, setLoading] = useState(false);
  const [savedFetch, setSavedFetch] = useState<SavedFetch | null>(null);
  const [response, setResponse] = useState<RedditFetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "contractor" | "homeowner">("all");
  const [mergeStats, setMergeStats] = useState<MergeStats | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DEBUG_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedFetch;
        setSavedFetch(saved);
        setResponse(saved.response);
        setTrade(saved.trade);
        setLocation(saved.location);
      } catch {}
    }
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setMergeStats(null);
    setExpandedRow(null);

    try {
      const res = await fetch("/api/debug/reddit-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, location }),
      });
      const data: RedditFetchResponse = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? "Request failed");

      const saved: SavedFetch = { trade, location, fetchedAt: new Date().toISOString(), response: data };
      localStorage.setItem(DEBUG_KEY, JSON.stringify(saved));
      setSavedFetch(saved);
      setResponse(data);

      const incoming = extractUniqueSubreddits(data.results, trade, location);
      const existing: Subreddit[] = await fetch("/api/admin/subreddits").then((r) => r.json());
      const { subreddits: merged, stats } = mergeSubredditsWithStored(existing, incoming, trade, location);
      await fetch("/api/admin/subreddits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      setMergeStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const filtered: SubredditResult[] =
    response?.results.filter((r) => filter === "all" || r.intent === filter) ?? [];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Debug
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Reddit Fetch</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test subreddit discovery via Reddit public API.
        </p>
      </div>

      {/* Config + Run */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Trade</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TRADES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${loading ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {loading ? (
              <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Running...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>Run</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {/* Results */}
      {response && (
        <>
          {/* Last fetch banner */}
          {savedFetch && (
            <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Last fetch: <span className="font-medium text-gray-700">{savedFetch.trade} · {savedFetch.location}</span>
              <span className="mx-1">·</span>
              {new Date(savedFetch.fetchedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          {/* Merge stats banner */}
          {mergeStats !== null && (
            <div className="flex items-center justify-between px-4 py-3 mb-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Storage updated for <span className="font-semibold">{trade} · {location}</span></span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-green-700"><span className="font-bold">{mergeStats.added}</span> new</span>
                <span className="text-blue-700"><span className="font-bold">{mergeStats.updated}</span> updated</span>
                <span className="text-gray-500"><span className="font-bold">{mergeStats.unchanged}</span> unchanged</span>
                <a href="/admin/subreddits" className="text-blue-600 underline font-medium">View in Admin →</a>
              </div>
            </div>
          )}

          {/* Summary + filter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{response.totalFound}</span> subreddits found across <span className="font-semibold text-gray-900">{response.queriesRun}</span> queries
              </p>
              {response.errors.length > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {response.errors.length} error{response.errors.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-0.5">
              {(["all", "contractor", "homeowner"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
                  {f === "all" ? `All (${response.totalFound})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${response.results.filter((r) => r.intent === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subreddit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Query Used</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <React.Fragment key={r.name}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">r/{r.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.description || r.title}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.intent === "contractor" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {r.intent}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 tabular-nums">
                        {formatSubscribers(r.subscribers)}
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{r.queryUsed}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setExpandedRow(expandedRow === r.name ? null : r.name)}
                            className={`text-xs font-mono font-medium px-2 py-1 rounded border transition-colors ${expandedRow === r.name ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                          >
                            {"{ }"}
                          </button>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:underline">
                            Open →
                          </a>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === r.name && (
                      <tr className="bg-gray-950">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed">
                            {JSON.stringify(r, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">No results for this filter.</div>
            )}
          </div>

          {/* Errors */}
          {response.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Errors</p>
              {response.errors.map((e, i) => (
                <div key={i} className="text-xs text-amber-700 mb-1">
                  <code className="bg-amber-100 px-1 py-0.5 rounded">{e.query}</code> — {e.error}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
