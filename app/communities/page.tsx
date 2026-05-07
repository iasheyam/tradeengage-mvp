"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Platform = "facebook" | "reddit";
type CommunityType = "contractor" | "homeowner";
type SortKey = "relevance" | "members" | "postsPerWeek";
type PlatformFilter = "all" | "facebook" | "reddit";

interface Community {
  id: string;
  name: string;
  platform: Platform;
  type: CommunityType;
  members: number;
  postsPerWeek: number;
  relevance: number;
  url: string;
  postingRules: string;
}

const COMMUNITIES: Community[] = [
  { id: "c1", name: "Atlanta HVAC Professionals", platform: "facebook", type: "contractor", members: 3200, postsPerWeek: 22, relevance: 9, url: "#", postingRules: "No spam. Introduce yourself first." },
  { id: "c2", name: "HVAC Techs of Atlanta", platform: "facebook", type: "contractor", members: 1800, postsPerWeek: 15, relevance: 9, url: "#", postingRules: "Trade talk only. No soliciting." },
  { id: "c3", name: "Georgia Contractors Network", platform: "facebook", type: "contractor", members: 8400, postsPerWeek: 45, relevance: 7, url: "#", postingRules: "All trades welcome. Keep it professional." },
  { id: "c4", name: "Atlanta Home Service Pros", platform: "facebook", type: "contractor", members: 2100, postsPerWeek: 18, relevance: 8, url: "#", postingRules: "Referral trading encouraged." },
  { id: "c5", name: "r/HVAC", platform: "reddit", type: "contractor", members: 89000, postsPerWeek: 120, relevance: 8, url: "#", postingRules: "No self-promo without context. Flair required." },
  { id: "c6", name: "r/hvacadvice", platform: "reddit", type: "contractor", members: 45000, postsPerWeek: 80, relevance: 7, url: "#", postingRules: "Advice only. Links flagged by mods." },
  { id: "c7", name: "r/sweaty_startup", platform: "reddit", type: "contractor", members: 52000, postsPerWeek: 95, relevance: 7, url: "#", postingRules: "Home service businesses welcome." },
  { id: "h1", name: "Atlanta Home Improvement", platform: "facebook", type: "homeowner", members: 6800, postsPerWeek: 42, relevance: 9, url: "#", postingRules: "No overt advertising. Value posts only." },
  { id: "h2", name: "Buckhead Neighbors", platform: "facebook", type: "homeowner", members: 12400, postsPerWeek: 65, relevance: 8, url: "#", postingRules: "Local residents only. No promotional posts." },
  { id: "h3", name: "Sandy Springs Community", platform: "facebook", type: "homeowner", members: 7100, postsPerWeek: 38, relevance: 8, url: "#", postingRules: "Community-first. Referrals allowed if genuine." },
  { id: "h4", name: "Midtown Atlanta Neighbors", platform: "facebook", type: "homeowner", members: 9200, postsPerWeek: 55, relevance: 7, url: "#", postingRules: "Neighbor recommendations welcome." },
  { id: "h5", name: "Decatur Homeowners", platform: "facebook", type: "homeowner", members: 4300, postsPerWeek: 28, relevance: 8, url: "#", postingRules: "No direct ads. Educational content only." },
  { id: "h6", name: "r/Atlanta", platform: "reddit", type: "homeowner", members: 180000, postsPerWeek: 240, relevance: 7, url: "#", postingRules: "Broad topics. Self-promo gets downvoted." },
  { id: "h7", name: "r/HomeImprovement", platform: "reddit", type: "homeowner", members: 1200000, postsPerWeek: 890, relevance: 6, url: "#", postingRules: "No affiliate links. Genuine advice only." },
  { id: "h8", name: "r/Atlanta_homeowners", platform: "reddit", type: "homeowner", members: 12000, postsPerWeek: 28, relevance: 8, url: "#", postingRules: "Local focus. Contractor recs allowed." },
];

function formatMembers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toString();
}

function PlatformIcon({ platform }: { platform: Platform }) {
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
    score >= 8 ? "bg-green-100 text-green-700" :
    score >= 6 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{score}/10</span>;
}

function ActivityBadge({ postsPerWeek }: { postsPerWeek: number }) {
  const [label, color] =
    postsPerWeek >= 50 ? ["High", "text-green-600"] :
    postsPerWeek >= 20 ? ["Medium", "text-yellow-600"] :
    ["Low", "text-gray-400"];
  return (
    <span className={`text-xs font-medium ${color}`}>
      {label} <span className="text-gray-400 font-normal">· {postsPerWeek}/wk</span>
    </span>
  );
}

function CommunityTable({
  communities, selected, onToggle, onToggleAll,
}: {
  communities: Community[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
}) {
  const ids = communities.map((c) => c.id);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const someChecked = ids.some((id) => selected.has(id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={(e) => onToggleAll(ids, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevance</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Posting Rules</th>
            <th className="w-16 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {communities.map((c) => (
            <tr key={c.id} className={`transition-colors ${selected.has(c.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <td className="px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => onToggle(c.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={c.platform} />
                  <span className="font-medium text-gray-900">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-gray-600 font-medium">{formatMembers(c.members)}</td>
              <td className="px-4 py-3.5"><ActivityBadge postsPerWeek={c.postsPerWeek} /></td>
              <td className="px-4 py-3.5"><RelevanceBadge score={c.relevance} /></td>
              <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[200px] truncate" title={c.postingRules}>{c.postingRules}</td>
              <td className="px-4 py-3.5">
                <a href={c.url} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">Join →</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CommunitiesPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");

  const filtered = useMemo(() => {
    let result = COMMUNITIES.filter((c) => {
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return [...result].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [search, platformFilter, sortBy]);

  const contractors = filtered.filter((c) => c.type === "contractor");
  const homeowners = filtered.filter((c) => c.type === "homeowner");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  return (
    <div className="p-8 pb-28">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Communities</h1>
          <p className="mt-1 text-sm text-gray-500">
            {COMMUNITIES.length} communities · HVAC · Atlanta, GA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            {COMMUNITIES.filter((c) => c.platform === "facebook").length} Facebook
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
            {COMMUNITIES.filter((c) => c.platform === "reddit").length} Reddit
          </span>
        </div>
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
            <option value="postsPerWeek">Activity</option>
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
              {contractors.length} contractor communities
            </span>
          </div>
          <CommunityTable communities={contractors} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
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
              {homeowners.length} homeowner communities
            </span>
          </div>
          <CommunityTable communities={homeowners} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
        </section>
      )}

      {/* No results */}
      {filtered.length === 0 && (
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

      {/* Sticky footer */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between shadow-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selected.size}</span>{" "}
            {selected.size === 1 ? "community" : "communities"} selected
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
              Clear selection
            </button>
            <Link
              href="/drafts"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Drafts
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
