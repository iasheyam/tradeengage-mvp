"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { type FBGroup } from "@/lib/extract-groups";
import { loadAllGroupPosts, type FBGroupPost } from "@/lib/fb-group-posts";
import { downloadExcel } from "@/lib/export-excel";
const BATCH_SIZE = 5;
const STALE_MS = 14 * 24 * 60 * 60 * 1000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

function isStale(ts: string | null) {
  return !ts || Date.now() - new Date(ts).getTime() > STALE_MS;
}

type BatchGroup = { id: string; url: string; name: string; lastEnrichedAt: string | null };
type BatchStatus = "waiting" | "running" | "done";
type BatchResult = { enriched: number; skipped: number };

type EnrichResult = {
  id: string;
  name: string | null;
  description: string | null;
  members: number | null;
  privacy: string | null;
  location: string | null;
  hasQuestions: boolean | null;
  lastEnrichedAt: string;
};

export default function FBGroupsAdminPage() {
  const [groups, setGroups] = useState<FBGroup[]>([]);
  const [allPosts, setAllPosts] = useState<Record<string, FBGroupPost[]>>({});
  const [expandedPostsId, setExpandedPostsId] = useState<string | null>(null);

  // Modal state
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBatches, setModalBatches] = useState<BatchGroup[][]>([]);
  const [modalBatchIdx, setModalBatchIdx] = useState(0);
  const [modalBatchStatus, setModalBatchStatus] = useState<BatchStatus>("waiting");
  const [modalBatchResults, setModalBatchResults] = useState<BatchResult[]>([]);
  const [modalWorkingGroups, setModalWorkingGroups] = useState<FBGroup[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTotalEnriched, setModalTotalEnriched] = useState(0);

  // Table filters
  const [tradeFilter, setTradeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState<"all" | "contractor" | "homeowner">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/fb-groups")
      .then((r) => r.json())
      .then((data: FBGroup[]) => setGroups(data));
    loadAllGroupPosts().then(setAllPosts);
  }, []);

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
    fetch("/api/admin/fb-groups", { method: "DELETE" });
    setGroups([]);
  }

  function exportToExcel() {
    const rows = filtered.map((g) => ({
      Name: g.name,
      URL: g.url,
      Intent: g.intent === "contractor" ? "Contractor" : "Homeowner",
      Members: g.members,
      Privacy: g.privacy ?? "",
      Location: g.location ?? "",
      Description: g.snippet,
      "Weekly Posts": g.weeklyPostFrequency,
      "Has Questions": g.hasQuestions === true ? "Yes" : g.hasQuestions === false ? "No" : "",
      Trades: g.trades.join(", "),
      Locations: g.locations.join(", "),
      "Last Enriched": g.lastEnrichedAt ? new Date(g.lastEnrichedAt).toLocaleString() : "",
      "Saved At": new Date(g.savedAt).toLocaleString(),
    }));
    downloadExcel(rows, `fb-groups-${new Date().toISOString().slice(0, 10)}`);
  }

  function openEnrichModal() {
    const stale = groups.filter((g) => isStale(g.lastEnrichedAt));
    if (!stale.length) return;

    const batches: BatchGroup[][] = [];
    for (let i = 0; i < stale.length; i += BATCH_SIZE) {
      batches.push(
        stale.slice(i, i + BATCH_SIZE).map((g) => ({
          id: g.id, url: g.url, name: g.name, lastEnrichedAt: g.lastEnrichedAt,
        }))
      );
    }

    setModalBatches(batches);
    setModalBatchIdx(0);
    setModalBatchStatus("waiting");
    setModalBatchResults([]);
    setModalWorkingGroups([...groups]);
    setModalError(null);
    setModalTotalEnriched(0);
    setModalOpen(true);
  }

  async function runCurrentBatch() {
    const batch = modalBatches[modalBatchIdx];
    setModalBatchStatus("running");
    setModalError(null);

    try {
      const res = await fetch("/api/admin/fb-group-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: batch.map((g) => ({ id: g.id, url: g.url, lastEnrichedAt: g.lastEnrichedAt })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { results: EnrichResult[]; skipped: number };
      const resultMap = new Map(data.results.map((r) => [r.id, r]));

      const updated = modalWorkingGroups.map((g) => {
        const r = resultMap.get(g.id);
        if (!r) return g;
        return {
          ...g,
          name: r.name ?? g.name,
          snippet: r.description ?? g.snippet,
          members: r.members ?? g.members,
          privacy: r.privacy ?? g.privacy,
          location: r.location ?? g.location,
          hasQuestions: r.hasQuestions ?? g.hasQuestions,
          lastEnrichedAt: r.lastEnrichedAt,
        };
      });

      fetch("/api/admin/fb-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setModalWorkingGroups(updated);
      setGroups([...updated]);

      const newTotal = modalTotalEnriched + data.results.length;
      setModalTotalEnriched(newTotal);
      setModalBatchResults((prev) => [...prev, { enriched: data.results.length, skipped: data.skipped }]);
      setModalBatchStatus("done");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Unknown error");
      setModalBatchStatus("waiting");
    }
  }

  function advanceToNextBatch() {
    setModalBatchIdx((i) => i + 1);
    setModalBatchStatus("waiting");
  }

  function closeModal() {
    setModalOpen(false);
  }

  const staleCount = groups.filter((g) => isStale(g.lastEnrichedAt)).length;
  const contractorCount = filtered.filter((g) => g.intent === "contractor").length;
  const homeownerCount = filtered.filter((g) => g.intent === "homeowner").length;
  const isDoneAll = modalBatchIdx === modalBatches.length - 1 && modalBatchStatus === "done";

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
              onClick={openEnrichModal}
              disabled={staleCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                staleCount === 0
                  ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {staleCount === 0 ? "All up to date" : `Enrich Metadata (${staleCount})`}
            </button>
            <button
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export{filtered.length !== groups.length ? ` (${filtered.length})` : ""}
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
      {groups.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No groups saved yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Run a fetch from the debug page to populate this list.</p>
          <a href="/debug/fb-group-fetch" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Go to FB Group Fetch →
          </a>
        </div>
      )}

      {groups.length > 0 && (
        <>
          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Trade</label>
              <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Trades</option>
                {allTrades.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Location</label>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <button key={key} onClick={() => setIntentFilter(key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${intentFilter === key ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-52" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trades</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Locations</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((g) => (
                  <React.Fragment key={g.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{g.snippet}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${g.intent === "contractor" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {g.intent}
                        </span>
                        {g.lastEnrichedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {formatDate(g.lastEnrichedAt)}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            Not enriched
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 tabular-nums whitespace-nowrap">
                      {g.members > 0 ? formatMembers(g.members) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(g.trades ?? []).map((t) => (
                          <span key={t} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(g.locations ?? []).map((l) => (
                          <span key={l} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{l}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {allPosts[g.id]?.length > 0 && (
                          <button
                            onClick={() => setExpandedPostsId(expandedPostsId === g.id ? null : g.id)}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-colors ${expandedPostsId === g.id ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {allPosts[g.id].length}
                          </button>
                        )}
                        <Link href={`/admin/fb-groups/${encodeURIComponent(g.id)}/edit`} className="inline-flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                  {expandedPostsId === g.id && allPosts[g.id] && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Posts</p>
                        <div className="space-y-2">
                          {allPosts[g.id].map((post) => (
                            <div key={post.id} className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                              <p className="text-xs text-gray-700 flex-1 line-clamp-2 leading-relaxed">{post.text || <span className="text-gray-400 italic">No text</span>}</p>
                              <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400">
                                <span>{post.authorName}</span>
                                {post.time && <span>· {new Date(post.time).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Open →</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">No groups match your filters.</div>
            )}
          </div>
        </>
      )}

      {/* Confirm Clear Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmClearOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Clear all groups?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete all {groups.length} saved FB groups from storage. This cannot be undone.
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

      {/* Enrich Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={modalBatchStatus !== "running" ? closeModal : undefined} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Enrich Metadata</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalBatches.length} batch{modalBatches.length !== 1 ? "es" : ""} · {modalBatches.flat().length} groups to enrich
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={modalBatchStatus === "running"}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Batch progress pills */}
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              {modalBatches.map((_, i) => {
                const isCompleted = i < modalBatchIdx || (i === modalBatchIdx && modalBatchStatus === "done");
                const isCurrent = i === modalBatchIdx;
                return (
                  <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isCompleted
                      ? "bg-green-50 text-green-700 border-green-200"
                      : isCurrent
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  }`}>
                    {isCompleted && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {isCurrent && !isCompleted && modalBatchStatus === "running" && (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    Batch {i + 1}
                    {isCompleted && modalBatchResults[i] && (
                      <span className="opacity-70">· {modalBatchResults[i].enriched} enriched</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current batch groups */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Batch {modalBatchIdx + 1} of {modalBatches.length}
              </p>
              <div className="space-y-1.5">
                {modalBatches[modalBatchIdx]?.map((g) => (
                  <div key={g.id} className="flex items-center gap-2.5 py-1.5 px-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{g.name || g.id}</p>
                      <p className="text-xs text-gray-400 truncate">{g.url}</p>
                    </div>
                    {g.lastEnrichedAt && !isStale(g.lastEnrichedAt) && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                        Fresh
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {modalError && (
              <div className="mx-6 mb-3 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {modalError}
              </div>
            )}

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {modalTotalEnriched > 0 && `${modalTotalEnriched} enriched so far`}
              </p>
              <div className="flex items-center gap-2">
                {isDoneAll ? (
                  <button onClick={closeModal} className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Done
                  </button>
                ) : modalBatchStatus === "done" ? (
                  <button onClick={advanceToNextBatch} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Run Batch {modalBatchIdx + 2}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={runCurrentBatch}
                    disabled={modalBatchStatus === "running"}
                    className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      modalBatchStatus === "running"
                        ? "bg-blue-400 text-white cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {modalBatchStatus === "running" ? (
                      <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Running…</>
                    ) : (
                      <>Run Batch {modalBatchIdx + 1}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
