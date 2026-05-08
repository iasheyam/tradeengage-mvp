import type { SubredditResult } from "@/app/api/debug/reddit-fetch/route";

export interface Subreddit {
  name: string;
  title: string;
  description: string;
  url: string;
  subscribers: number;
  weeklyPostFrequency: number;
  intent: "contractor" | "homeowner";
  trades: string[];
  locations: string[];
  savedAt: string;
}

export interface MergeStats {
  added: number;
  updated: number;
  unchanged: number;
}

export interface MergeResult {
  subreddits: Subreddit[];
  stats: MergeStats;
}

export function migrateSubreddit(s: Partial<Subreddit> & { name: string }): Subreddit {
  return {
    name: s.name,
    title: s.title ?? s.name,
    description: s.description ?? "",
    url: s.url ?? `https://www.reddit.com/r/${s.name}/`,
    subscribers: s.subscribers ?? 0,
    weeklyPostFrequency: s.weeklyPostFrequency ?? 0,
    intent: s.intent ?? "homeowner",
    trades: s.trades ?? [],
    locations: s.locations ?? [],
    savedAt: s.savedAt ?? new Date().toISOString(),
  };
}

export function loadSubredditsFromStorage(raw: string): Subreddit[] {
  try {
    const parsed = JSON.parse(raw) as Partial<Subreddit>[];
    return parsed.map((s) => migrateSubreddit(s as Partial<Subreddit> & { name: string }));
  } catch {
    return [];
  }
}

export function extractUniqueSubreddits(
  results: SubredditResult[],
  trade: string,
  location: string
): Subreddit[] {
  const seen = new Set<string>();
  const subreddits: Subreddit[] = [];

  for (const r of results) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    subreddits.push({
      name: r.name,
      title: r.title,
      description: r.description,
      url: r.url,
      subscribers: r.subscribers,
      weeklyPostFrequency: 0,
      intent: r.intent,
      trades: [trade],
      locations: [location],
      savedAt: new Date().toISOString(),
    });
  }

  return subreddits;
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

export function mergeSubredditsWithStored(
  existing: Subreddit[],
  incoming: Subreddit[],
  trade: string,
  location: string
): MergeResult {
  const map = new Map(existing.map((s) => [s.name.toLowerCase(), { ...s }]));
  const stats: MergeStats = { added: 0, updated: 0, unchanged: 0 };

  for (const sub of incoming) {
    const key = sub.name.toLowerCase();

    if (!map.has(key)) {
      map.set(key, sub);
      stats.added++;
    } else {
      const current = map.get(key)!;
      const hasTrade = current.trades.includes(trade);
      const hasLocation = current.locations.includes(location);

      if (hasTrade && hasLocation) {
        stats.unchanged++;
      } else {
        map.set(key, {
          ...current,
          trades: union(current.trades, sub.trades),
          locations: union(current.locations, sub.locations),
        });
        stats.updated++;
      }
    }
  }

  return { subreddits: Array.from(map.values()), stats };
}
