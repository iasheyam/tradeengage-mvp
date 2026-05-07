"use client";

import { useState } from "react";
import type { FBGroupFetchResponse, FBGroupResult } from "@/app/api/debug/fb-group-fetch/route";
import { extractUniqueGroups, mergeWithStored, loadFromStorage, type FBGroup, type MergeStats } from "@/lib/extract-groups";

const STORAGE_KEY = "fb_groups";

const TRADES = ["HVAC", "Plumbing", "Electrical", "Roofing", "Cleaning", "Landscaping"];
const LOCATIONS = ["Atlanta, GA"];

export default function FBGroupFetchPage() {
  const [trade, setTrade] = useState("HVAC");
  const [location, setLocation] = useState("Atlanta, GA");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FBGroupFetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "contractor" | "homeowner">("all");
  const [mergeStats, setMergeStats] = useState<MergeStats | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setMergeStats(null);

    try {
      const res = await fetch("/api/debug/fb-group-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResponse(data);

      // Extract unique groups, cross-check against storage, merge
      const incoming = extractUniqueGroups(data.results, trade, location);
      const existing: FBGroup[] = loadFromStorage(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const { groups: merged, stats } = mergeWithStored(existing, incoming, trade, location);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      setMergeStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const filtered: FBGroupResult[] = response?.results.filter(
    (r) => filter === "all" || r.intent === filter
  ) ?? [];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Debug
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">FB Group Fetch</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test Facebook group discovery via Google Custom Search API.
        </p>
      </div>

      {/* Config + Run */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Trade
            </label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRADES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              loading
                ? "bg-blue-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run
              </>
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
                <span className="text-green-700">
                  <span className="font-bold">{mergeStats.added}</span> new
                </span>
                <span className="text-blue-700">
                  <span className="font-bold">{mergeStats.updated}</span> updated
                </span>
                <span className="text-gray-500">
                  <span className="font-bold">{mergeStats.unchanged}</span> unchanged
                </span>
                <a href="/admin/fb-groups" className="text-blue-600 underline font-medium">
                  View in Admin →
                </a>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{response.totalFound}</span> groups found
                across <span className="font-semibold text-gray-900">{response.queriesRun}</span> queries
              </p>
              {response.errors.length > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {response.errors.length} query error{response.errors.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Intent filter */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-0.5">
              {(["all", "contractor", "homeowner"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "all" ? `All (${response.totalFound})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${response.results.filter(r => r.intent === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Query Used</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.snippet}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.intent === "contractor"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {r.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {r.queryUsed}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">No results for this filter.</div>
            )}
          </div>

          {/* Query errors */}
          {response.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Query Errors</p>
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
