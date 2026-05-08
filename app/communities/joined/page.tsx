"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadStatuses, saveStatus } from "@/lib/community-status";
import type { FBGroup } from "@/lib/extract-groups";
import type { Subreddit } from "@/lib/extract-subreddits";

type JoinStatus = "joined" | "pending";

interface JoinedCommunity {
  id: string;
  name: string;
  platform: "facebook" | "reddit";
  description: string;
  url: string;
  status: JoinStatus;
  updatedAt: string;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function JoinedCommunitiesPage() {
  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [statuses, fbGroups, subreddits] = await Promise.all([
        loadStatuses(),
        fetch("/api/admin/fb-groups").then((r) => r.json()) as Promise<FBGroup[]>,
        fetch("/api/admin/subreddits").then((r) => r.json()) as Promise<Subreddit[]>,
      ]);

      const filtered = statuses.filter(
        (s) => s.status === "joined" || s.status === "pending"
      );

      const fbMap = new Map<string, FBGroup>(fbGroups.map((g) => [`fb-${g.id}`, g]));
      const redditMap = new Map<string, Subreddit>(subreddits.map((s) => [`reddit-${s.name}`, s]));

      const resolved: JoinedCommunity[] = filtered.map((s) => {
        const fb = fbMap.get(s.communityId);
        if (fb) {
          return {
            id: s.communityId,
            name: fb.name,
            platform: "facebook",
            description: fb.snippet,
            url: fb.url,
            status: s.status as JoinStatus,
            updatedAt: s.updatedAt,
          };
        }
        const reddit = redditMap.get(s.communityId);
        if (reddit) {
          return {
            id: s.communityId,
            name: `r/${reddit.name}`,
            platform: "reddit",
            description: reddit.description,
            url: reddit.url,
            status: s.status as JoinStatus,
            updatedAt: s.updatedAt,
          };
        }
        return {
          id: s.communityId,
          name: s.communityId,
          platform: s.platform,
          description: "",
          url: "#",
          status: s.status as JoinStatus,
          updatedAt: s.updatedAt,
        };
      });

      setCommunities(resolved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setLoaded(true);
    })();
  }, []);

  function updateStatus(id: string, platform: "facebook" | "reddit", status: JoinStatus) {
    void saveStatus(id, platform, status);
    setCommunities((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c))
    );
  }

  const joinedCount = communities.filter((c) => c.status === "joined").length;
  const pendingCount = communities.filter((c) => c.status === "pending").length;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/communities" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Communities
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 font-medium">Joined</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Joined</h1>
        <p className="mt-1 text-sm text-gray-500">
          {joinedCount} joined · {pendingCount} request pending
        </p>
      </div>

      {/* Empty state */}
      {loaded && communities.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No joined communities yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Communities you join will appear here.</p>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Communities →
          </Link>
        </div>
      )}

      {/* Table */}
      {communities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {communities.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3.5">
                    {c.status === "joined" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Joined
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        Request Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(c.updatedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {c.status === "pending" && (
                      <button
                        onClick={() => updateStatus(c.id, c.platform, "joined")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                      >
                        Mark Joined
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
