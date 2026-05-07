"use client";

import { useState, useEffect, useMemo } from "react";
import { loadFromStorage, type FBGroup } from "@/lib/extract-groups";

const STORAGE_KEY = "fb_groups";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type EnrichState = "idle" | "running" | "done";

export default function FBGroupsAdminPage() {
  const [groups, setGroups] = useState<FBGroup[]>([]);
  const [enrichState, setEnrichState] = useState<EnrichState>("idle");
  const [enrichedCount, setEnrichedCount] = useState(0);

  const [tradeFilter, setTradeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState<"all" | "contractor" | "homeowner">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setGroups(loadFromStorage(stored));
  }, []);

  // Derive unique trades and locations from stored groups
  const allTrades = useMemo(
    () => Array.from(new Set(groups.flatMap((g) => g.trades ?? []))).sort(),
    [groups]
  );
  const allLocations = useMemo(
    () => Array.from(new Set(groups.flatMap((g) => g.locations ?? []))).sort(),
    [groups]
  );

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (tradeFilter !== "all" && !(g.trades ?? []).includes(tradeFilter)) return false;
      if (locationFilter !== "all" && !(g.locations ?? []).includes(locationFilter)) return false;
      if (intentFilter !== "all" && g.intent !== intentFilter) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [groups, tradeFilter, locationFilter, intentFilter, search]);

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    setGroups([]);
    setEnrichState("idle");
  }

  async function enrichMetadata() {
    if (!groups.length) return;
    setEnrichState("running");
    setEnrichedCount(0);

    const payload = groups.map((g) => ({ id: g.id, url: g.url }));
    const res = await fetch("/api/debug/fb-group-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: payload }),
    });
    const data = await res.json();

    const metaMap = new Map(
      data.results.map((r: { id: string; name: string | null; description: string | null }) => [r.id, r])
    );

    let count = 0;
    const updated = groups.map((g) => {
      const meta = metaMap.get(g.id) as { name: string | null; description: string | null } | undefined;
      if (!meta) return g;
      const newName = meta.name ?? g.name;
      const newSnippet = meta.description ?? g.snippet;
      if (newName !== g.name || newSnippet !== g.snippet) count++;
      return { ...g, name: newName, snippet: newSnippet };
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setGroups(updated);
    setEnrichedCount(count);
    setEnrichState("done");
  }

  const contractorCount = filtered.filter((g) => g.intent === "contractor").length;
  const homeownerCount = filtered.filter((g) => g.intent === "homeowner").length;

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
          <h1 className="text-2xl font-semibold text-gray-900">FB Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            {groups.length} unique groups stored · {allTrades.length} trade{allTrades.length !== 1 ? "s" : ""} · {allLocations.length} location{allLocations.length !== 1 ? "s" : ""}
          </p>
        </div>
        {groups.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={enrichMetadata}
              disabled={enrichState === "running"}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                enrichState === "done"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : enrichState === "running"
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {enrichState === "running" ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Enriching...
                </>
              ) : enrichState === "done" ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {enrichedCount} updated
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Enrich Metadata
                </>
              )}
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No groups saved yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Run a fetch from the debug page to populate this list.</p>
          <a
            href="/debug/fb-group-fetch"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to FB Group Fetch →
          </a>
        </div>
      )}

      {groups.length > 0 && (
        <>
          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {/* Trade dropdown */}
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

            {/* Location dropdown */}
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

            {/* Intent filter */}
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

            {/* Search */}
            <div className="relative ml-auto">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search groups..."
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trades</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Locations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{g.snippet}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        g.intent === "contractor"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {g.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(g.trades ?? []).map((t) => (
                          <span key={t} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(g.locations ?? []).map((l) => (
                          <span key={l} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(g.savedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                No groups match your filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
