"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  loadStatuses, saveDraftsForCommunity, getDraftsForCommunity,
  getHistoryForCommunity, upsertHistoryItem, clearHistoryForCommunity,
  type PostedHistoryItem, type PostStatus,
} from "@/lib/community-status";
import { loadProfile } from "@/lib/communities-loader";
import type { GenerateResponse } from "@/app/api/drafts/generate/route";
import type { ModifyResponse } from "@/app/api/drafts/modify/route";
import {
  getPostsForGroup, savePostsForGroup,
  getRunForGroup, saveRunForGroup, clearRunForGroup,
} from "@/lib/fb-group-posts";
import {
  getPostsForSubreddit, savePostsForSubreddit,
  getRunForSubreddit, saveRunForSubreddit, clearRunForSubreddit,
} from "@/lib/reddit-posts";

type Platform = "facebook" | "reddit";
type CommunityType = "contractor" | "homeowner";
type ComplianceStatus = "clean" | "review";
type PostType = "introduction" | "value" | "engagement";
type ActiveTab = "compose" | "history" | "inspirations";

interface InspirationPost {
  id: string;
  url: string;
  title?: string;
  text: string;
  time: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
}

interface Draft {
  type: PostType;
  label: string;
  content: string;
  compliance: ComplianceStatus;
  complianceNote?: string;
}

interface DraftCommunity {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  type: CommunityType;
  status: "joined" | "pending";
  url: string;
  drafts: Draft[];
  hasGeneratedDrafts: boolean;
}

type HistoryItem = PostedHistoryItem;

const POST_TYPE_META: Record<PostType, { label: string; color: string }> = {
  introduction: { label: "Introduction", color: "bg-indigo-100 text-indigo-700" },
  value:        { label: "Value Post",   color: "bg-emerald-100 text-emerald-700" },
  engagement:   { label: "Engagement",  color: "bg-amber-100 text-amber-700" },
};

const PLACEHOLDER_DRAFTS: Draft[] = [
  {
    type: "introduction",
    label: "Introduction",
    compliance: "clean",
    content: `Draft generation is coming soon. Once available, your introduction post will be personalized based on your company profile, this community's focus, and current best practices for engagement.`,
  },
  {
    type: "value",
    label: "Value Post",
    compliance: "clean",
    content: `Draft generation is coming soon. Your value post will be tailored to provide genuinely useful content for this community — no promotional language, just helpful insight relevant to the group's audience.`,
  },
  {
    type: "engagement",
    label: "Engagement",
    compliance: "review",
    complianceNote: "Review the draft before posting to ensure it aligns with this community's tone and rules.",
    content: `Draft generation is coming soon. Your engagement post will open a conversation relevant to this community — a question, poll, or discussion prompt that drives organic replies.`,
  },
];

import type { GeneratedDrafts } from "@/lib/community-status";

function applyStoredDrafts(stored: GeneratedDrafts): Draft[] {
  return PLACEHOLDER_DRAFTS.map((d) => ({
    ...d,
    content: stored[d.type as keyof Pick<GeneratedDrafts, "introduction" | "value" | "engagement">] ?? d.content,
  }));
}

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "facebook") {
    return (
      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center shrink-0">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
        <path d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6C15.1 9.8 13.6 9.3 12 9.2l.8-3.6 2.5.5a1.5 1.5 0 1 0 .2-.9l-2.8-.6a.4.4 0 0 0-.5.3l-.9 4c-1.6.1-3 .6-4.1 1.4A2 2 0 1 0 5.5 13a3.6 3.6 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12zM9 13.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm5.6 2.7a3.5 3.5 0 0 1-2.6.8 3.5 3.5 0 0 1-2.6-.8.3.3 0 0 1 .4-.4 3 3 0 0 0 2.2.7 3 3 0 0 0 2.2-.7.3.3 0 0 1 .4.4zm-.1-1.7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
    </div>
  );
}

function ComplianceBanner(_: { status: ComplianceStatus; note?: string }) {
  return null;
}

export default function DraftsPage() {
  const [communities, setCommunities] = useState<DraftCommunity[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<import("@/lib/communities-loader").UserProfile | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("compose");
  const [copiedType, setCopiedType] = useState<PostType | null>(null);
  const [_regeneratingType, _setRegeneratingType] = useState<PostType | null>(null);
  const [modifyTarget, setModifyTarget] = useState<{ type: PostType; content: string } | null>(null);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [modifying, setModifying] = useState(false);
  const [modifyError, setModifyError] = useState<string | null>(null);
  const modifyInputRef = useRef<HTMLTextAreaElement>(null);
  const [communityHistory, setCommunityHistory] = useState<HistoryItem[]>([]);
  const [historyCopiedId, setHistoryCopiedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "casual">("professional");
  const [includeReferral, setIncludeReferral] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [postsMap, setPostsMap] = useState<Record<string, InspirationPost[]>>({});
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const [statuses, fbGroupsRaw, subredditsRaw, profile] = await Promise.all([
        loadStatuses(),
        fetch("/api/admin/fb-groups").then((r) => r.json() as Promise<import("@/lib/extract-groups").FBGroup[]>),
        fetch("/api/admin/subreddits").then((r) => r.json() as Promise<import("@/lib/extract-subreddits").Subreddit[]>),
        loadProfile(),
      ]);

      const active = statuses.filter((s) => s.status === "joined" || s.status === "pending");
      const fbMap = new Map(fbGroupsRaw.map((g) => [`fb-${g.id}`, g]));
      const redditMap = new Map(subredditsRaw.map((s) => [`reddit-${s.name}`, s]));

      const resolved: DraftCommunity[] = active.flatMap((s) => {
        const fb = fbMap.get(s.communityId);
        if (fb) {
          return [{
            id: s.communityId,
            name: fb.name,
            description: fb.snippet ?? "",
            platform: "facebook" as Platform,
            type: fb.intent,
            status: s.status as "joined" | "pending",
            url: fb.url,
            drafts: s.drafts ? applyStoredDrafts(s.drafts) : PLACEHOLDER_DRAFTS,
            hasGeneratedDrafts: !!s.drafts,
          }];
        }
        const reddit = redditMap.get(s.communityId);
        if (reddit) {
          return [{
            id: s.communityId,
            name: `r/${reddit.name}`,
            description: reddit.description ?? "",
            platform: "reddit" as Platform,
            type: reddit.intent,
            status: s.status as "joined" | "pending",
            url: reddit.url,
            drafts: s.drafts ? applyStoredDrafts(s.drafts) : PLACEHOLDER_DRAFTS,
            hasGeneratedDrafts: !!s.drafts,
          }];
        }
        return [];
      });

      setUserProfile(profile);
      setCommunities(resolved);
      if (resolved.length > 0) {
        const firstId = resolved[0].id;
        setActiveCommunityId(firstId);
        setCommunityHistory(await getHistoryForCommunity(firstId));
      }
      setLoaded(true);
    })();
  }, []);

  const community = communities.find((c) => c.id === activeCommunityId) ?? null;
  const currentPosts: InspirationPost[] | null = community ? (postsMap[community.id] ?? null) : null;

  function handleTabChange(type: ActiveTab) {
    setActiveTab(type);
  }

  function handleCommunityChange(id: string) {
    setActiveCommunityId(id);
    setActiveTab("compose");
    setCopiedType(null);
    setPostsError(null);
    getHistoryForCommunity(id).then(setCommunityHistory);
  }

  useEffect(() => {
    if (!activeCommunityId || !loaded) return;

    const comm = communities.find((c) => c.id === activeCommunityId);
    if (!comm) return;

    setPostsError(null);
    setPostsLoading(false);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    const isCancelled = { value: false };
    const commId = comm.id;
    const isFacebook = comm.platform === "facebook";
    const rawId = isFacebook
      ? comm.id.replace(/^fb-/, "")
      : comm.id.replace(/^reddit-/, "");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savePosts = (posts: InspirationPost[]) =>
      isFacebook ? savePostsForGroup(rawId, posts as any) : savePostsForSubreddit(rawId, posts as any);

    const pollUrl = (runId: string) =>
      isFacebook ? `/api/admin/fb-group-posts?runId=${runId}` : `/api/admin/reddit-posts?runId=${runId}`;

    const startUrl = isFacebook ? "/api/admin/fb-group-posts" : "/api/admin/reddit-posts";
    const startBody = isFacebook
      ? JSON.stringify({ groupUrl: comm.url })
      : JSON.stringify({ subredditUrl: comm.url });

    function schedulePoll(runId: string, delayMs: number) {
      pollTimerRef.current = setTimeout(async () => {
        if (isCancelled.value) return;
        try {
          const res = await fetch(pollUrl(runId));
          const data = await res.json() as { status: string; posts?: InspirationPost[]; error?: string };
          if (isCancelled.value) return;

          if (data.status === "running") {
            schedulePoll(runId, 5_000);
          } else if (data.status === "succeeded" && data.posts) {
            void savePosts(data.posts);
            void (isFacebook ? clearRunForGroup(rawId) : clearRunForSubreddit(rawId));
            setPostsMap((prev) => ({ ...prev, [commId]: data.posts! }));
            setPostsLoading(false);
          } else {
            void (isFacebook ? clearRunForGroup(rawId) : clearRunForSubreddit(rawId));
            setPostsError(data.error ?? "Run failed");
            setPostsLoading(false);
          }
        } catch (e) {
          if (!isCancelled.value) {
            setPostsError(e instanceof Error ? e.message : String(e));
            setPostsLoading(false);
          }
        }
      }, delayMs);
    }

    (async () => {
      // Already have posts — serve from cache
      const existingPosts = await (isFacebook ? getPostsForGroup(rawId) : getPostsForSubreddit(rawId));
      if (isCancelled.value) return;
      if (existingPosts) {
        setPostsMap((prev) => ({ ...prev, [commId]: existingPosts as unknown as InspirationPost[] }));
        return;
      }

      setPostsLoading(true);

      // Resume polling if a run is already in-flight
      const pendingRun = await (isFacebook ? getRunForGroup(rawId) : getRunForSubreddit(rawId));
      if (isCancelled.value) return;
      if (pendingRun) {
        schedulePoll(pendingRun.runId, 5_000);
        return;
      }

      // Start a fresh run
      try {
        const res = await fetch(startUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: startBody,
        });
        const data = await res.json() as { runId?: string; datasetId?: string; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (isCancelled.value) return;
        void (isFacebook
          ? saveRunForGroup(rawId, { runId: data.runId!, datasetId: data.datasetId!, startedAt: new Date().toISOString() })
          : saveRunForSubreddit(rawId, { runId: data.runId!, datasetId: data.datasetId!, startedAt: new Date().toISOString() }));
        schedulePoll(data.runId!, 10_000);
      } catch (e) {
        if (!isCancelled.value) {
          setPostsError(e instanceof Error ? e.message : String(e));
          setPostsLoading(false);
        }
      }
    })();

    return () => { isCancelled.value = true; if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCommunityId, loaded]);

  async function handleCopy(d: Draft) {
    await navigator.clipboard.writeText(d.content);
    setCopiedType(d.type);
    setTimeout(() => setCopiedType(null), 2000);
  }

  function handleMarkPost(type: PostType, content: string, status: PostStatus) {
    if (!community) return;
    upsertHistoryItem(community.id, { type, content, status }).then(() =>
      getHistoryForCommunity(community.id).then(setCommunityHistory)
    );
  }

  async function handleHistoryCopy(item: HistoryItem) {
    await navigator.clipboard.writeText(item.content);
    setHistoryCopiedId(item.id);
    setTimeout(() => setHistoryCopiedId(null), 2000);
  }

  function buildUtmLink(baseLink: string, comm: DraftCommunity): string {
    const slug = comm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const base = baseLink.startsWith("http") ? baseLink : `https://${baseLink}`;
    const url = new URL(base);
    url.searchParams.set("utm_source", comm.platform);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", slug);
    return url.toString();
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || generating || !community) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const referralLink =
        includeReferral && userProfile?.referralLink
          ? buildUtmLink(userProfile.referralLink, community)
          : undefined;
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          tone,
          community: {
            name: community.name,
            description: community.description,
            type: community.type,
            platform: community.platform,
          },
          userProfile: userProfile ?? { trade: "contractor", location: "" },
          inspirationPosts: currentPosts ?? [],
          referralLink,
        }),
      });
      const data = await res.json() as GenerateResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      await saveDraftsForCommunity(community.id, data);
      await clearHistoryForCommunity(community.id);
      setCommunityHistory([]);
      setCommunities((prev) =>
        prev.map((c) =>
          c.id !== community.id
            ? c
            : {
                ...c,
                hasGeneratedDrafts: true,
                drafts: c.drafts.map((d) => ({
                  ...d,
                  content: data[d.type as keyof GenerateResponse] ?? d.content,
                })),
              }
        )
      );
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  function openModify(type: PostType, content: string) {
    setModifyTarget({ type, content });
    setModifyPrompt("");
    setModifyError(null);
    setTimeout(() => modifyInputRef.current?.focus(), 50);
  }

  function closeModify() {
    setModifyTarget(null);
    setModifyPrompt("");
    setModifyError(null);
  }

  const handleModifySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyPrompt.trim() || modifying || !modifyTarget || !community) return;
    setModifying(true);
    setModifyError(null);
    try {
      const res = await fetch("/api/drafts/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: modifyTarget.type,
          currentContent: modifyTarget.content,
          instruction: modifyPrompt,
          community: { name: community.name, platform: community.platform, type: community.type },
          userProfile: userProfile ?? { trade: "contractor", location: "" },
        }),
      });
      const data = await res.json() as ModifyResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setCommunities((prev) =>
        prev.map((c) =>
          c.id !== community.id
            ? c
            : {
                ...c,
                drafts: c.drafts.map((d) =>
                  d.type !== modifyTarget.type ? d : { ...d, content: data.content }
                ),
              }
        )
      );
      const updated = community.drafts.map((d) =>
        d.type !== modifyTarget.type ? d : { ...d, content: data.content }
      );
      await saveDraftsForCommunity(community.id, {
        introduction: updated.find((d) => d.type === "introduction")!.content,
        value: updated.find((d) => d.type === "value")!.content,
        engagement: updated.find((d) => d.type === "engagement")!.content,
      });
      closeModify();
    } catch (err) {
      setModifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setModifying(false);
    }
  }, [modifyPrompt, modifying, modifyTarget, community]);

  // Empty state
  if (loaded && communities.length === 0) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Post Drafts</h1>
        <p className="text-sm text-gray-500 mb-10">AI-generated posts for every community you've joined.</p>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No joined communities yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Join communities first — drafts will be generated for each one.</p>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Communities →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined Communities</h2>
          <p className="text-xs text-gray-400 mt-0.5">{communities.length} {communities.length === 1 ? "community" : "communities"}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {communities.map((c) => {
            const isActive = c.id === activeCommunityId;
            return (
              <button
                key={c.id}
                onClick={() => handleCommunityChange(c.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  isActive ? "bg-blue-50 border-r-2 border-blue-600" : "hover:bg-gray-50"
                }`}
              >
                <PlatformIcon platform={c.platform} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-2 leading-snug ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                    {c.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.type}</p>
                </div>
                {c.status === "pending" && (
                  <span className="shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded">
                    Pending
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right panel */}
      {community && (
        <div className="flex-1 overflow-y-auto p-8">
          {/* Community header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={community.platform} />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{community.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    community.type === "contractor"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {community.type === "contractor" ? "Find Partners" : "Reach Homeowners"}
                  </span>
                  {community.status === "pending" && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Request Pending
                    </span>
                  )}
                </div>
                <a
                  href={community.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
                  </svg>
                  Open {community.platform === "reddit" ? "subreddit" : "group"}
                </a>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            <button
              onClick={() => handleTabChange("compose")}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "compose"
                  ? "text-blue-700 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Compose
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "history"
                  ? "text-blue-700 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
            </button>
            <button
              onClick={() => handleTabChange("inspirations")}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "inspirations"
                  ? "text-blue-700 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Inspirations
              {postsLoading && (
                <svg className="animate-spin ml-0.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {currentPosts && !postsLoading && (
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {currentPosts.length}
                </span>
              )}
            </button>
          </div>

          {/* Compose tab — all 3 drafts stacked */}
          {activeTab === "compose" && (
            <div className="grid gap-6">

              {/* Generate form */}
              <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Generate Posts</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Describe what you want to share and we'll draft all three post types.</p>
                </div>
                <div className="px-5 py-4 grid gap-4">
                  {/* Prompt */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      What do you want to post about?
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={`e.g. "Share tips on finding reliable subcontractors in ${community.type === "contractor" ? "your local area" : "home renovation projects"}"`}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Tone</label>
                    <div className="flex gap-2">
                      {(["professional", "friendly", "casual"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                            tone === t
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Referral link */}
                  {(() => {
                    if (!userProfile?.referralLink) return null;
                    const utmLink = buildUtmLink(userProfile.referralLink, community);
                    return (
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={includeReferral}
                          onChange={(e) => setIncludeReferral(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                            Include my referral link in the posts
                          </span>
                          {includeReferral && (
                            <p className="mt-1 text-[11px] text-gray-400 font-mono break-all leading-snug">
                              {utmLink}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                {generateError && (
                  <p className="text-xs text-red-600 font-medium">{generateError}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Generates Introduction, Value Post &amp; Engagement drafts
                  </p>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || generating}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                        Generate Posts
                      </>
                    )}
                  </button>
                </div>
                </div>
              </form>

              {/* Draft cards */}
              {!community.hasGeneratedDrafts && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No drafts yet</p>
                  <p className="text-xs text-gray-400 mt-1">Fill in the form above and click Generate Posts.</p>
                </div>
              )}
              {community.hasGeneratedDrafts && community.drafts.map((d) => {
                const isCopied = copiedType === d.type;
                return (
                  <div key={d.type}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{d.label}</h3>
                    <div className="mb-3">
                      <ComplianceBanner status={d.compliance} note={d.complianceNote} />
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Draft</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModify(d.type, d.content)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Modify
                          </button>
                          <button
                            onClick={() => handleCopy(d)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isCopied
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy to Clipboard
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="px-5 py-5">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                          {d.content}
                        </pre>
                      </div>

                      {/* Posted? banner */}
                      {(() => {
                        const marked = communityHistory.find((h) => h.type === d.type);
                        if (marked) {
                          return (
                            <div className={`px-5 py-3 border-t flex items-center justify-between ${
                              marked.status === "posted"
                                ? "bg-green-50 border-green-100"
                                : "bg-amber-50 border-amber-100"
                            }`}>
                              <div className="flex items-center gap-2">
                                {marked.status === "posted" ? (
                                  <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    <span className="text-xs font-medium text-green-700">Posted</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span className="text-xs font-medium text-amber-700">Pending Approval</span>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {marked.status !== "posted" && (
                                  <button
                                    onClick={() => handleMarkPost(d.type, d.content, "posted")}
                                    className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                                  >
                                    Mark as Posted
                                  </button>
                                )}
                                {marked.status !== "pending_approval" && (
                                  <button
                                    onClick={() => handleMarkPost(d.type, d.content, "pending_approval")}
                                    className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
                                  >
                                    Mark as Pending
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Have you successfully posted this?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMarkPost(d.type, d.content, "pending_approval")}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                Pending Approval
                              </button>
                              <button
                                onClick={() => handleMarkPost(d.type, d.content, "posted")}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Yes, Posted
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History tab content */}
          {activeTab === "history" && (
            <>
              {communityHistory.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">No posts yet</p>
                  <p className="text-xs text-gray-400 mt-1">Mark a draft as posted or pending and it will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {communityHistory.map((item) => {
                    const meta = POST_TYPE_META[item.type];
                    const isCopied = historyCopiedId === item.id;
                    const isPosted = item.status === "posted";
                    return (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                              {meta.label}
                            </span>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              isPosted
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {isPosted ? "Posted" : "Pending Approval"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(item.postedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          <button
                            onClick={() => handleHistoryCopy(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                              isCopied
                                ? "bg-green-100 text-green-700"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="px-4 py-3.5">
                          <p className="text-sm text-gray-800 leading-relaxed line-clamp-4">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Inspirations tab content */}
          {activeTab === "inspirations" && (
            <>
              {postsLoading && (
                <div className="flex items-center gap-2.5 px-4 py-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-600">
                  <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Post Inspirations Loading…
                </div>
              )}
              {postsError && !postsLoading && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {postsError}
                </div>
              )}
              {currentPosts && !postsLoading && (
                <div className="grid gap-3">
                  {currentPosts.map((post) => (
                    <div key={post.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-gray-300 transition-colors">
                      {post.title && (
                        <p className="text-sm font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
                          {post.title}
                        </p>
                      )}
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 mb-2.5">
                        {post.text || <span className="text-gray-400 italic">No text</span>}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="font-medium text-gray-500">{post.authorName}</span>
                          {post.time && (
                            <>
                              <span>·</span>
                              <span>{new Date(post.time).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            {post.likesCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {post.commentsCount}
                          </span>
                        </div>
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:underline shrink-0">
                          Open →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modify modal */}
      {modifyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModify(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Modify Draft</h3>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{POST_TYPE_META[modifyTarget.type].label}</p>
              </div>
              <button
                onClick={closeModify}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModifySubmit}>
              <div className="px-5 py-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  What would you like to change?
                </label>
                <textarea
                  ref={modifyInputRef}
                  value={modifyPrompt}
                  onChange={(e) => setModifyPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") closeModify(); }}
                  placeholder='e.g. "Make it shorter" or "Add a specific example about storm damage" or "Change the tone to be more casual"'
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {modifyError && (
                  <p className="mt-2 text-xs text-red-600 font-medium">{modifyError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModify}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modifyPrompt.trim() || modifying}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {modifying ? (
                    <>
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Applying…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Apply
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
