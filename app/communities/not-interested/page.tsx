"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadStatuses, removeStatus } from "@/lib/community-status";
import type { FBGroup } from "@/lib/extract-groups";
import type { Subreddit } from "@/lib/extract-subreddits";

interface DismissedCommunity {
  id: string;
  name: string;
  platform: "facebook" | "reddit";
  description: string;
  url: string;
  dismissedAt: string;
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

export default function NotInterestedPage() {
  const [communities, setCommunities] = useState<DismissedCommunity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [statuses, fbGroups, subreddits] = await Promise.all([
        loadStatuses(),
        fetch("/api/admin/fb-groups").then((r) => r.json()) as Promise<FBGroup[]>,
        fetch("/api/admin/subreddits").then((r) => r.json()) as Promise<Subreddit[]>,
      ]);

      const filtered = statuses.filter((s) => s.status === "not_interested");

      const fbMap = new Map<string, FBGroup>(fbGroups.map((g) => [`fb-${g.id}`, g]));
      const redditMap = new Map<string, Subreddit>(subreddits.map((s) => [`reddit-${s.name}`, s]));

      const resolved: DismissedCommunity[] = filtered.map((s) => {
        const fb = fbMap.get(s.communityId);
        if (fb) {
          return {
            id: s.communityId,
            name: fb.name,
            platform: "facebook",
            description: fb.snippet,
            url: fb.url,
            dismissedAt: s.updatedAt,
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
            dismissedAt: s.updatedAt,
          };
        }
        return {
          id: s.communityId,
          name: s.communityId,
          platform: s.platform,
          description: "",
          url: "#",
          dismissedAt: s.updatedAt,
        };
      });

      setCommunities(resolved.sort((a, b) => b.dismissedAt.localeCompare(a.dismissedAt)));
      setLoaded(true);
    })();
  }, []);

  function restore(id: string) {
    void removeStatus(id);
    setCommunities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/communities" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Communities
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 font-medium">Not Interested</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Not Interested</h1>
        <p className="mt-1 text-sm text-gray-500">
          {communities.length} {communities.length === 1 ? "community" : "communities"} dismissed · Restore any to bring it back to your list.
        </p>
      </div>

      {/* Empty state */}
      {loaded && communities.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No dismissed communities</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Communities you mark as not interested will appear here.</p>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Communities →
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dismissed</th>
                <th className="w-24 px-4 py-3" />
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
                  <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(c.dismissedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => restore(c.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Restore
                    </button>
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
