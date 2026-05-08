import { createClient } from "@/lib/supabase/client";

export interface FBGroupPost {
  id: string;
  url: string;
  text: string;
  time: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
}

export interface FBGroupRun {
  runId: string;
  datasetId: string;
  startedAt: string;
}

const PLATFORM = "facebook";

function cid(groupId: string) {
  return `fb-${groupId}`;
}

export async function getPostsForGroup(groupId: string): Promise<FBGroupPost[] | null> {
  const { data } = await createClient()
    .from("inspiration_posts")
    .select("*")
    .eq("community_id", cid(groupId))
    .eq("platform", PLATFORM);

  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    url: r.url ?? "",
    text: r.body,
    time: r.posted_at ?? "",
    authorName: r.author_name,
    likesCount: r.likes_count,
    commentsCount: r.comments_count,
  }));
}

export async function savePostsForGroup(groupId: string, posts: FBGroupPost[]): Promise<void> {
  if (posts.length === 0) return;
  const communityId = cid(groupId);
  const supabase = createClient();
  await supabase.from("inspiration_posts").delete().eq("community_id", communityId).eq("platform", PLATFORM);
  await supabase.from("inspiration_posts").insert(
    posts.map((p) => ({
      id: p.id,
      community_id: communityId,
      platform: PLATFORM,
      url: p.url,
      body: p.text,
      posted_at: p.time || null,
      author_name: p.authorName,
      likes_count: p.likesCount,
      comments_count: p.commentsCount,
    }))
  );
}

export async function getRunForGroup(groupId: string): Promise<FBGroupRun | null> {
  const { data } = await createClient()
    .from("scrape_runs")
    .select("*")
    .eq("community_id", cid(groupId))
    .eq("platform", PLATFORM)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { runId: data.run_id, datasetId: data.dataset_id ?? "", startedAt: data.started_at };
}

export async function saveRunForGroup(groupId: string, run: FBGroupRun): Promise<void> {
  await createClient().from("scrape_runs").insert({
    community_id: cid(groupId),
    platform: PLATFORM,
    run_id: run.runId,
    dataset_id: run.datasetId,
    started_at: run.startedAt,
    status: "running",
  });
}

export async function loadAllGroupPosts(): Promise<Record<string, FBGroupPost[]>> {
  const { data } = await createClient()
    .from("inspiration_posts")
    .select("*")
    .eq("platform", PLATFORM);

  const result: Record<string, FBGroupPost[]> = {};
  for (const r of data ?? []) {
    const key = r.community_id.replace(/^fb-/, "");
    if (!result[key]) result[key] = [];
    result[key].push({
      id: r.id,
      url: r.url ?? "",
      text: r.body,
      time: r.posted_at ?? "",
      authorName: r.author_name,
      likesCount: r.likes_count,
      commentsCount: r.comments_count,
    });
  }
  return result;
}

export async function clearRunForGroup(groupId: string): Promise<void> {
  await createClient()
    .from("scrape_runs")
    .update({ status: "succeeded", finished_at: new Date().toISOString() })
    .eq("community_id", cid(groupId))
    .eq("platform", PLATFORM)
    .eq("status", "running");
}
