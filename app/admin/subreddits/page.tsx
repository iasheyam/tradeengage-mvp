"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { type Subreddit } from "@/lib/extract-subreddits";
import { downloadExcel } from "@/lib/export-excel";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function SubredditsAdminPage() {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [tradeFilter, setTradeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState<"all" | "contractor" | "homeowner">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/subreddits")
      .then((r) => r.json())
      .then((data: Subreddit[]) => setSubreddits(data));
  }, []);

  const allTrades = useMemo(
    () => Array.from(new Set(subreddits.flatMap((s) => s.trades))).sort(),
    [subreddits]
  );
  const allLocations = useMemo(
    () => Array.from(new Set(subreddits.flatMap((s) => s.locations))).sort(),
    [subreddits]
  );

  const filtered = useMemo(() => {
    return subreddits.filter((s) => {
      if (tradeFilter !== "all" && !s.trades.includes(tradeFilter)) return false;
      if (locationFilter !== "all" && !s.locations.includes(locationFilter)) return false;
      if (intentFilter !== "all" && s.intent !== intentFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subreddits, tradeFilter, locationFilter, intentFilter, search]);

  function exportToExcel() {
    const rows = filtered.map((s) => ({
      Name: `r/${s.name}`,
      URL: s.url,
      Title: s.title ?? "",
      Description: s.description ?? "",
      Subscribers: s.subscribers,
      Intent: s.intent === "contractor" ? "Contractor" : "Homeowner",
      Trades: s.trades.join(", "),
      Locations: s.locations.join(", "),
      "Weekly Posts": s.weeklyPostFrequency ?? "",
      "Saved At": new Date(s.savedAt).toLocaleString(),
    }));
    downloadExcel(rows, `subreddits-${new Date().toISOString().slice(0, 10)}`);
  }

  function clearAll() {
    fetch("/api/admin/subreddits", { method: "DELETE" });
    setSubreddits([]);
  }

  const contractorCount = filtered.filter((s) => s.intent === "contractor").length;
  const homeownerCount = filtered.filter((s) => s.intent === "homeowner").length;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
              Admin
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Subreddits</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subreddits.length} unique subreddits stored · {allTrades.length} trade{allTrades.length !== 1 ? "s" : ""} · {allLocations.length} location{allLocations.length !== 1 ? "s" : ""}
          </p>
        </div>
        {subreddits.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export{filtered.length !== subreddits.length ? ` (${filtered.length})` : ""}
            </button>
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {subreddits.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No subreddits saved yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Run a fetch from the debug page to populate this list.</p>
          <a
            href="/debug/reddit-fetch"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Reddit Fetch →
          </a>
        </div>
      )}

      {subreddits.length > 0 && (
        <>
          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Trade</label>
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Trades</option>
                {allTrades.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-0.5">
              {([
                { key: "all", label: `All (${filtered.length})` },
                { key: "contractor", label: `Contractor (${contractorCount})` },
                { key: "homeowner", label: `Homeowner (${homeownerCount})` },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setIntentFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    intentFilter === key
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative ml-auto">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search subreddits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-52"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subreddit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trades</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Locations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">r/{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description || s.title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.intent === "contractor"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {s.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 tabular-nums whitespace-nowrap">
                      {formatSubscribers(s.subscribers)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {s.trades.map((t) => (
                          <span key={t} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {s.locations.map((l) => (
                          <span key={l} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(s.savedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/admin/subreddits/${encodeURIComponent(s.name)}/edit`}
                          className="inline-flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                No subreddits match your filters.
              </div>
            )}
          </div>
        </>
      )}
      {/* Confirm Clear Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmClearOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Clear all subreddits?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete all {subreddits.length} saved subreddits from storage. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearAll(); setConfirmClearOpen(false); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
