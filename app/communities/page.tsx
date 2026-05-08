"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { loadProfile, loadCommunities, type Community } from "@/lib/communities-loader";
import { loadStatuses, saveStatus, type CommunityStatusValue } from "@/lib/community-status";

type PlatformFilter = "all" | "facebook" | "reddit";
type SortKey = "relevance" | "members";

function formatMembers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toString();
}

function PlatformIcon({ platform }: { platform: "facebook" | "reddit" }) {
  if (platform === "facebook") {
    return (
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
        <path d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6C15.1 9.8 13.6 9.3 12 9.2l.8-3.6 2.5.5a1.5 1.5 0 1 0 .2-.9l-2.8-.6a.4.4 0 0 0-.5.3l-.9 4c-1.6.1-3 .6-4.1 1.4A2 2 0 1 0 5.5 13a3.6 3.6 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12zM9 13.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm5.6 2.7a3.5 3.5 0 0 1-2.6.8 3.5 3.5 0 0 1-2.6-.8.3.3 0 0 1 .4-.4 3 3 0 0 0 2.2.7 3 3 0 0 0 2.2-.7.3.3 0 0 1 .4.4zm-.1-1.7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
    </div>
  );
}

function RelevanceBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? "bg-green-100 text-green-700" :
    score >= 4 ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}/10
    </span>
  );
}

type JoinStatus = "joined" | "pending";

function CommunityTable({
  communities,
  joinStatuses,
  onConfirmJoin,
  onDismiss,
}: {
  communities: Community[];
  joinStatuses: Map<string, JoinStatus>;
  onConfirmJoin: (id: string, platform: "facebook" | "reddit", status: JoinStatus) => void;
  onDismiss: (id: string, platform: "facebook" | "reddit") => void;
}) {
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);

  function handleJoin(id: string) {
    setPendingJoinId(id);
  }

  function confirmJoin(id: string, platform: "facebook" | "reddit", status: JoinStatus) {
    onConfirmJoin(id, platform, status);
    setPendingJoinId(null);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevance</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {communities.map((c) => {
            const status = joinStatuses.get(c.id);
            const isPending = pendingJoinId === c.id;
            return (
              <React.Fragment key={c.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={c.platform} />
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 font-medium tabular-nums">
                    {c.members > 0 ? formatMembers(c.members) : "—"}
                  </td>
                  <td className="px-4 py-3.5"><RelevanceBadge score={c.relevance} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      {status === "joined" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Joined
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          Request Pending
                        </span>
                      )}
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleJoin(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          isPending
                            ? "text-blue-400 bg-blue-50 border border-blue-200 cursor-default pointer-events-none"
                            : "text-white bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        Join
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
                        </svg>
                      </a>
                      {!isPending && (
                        <button
                          onClick={() => onDismiss(c.id, c.platform)}
                          title="Not interested"
                          className="inline-flex items-center justify-center w-7 h-7 text-gray-400 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-600 transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
                            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isPending && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 bg-blue-50 border-t border-blue-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-blue-700">
                          {c.platform === "reddit" ? "Have you successfully joined the subreddit?" : "Have you successfully joined the group?"}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => confirmJoin(c.id, c.platform, "joined")}
                            className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => confirmJoin(c.id, c.platform, "pending")}
                            className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            Request Pending
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [profile, setProfile] = useState<{ trade: string; location: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [joinStatuses, setJoinStatuses] = useState<Map<string, JoinStatus>>(new Map());
  const [dismissToast, setDismissToast] = useState(false);
  const dismissToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      setProfile(p);
      if (p) setCommunities(await loadCommunities(p));

      const statuses = await loadStatuses();
      const joinMap = new Map<string, JoinStatus>();
      const dismissedSet = new Set<string>();
      for (const s of statuses) {
        if (s.status === "not_interested") dismissedSet.add(s.communityId);
        else joinMap.set(s.communityId, s.status as JoinStatus);
      }
      setJoinStatuses(joinMap);
      setDismissed(dismissedSet);
      setLoaded(true);
    })();
  }, []);

  function dismiss(id: string, platform: "facebook" | "reddit") {
    void saveStatus(id, platform, "not_interested");
    setDismissed((prev) => new Set([...prev, id]));
    setJoinStatuses((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setDismissToast(true);
    if (dismissToastTimer.current) clearTimeout(dismissToastTimer.current);
    dismissToastTimer.current = setTimeout(() => setDismissToast(false), 4000);
  }

  function handleConfirmJoin(id: string, platform: "facebook" | "reddit", status: JoinStatus) {
    void saveStatus(id, platform, status as CommunityStatusValue);
    setJoinStatuses((prev) => new Map([...prev, [id, status]]));
  }

  const filtered = useMemo(() => {
    let result = communities.filter((c) => {
      if (dismissed.has(c.id)) return false;
      if (joinStatuses.has(c.id)) return false;
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortBy === "members") {
      result = [...result].sort((a, b) => b.members - a.members);
    }
    return result;
  }, [communities, dismissed, joinStatuses, search, platformFilter, sortBy]);

  const allContractors = filtered.filter((c) => c.type === "contractor");
  const allHomeowners = filtered.filter((c) => c.type === "homeowner");
  const contractors = allContractors.slice(0, 10);
  const homeowners = allHomeowners.slice(0, 10);
  const fbCount = communities.filter((c) => c.platform === "facebook").length;
  const redditCount = communities.filter((c) => c.platform === "reddit").length;

  // No profile set yet
  if (loaded && !profile) {
    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Communities</h1>
        <p className="text-sm text-gray-500 mb-10">Set up your profile first so we know which trade and market to show communities for.</p>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Profile not configured</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Choose your trade and market in Settings to get started.</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Settings →
          </Link>
        </div>
      </div>
    );
  }

  // Profile set but no communities discovered yet
  if (loaded && profile && communities.length === 0) {
    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Communities</h1>
        <p className="text-sm text-gray-500 mb-10">
          {profile.trade} · {profile.location} · No communities discovered yet
        </p>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No communities discovered yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Run the fetchers for {profile.trade} in {profile.location} to populate this page.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/debug/fb-group-fetch"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fetch FB Groups →
            </Link>
            <Link
              href="/debug/reddit-fetch"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Fetch Subreddits →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Not-interested toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          dismissToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
          </svg>
          <span>We won't show you similar communities.</span>
          <Link href="/communities/not-interested" className="text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap transition-colors">
            Restore →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Communities</h1>
          <p className="mt-1 text-sm text-gray-500">
            {communities.length} discovered · {profile?.trade} · {profile?.location}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fbCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              {fbCount} Facebook
            </span>
          )}
          {redditCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              {redditCount} Reddit
            </span>
          )}
        </div>
      </div>

      {/* Personalization callout */}
      <div className="mb-6 flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <p className="text-sm text-blue-700">
          Showing the <span className="font-semibold">top 10 best-fit communities</span> for {profile?.trade} in {profile?.location?.split(",")[0]}, ranked by relevance score.
          <span className="text-blue-500 ml-1">{communities.length > 20 ? `${communities.length - 20} more available` : ""}</span>
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-0.5">
          {(["all", "facebook", "reddit"] as PlatformFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                platformFilter === p
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Relevance</option>
            <option value="members">Members</option>
          </select>
        </div>
      </div>

      {/* Find Partners */}
      {contractors.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Find Partners</h2>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
              {allContractors.length > 10
                ? `Top 10 of ${allContractors.length} contractor communities`
                : `${contractors.length} contractor ${contractors.length === 1 ? "community" : "communities"}`}
            </span>
          </div>
          <CommunityTable communities={contractors} joinStatuses={joinStatuses} onConfirmJoin={handleConfirmJoin} onDismiss={dismiss} />
        </section>
      )}

      {/* Reach Homeowners */}
      {homeowners.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Reach Homeowners</h2>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
              {allHomeowners.length > 10
                ? `Top 10 of ${allHomeowners.length} homeowner communities`
                : `${homeowners.length} homeowner ${homeowners.length === 1 ? "community" : "communities"}`}
            </span>
          </div>
          <CommunityTable communities={homeowners} joinStatuses={joinStatuses} onConfirmJoin={handleConfirmJoin} onDismiss={dismiss} />
        </section>
      )}

      {/* No filter results */}
      {filtered.length === 0 && communities.length > 0 && (
        <div className="text-center py-16">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-gray-300">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No communities match your filters.</p>
          <button onClick={() => { setSearch(""); setPlatformFilter("all"); }} className="mt-2 text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        </div>
      )}

    </div>
  );
}
