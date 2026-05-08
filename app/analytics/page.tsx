"use client";

import { useState, useEffect } from "react";
import { loadStatuses, type CommunityStatus, type PostedHistoryItem } from "@/lib/community-status";
import type { FBGroup } from "@/lib/extract-groups";
import type { Subreddit } from "@/lib/extract-subreddits";

// ─── Derived types ────────────────────────────────────────────────────────────

interface EnrichedHistoryItem extends PostedHistoryItem {
  communityId: string;
  communityName: string;
  platform: "facebook" | "reddit";
}

interface ChannelStat {
  id: string;
  name: string;
  platform: "facebook" | "reddit";
  members: number;
  postsPublished: number;
  draftsGenerated: number;
}

interface DayActivity {
  date: string;
  fb: number;
  reddit: number;
}

interface AnalyticsData {
  fbJoined: number;
  fbPending: number;
  redditJoined: number;
  redditPending: number;
  draftsGenerated: number;
  published: number;
  pendingCount: number;
  notPosted: number;
  publishRate: number;
  activity: DayActivity[];
  topChannels: ChannelStat[];
  recentPosts: EnrichedHistoryItem[];
}

// ─── Data computation ─────────────────────────────────────────────────────────

async function computeAnalytics(): Promise<AnalyticsData> {
  const [statuses, fbGroupsRaw, subredditsRaw]: [CommunityStatus[], FBGroup[], Subreddit[]] = await Promise.all([
    loadStatuses(),
    fetch("/api/admin/fb-groups").then((r) => r.json()),
    fetch("/api/admin/subreddits").then((r) => r.json()),
  ]);

  const fbMap = new Map(fbGroupsRaw.map((g) => [`fb-${g.id}`, g]));
  const redditMap = new Map(subredditsRaw.map((s) => [`reddit-${s.name}`, s]));

  const active = statuses.filter((s) => s.status === "joined" || s.status === "pending");

  const fbJoined = active.filter((s) => s.platform === "facebook" && s.status === "joined").length;
  const fbPending = active.filter((s) => s.platform === "facebook" && s.status === "pending").length;
  const redditJoined = active.filter((s) => s.platform === "reddit" && s.status === "joined").length;
  const redditPending = active.filter((s) => s.platform === "reddit" && s.status === "pending").length;

  const draftsGenerated = active.filter((s) => !!s.drafts).length * 3;

  // Flatten all history items across all communities
  const allHistory: EnrichedHistoryItem[] = active.flatMap((s) => {
    const group = s.platform === "facebook" ? fbMap.get(s.communityId) : null;
    const sub = s.platform === "reddit" ? redditMap.get(s.communityId) : null;
    const communityName =
      s.platform === "facebook"
        ? (group?.name ?? s.communityId)
        : `r/${sub?.name ?? s.communityId.replace("reddit-", "")}`;

    return (s.history ?? []).map((h) => ({
      ...h,
      communityId: s.communityId,
      communityName,
      platform: s.platform,
    }));
  });

  const published = allHistory.filter((h) => h.status === "posted").length;
  const pendingCount = allHistory.filter((h) => h.status === "pending_approval").length;
  const notPosted = Math.max(0, draftsGenerated - allHistory.length);
  const publishRate = draftsGenerated > 0 ? Math.round((published / draftsGenerated) * 100) : 0;

  // Last 7 days activity
  const activity: DayActivity[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      fb: allHistory.filter((h) => h.platform === "facebook" && h.postedAt.slice(0, 10) === dateStr).length,
      reddit: allHistory.filter((h) => h.platform === "reddit" && h.postedAt.slice(0, 10) === dateStr).length,
    };
  });

  // Top channels by posts published
  const topChannels: ChannelStat[] = active
    .map((s) => {
      const group = s.platform === "facebook" ? fbMap.get(s.communityId) : null;
      const sub = s.platform === "reddit" ? redditMap.get(s.communityId) : null;
      const name =
        s.platform === "facebook"
          ? (group?.name ?? s.communityId)
          : `r/${sub?.name ?? s.communityId.replace("reddit-", "")}`;
      const members =
        s.platform === "facebook" ? (group?.members ?? 0) : (sub?.subscribers ?? 0);
      return {
        id: s.communityId,
        name,
        platform: s.platform,
        members,
        postsPublished: (s.history ?? []).filter((h) => h.status === "posted").length,
        draftsGenerated: s.drafts ? 3 : 0,
      };
    })
    .sort((a, b) => b.postsPublished - a.postsPublished || b.draftsGenerated - a.draftsGenerated)
    .slice(0, 5);

  // Recent posts sorted newest first
  const recentPosts = [...allHistory].sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );

  return {
    fbJoined,
    fbPending,
    redditJoined,
    redditPending,
    draftsGenerated,
    published,
    pendingCount,
    notPosted,
    publishRate,
    activity,
    topChannels,
    recentPosts,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const POST_TYPE_META = {
  introduction: { label: "Introduction", color: "bg-indigo-100 text-indigo-700" },
  value:        { label: "Value Post",   color: "bg-emerald-100 text-emerald-700" },
  engagement:   { label: "Engagement",  color: "bg-amber-100 text-amber-700" },
} as const;

function PlatformBadge({ platform }: { platform: "facebook" | "reddit" }) {
  if (platform === "facebook") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
        FB
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6C15.1 9.8 13.6 9.3 12 9.2l.8-3.6 2.5.5a1.5 1.5 0 1 0 .2-.9l-2.8-.6a.4.4 0 0 0-.5.3l-.9 4c-1.6.1-3 .6-4.1 1.4A2 2 0 1 0 5.5 13a3.6 3.6 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12z" />
      </svg>
      Reddit
    </span>
  );
}

function formatMembers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n > 0 ? String(n) : "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PostFilter = "all" | "posted" | "pending_approval";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [postFilter, setPostFilter] = useState<PostFilter>("all");

  useEffect(() => {
    computeAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading analytics…
      </div>
    );
  }

  const {
    fbJoined, fbPending, redditJoined, redditPending,
    draftsGenerated, published, pendingCount, notPosted,
    publishRate, activity, topChannels, recentPosts,
  } = data;

  const totalJoined = fbJoined + fbPending + redditJoined + redditPending;
  const filteredPosts = recentPosts.filter(
    (p) => postFilter === "all" || p.status === postFilter
  );
  const maxActivity = Math.max(...activity.map((d) => d.fb + d.reddit), 1);
  const maxPublished = Math.max(...topChannels.map((c) => c.postsPublished), 1);

  // Donut ring: strokeDasharray for publishRate circle (circumference ≈ 100 for r=15.9)
  const ringDash = publishRate;

  const overviewStats = [
    {
      label: "FB Groups Joined",
      value: String(fbJoined + fbPending),
      sub: fbPending > 0 ? `${fbPending} pending approval` : "All active",
      positive: true,
      icon: (
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </div>
      ),
    },
    {
      label: "Subreddits Joined",
      value: String(redditJoined + redditPending),
      sub: redditPending > 0 ? `${redditPending} pending approval` : "All active",
      positive: true,
      icon: (
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
            <path d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6C15.1 9.8 13.6 9.3 12 9.2l.8-3.6 2.5.5a1.5 1.5 0 1 0 .2-.9l-2.8-.6a.4.4 0 0 0-.5.3l-.9 4c-1.6.1-3 .6-4.1 1.4A2 2 0 1 0 5.5 13a3.6 3.6 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12z" />
          </svg>
        </div>
      ),
    },
    {
      label: "Drafts Generated",
      value: String(draftsGenerated),
      sub: totalJoined > 0 ? `${totalJoined} communities tracked` : "No communities yet",
      positive: draftsGenerated > 0,
      icon: (
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
      ),
    },
    {
      label: "Posts Published",
      value: String(published),
      sub: draftsGenerated > 0 ? `${publishRate}% publish rate` : "No drafts yet",
      positive: published > 0,
      icon: (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your community presence and posting activity.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4">{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            <p className={`text-xs font-medium mt-2 ${stat.positive ? "text-emerald-600" : "text-gray-400"}`}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Activity + Publish Rate row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Activity bar chart */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Posting Activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Posts published per day, last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                Facebook
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />
                Reddit
              </span>
            </div>
          </div>

          {published + pendingCount === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No posts published yet.
            </div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {activity.map((day) => {
                const total = day.fb + day.reddit;
                const fbH = total === 0 ? 0 : Math.round((day.fb / maxActivity) * 100);
                const rdH = total === 0 ? 0 : Math.round((day.reddit / maxActivity) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
                      {day.reddit > 0 && (
                        <div
                          className="w-full rounded-t bg-orange-400 transition-all"
                          style={{ height: `${rdH}%` }}
                          title={`Reddit: ${day.reddit}`}
                        />
                      )}
                      {day.fb > 0 && (
                        <div
                          className={`w-full bg-blue-500 transition-all ${day.reddit === 0 ? "rounded-t" : ""} rounded-b`}
                          style={{ height: `${fbH}%` }}
                          title={`Facebook: ${day.fb}`}
                        />
                      )}
                      {total === 0 && (
                        <div className="w-full rounded bg-gray-100" style={{ height: "6px" }} />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{day.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Publish rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Publish Rate</h2>
          <p className="text-xs text-gray-400 mb-5">Drafts → posted</p>

          {draftsGenerated === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              No drafts yet.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray={`${ringDash} ${100 - ringDash}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{publishRate}%</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Published
                  </span>
                  <span className="font-semibold text-gray-800">{published}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Pending
                  </span>
                  <span className="font-semibold text-gray-800">{pendingCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
                    Not posted
                  </span>
                  <span className="font-semibold text-gray-800">{notPosted}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top channels */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Top Channels</h2>
          <p className="text-xs text-gray-400 mt-0.5">Communities ranked by posts published</p>
        </div>

        {topChannels.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Join communities to see channel performance here.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {topChannels.map((ch, i) => {
              const pct = (ch.postsPublished / maxPublished) * 100;
              return (
                <div key={ch.id} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-300 w-4 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 w-52 shrink-0">
                    <PlatformBadge platform={ch.platform} />
                    <span className="text-sm font-medium text-gray-800 truncate">{ch.name}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums w-4 text-right">
                      {ch.postsPublished}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 w-28 text-right shrink-0">
                    {formatMembers(ch.members)} members
                  </div>
                  <div className="w-20 text-right shrink-0">
                    {ch.draftsGenerated > 0 && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        ch.draftsGenerated > ch.postsPublished
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {ch.draftsGenerated} drafted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent posts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Recent Posts</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drafts you've marked as posted or pending</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
            {(["all", "posted", "pending_approval"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPostFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  postFilter === f
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "All" : f === "posted" ? "Posted" : "Pending"}
              </button>
            ))}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">
              {recentPosts.length === 0
                ? "Mark drafts as posted or pending and they'll appear here."
                : "No posts match this filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredPosts.map((post) => {
              const meta = POST_TYPE_META[post.type];
              return (
                <div key={`${post.communityId}-${post.id}`} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full text-center ${
                      post.status === "posted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {post.status === "posted" ? "Posted" : "Pending"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PlatformBadge platform={post.platform} />
                      <span className="text-xs font-medium text-gray-600">{post.communityName}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.postedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
