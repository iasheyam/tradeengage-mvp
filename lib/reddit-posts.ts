import { createClient } from "@/lib/supabase/client";

export interface RedditPost {
  id: string;
  url: string;
  title: string;
  text: string;
  time: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
}

export interface RedditRun {
  runId: string;
  datasetId: string;
  startedAt: string;
}

const PLATFORM = "reddit";

function cid(name: string) {
  return `reddit-${name}`;
}

export async function getPostsForSubreddit(name: string): Promise<RedditPost[] | null> {
  const { data } = await createClient()
    .from("inspiration_posts")
    .select("*")
    .eq("community_id", cid(name))
    .eq("platform", PLATFORM);

  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    url: r.url ?? "",
    title: r.title ?? "",
    text: r.body,
    time: r.posted_at ?? "",
    authorName: r.author_name,
    likesCount: r.likes_count,
    commentsCount: r.comments_count,
  }));
}

export async function savePostsForSubreddit(name: string, posts: RedditPost[]): Promise<void> {
  if (posts.length === 0) return;
  const communityId = cid(name);
  const supabase = createClient();
  await supabase.from("inspiration_posts").delete().eq("community_id", communityId).eq("platform", PLATFORM);
  await supabase.from("inspiration_posts").insert(
    posts.map((p) => ({
      id: p.id,
      community_id: communityId,
      platform: PLATFORM,
      url: p.url,
      title: p.title || null,
      body: p.text,
      posted_at: p.time || null,
      author_name: p.authorName,
      likes_count: p.likesCount,
      comments_count: p.commentsCount,
    }))
  );
}

export async function getRunForSubreddit(name: string): Promise<RedditRun | null> {
  const { data } = await createClient()
    .from("scrape_runs")
    .select("*")
    .eq("community_id", cid(name))
    .eq("platform", PLATFORM)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { runId: data.run_id, datasetId: data.dataset_id ?? "", startedAt: data.started_at };
}

export async function saveRunForSubreddit(name: string, run: RedditRun): Promise<void> {
  await createClient().from("scrape_runs").insert({
    community_id: cid(name),
    platform: PLATFORM,
    run_id: run.runId,
    dataset_id: run.datasetId,
    started_at: run.startedAt,
    status: "running",
  });
}

export async function clearRunForSubreddit(name: string): Promise<void> {
  await createClient()
    .from("scrape_runs")
    .update({ status: "succeeded", finished_at: new Date().toISOString() })
    .eq("community_id", cid(name))
    .eq("platform", PLATFORM)
    .eq("status", "running");
}

export function loadAllSubredditPosts(): Record<string, RedditPost[]> {
  return {};
}
