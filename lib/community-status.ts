import { createClient } from "@/lib/supabase/client";

export type CommunityStatusValue = "joined" | "pending" | "not_interested";
export type PostStatus = "posted" | "pending_approval";

export interface GeneratedDrafts {
  introduction: string;
  value: string;
  engagement: string;
  generatedAt: string;
}

export interface PostedHistoryItem {
  id: string;
  type: "introduction" | "value" | "engagement";
  content: string;
  status: PostStatus;
  postedAt: string;
}

export interface CommunityStatus {
  userId: string;
  communityId: string;
  platform: "facebook" | "reddit";
  status: CommunityStatusValue;
  updatedAt: string;
  drafts?: GeneratedDrafts;
  history?: PostedHistoryItem[];
}

const MVP_USER_ID = "00000000-0000-0000-0000-000000000001";

async function getUserId(): Promise<string> {
  return MVP_USER_ID;
}

export async function loadStatuses(): Promise<CommunityStatus[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const [{ data: memberships }, { data: drafts }, { data: history }] = await Promise.all([
    supabase.from("community_memberships").select("*").eq("user_id", userId),
    supabase.from("community_drafts").select("*").eq("user_id", userId),
    supabase.from("post_history").select("*").eq("user_id", userId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (memberships ?? []).map((m: any) => ({
    userId: m.user_id,
    communityId: m.community_id,
    platform: m.platform as "facebook" | "reddit",
    status: m.status as CommunityStatusValue,
    updatedAt: m.updated_at,
    drafts: (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dr = (drafts as any[])?.find((dr: any) => dr.community_id === m.community_id);
      if (!dr) return undefined;
      return {
        introduction: dr.introduction,
        value: dr.value,
        engagement: dr.engagement,
        generatedAt: dr.generated_at,
      };
    })(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: (history ?? []).filter((h: any) => h.community_id === m.community_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((h: any) => ({
        id: h.id,
        type: h.type as "introduction" | "value" | "engagement",
        content: h.content,
        status: h.status as PostStatus,
        postedAt: h.posted_at,
      })),
  }));
}

export async function saveStatus(
  communityId: string,
  platform: "facebook" | "reddit",
  status: CommunityStatusValue
): Promise<void> {
  const userId = await getUserId();
  await createClient()
    .from("community_memberships")
    .upsert({ user_id: userId, community_id: communityId, platform, status },
             { onConflict: "user_id,community_id" });
}

export async function removeStatus(communityId: string): Promise<void> {
  const userId = await getUserId();
  await createClient()
    .from("community_memberships")
    .delete()
    .eq("user_id", userId)
    .eq("community_id", communityId);
}

export async function saveDraftsForCommunity(
  communityId: string,
  drafts: Omit<GeneratedDrafts, "generatedAt">
): Promise<void> {
  const userId = await getUserId();
  await createClient()
    .from("community_drafts")
    .upsert(
      {
        user_id: userId,
        community_id: communityId,
        introduction: drafts.introduction,
        value: drafts.value,
        engagement: drafts.engagement,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,community_id" }
    );
}

export async function getDraftsForCommunity(
  communityId: string
): Promise<GeneratedDrafts | null> {
  const userId = await getUserId();
  const { data } = await createClient()
    .from("community_drafts")
    .select("*")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .maybeSingle();

  if (!data) return null;
  return {
    introduction: data.introduction,
    value: data.value,
    engagement: data.engagement,
    generatedAt: data.generated_at,
  };
}

export async function getHistoryForCommunity(
  communityId: string
): Promise<PostedHistoryItem[]> {
  const userId = await getUserId();
  const { data } = await createClient()
    .from("post_history")
    .select("*")
    .eq("user_id", userId)
    .eq("community_id", communityId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((h: any) => ({
    id: h.id,
    type: h.type as "introduction" | "value" | "engagement",
    content: h.content,
    status: h.status as PostStatus,
    postedAt: h.posted_at,
  }));
}

export async function clearHistoryForCommunity(communityId: string): Promise<void> {
  const userId = await getUserId();
  await createClient()
    .from("post_history")
    .delete()
    .eq("user_id", userId)
    .eq("community_id", communityId);
}

export async function upsertHistoryItem(
  communityId: string,
  item: Omit<PostedHistoryItem, "id" | "postedAt"> & { id?: string }
): Promise<PostedHistoryItem> {
  const supabase = createClient();
  const userId = await getUserId();

  // Preserve original posted_at if the row already exists
  const { data: existing } = await supabase
    .from("post_history")
    .select("id, posted_at")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .eq("type", item.type)
    .maybeSingle();

  const { data, error } = await supabase
    .from("post_history")
    .upsert(
      {
        id: existing?.id ?? item.id ?? crypto.randomUUID(),
        user_id: userId,
        community_id: communityId,
        type: item.type,
        content: item.content,
        status: item.status,
        posted_at: existing?.posted_at ?? new Date().toISOString(),
      },
      { onConflict: "user_id,community_id,type" }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to upsert history item");

  return {
    id: data.id,
    type: data.type as "introduction" | "value" | "engagement",
    content: data.content,
    status: data.status as PostStatus,
    postedAt: data.posted_at,
  };
}
