import { createClient } from "@/lib/supabase/client";
import { scoreCommunity } from "@/lib/community-score";

export interface Community {
  id: string;
  name: string;
  platform: "facebook" | "reddit";
  type: "contractor" | "homeowner";
  members: number;
  relevance: number;
  url: string;
  description: string;
}

export interface UserProfile {
  trade: string;
  location: string;
  referralLink?: string;
}

const MVP_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function loadProfile(): Promise<UserProfile | null> {
  const { data } = await createClient()
    .from("user_profiles")
    .select("trade, location, referral_link")
    .eq("id", MVP_USER_ID)
    .maybeSingle();

  if (!data || (!data.trade && !data.location)) return null;

  return {
    trade: data.trade ?? "",
    location: data.location ?? "",
    referralLink: data.referral_link ?? undefined,
  };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await createClient().from("user_profiles").upsert(
    {
      id: MVP_USER_ID,
      trade: profile.trade,
      location: profile.location,
      referral_link: profile.referralLink ?? null,
    },
    { onConflict: "id" }
  );
}

export async function loadCommunities(profile: UserProfile): Promise<Community[]> {
  const supabase = createClient();

  const [{ data: fbGroups }, { data: subreddits }] = await Promise.all([
    supabase
      .from("fb_groups")
      .select("*")
      .contains("trades", [profile.trade]),
    supabase
      .from("subreddits")
      .select("*")
      .contains("trades", [profile.trade]),
  ]);

  const communities: Community[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(fbGroups ?? []).map((g: any) => ({
      id: `fb-${g.id}`,
      name: g.name,
      platform: "facebook" as const,
      type: g.intent as "contractor" | "homeowner",
      members: g.members,
      relevance: scoreCommunity(g.name, g.snippet, g.intent, "facebook", g.members, profile.trade, profile.location),
      url: g.url,
      description: g.snippet,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(subreddits ?? []).map((s: any) => ({
      id: `reddit-${s.name}`,
      name: `r/${s.name}`,
      platform: "reddit" as const,
      type: s.intent as "contractor" | "homeowner",
      members: s.subscribers,
      relevance: scoreCommunity(s.name, s.description, s.intent, "reddit", s.subscribers, profile.trade, profile.location),
      url: s.url,
      description: s.description,
    })),
  ];

  return communities.sort((a, b) => b.relevance - a.relevance || b.members - a.members);
}
