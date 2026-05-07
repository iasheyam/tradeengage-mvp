import type { FBGroupResult } from "@/app/api/debug/fb-group-fetch/route";

export interface FBGroup {
  id: string;
  name: string;
  url: string;
  snippet: string;
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
  groups: FBGroup[];
  stats: MergeStats;
}

// Ensures every group read from storage has all required fields.
// Guards against entries saved before the schema was finalized.
export function migrateGroup(g: Partial<FBGroup> & { id: string }): FBGroup {
  return {
    id: g.id,
    name: g.name ?? "",
    url: g.url ?? normalizeGroupUrl(g.id),
    snippet: g.snippet ?? "",
    intent: g.intent ?? "homeowner",
    trades: g.trades ?? [],
    locations: g.locations ?? [],
    savedAt: g.savedAt ?? new Date().toISOString(),
  };
}

export function loadFromStorage(raw: string): FBGroup[] {
  try {
    const parsed = JSON.parse(raw) as Partial<FBGroup>[];
    return parsed.map((g) => migrateGroup(g as Partial<FBGroup> & { id: string }));
  } catch {
    return [];
  }
}

export function extractGroupId(url: string): string | null {
  const match = url.match(/facebook\.com\/groups\/([^\/\?#]+)/);
  return match ? match[1] : null;
}

export function normalizeGroupUrl(groupId: string): string {
  return `https://www.facebook.com/groups/${groupId}`;
}

export function extractUniqueGroups(
  results: FBGroupResult[],
  trade: string,
  location: string
): FBGroup[] {
  const seen = new Set<string>();
  const groups: FBGroup[] = [];

  for (const result of results) {
    const groupId = extractGroupId(result.url);
    if (!groupId || seen.has(groupId)) continue;
    seen.add(groupId);
    groups.push({
      id: groupId,
      name: result.title,
      url: normalizeGroupUrl(groupId),
      snippet: result.snippet,
      intent: result.intent,
      trades: [trade],
      locations: [location],
      savedAt: new Date().toISOString(),
    });
  }

  return groups;
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

export function mergeWithStored(
  existing: FBGroup[],
  incoming: FBGroup[],
  trade: string,
  location: string
): MergeResult {
  const map = new Map(existing.map((g) => [g.id, { ...g }]));
  const stats: MergeStats = { added: 0, updated: 0, unchanged: 0 };

  for (const group of incoming) {
    if (!map.has(group.id)) {
      // Completely new group
      map.set(group.id, group);
      stats.added++;
    } else {
      const current = map.get(group.id)!;
      const hasTrade = (current.trades ?? []).includes(trade);
      const hasLocation = (current.locations ?? []).includes(location);

      if (hasTrade && hasLocation) {
        // Already fully covered — no change needed
        stats.unchanged++;
      } else {
        // Exists but missing this trade or location — update
        map.set(group.id, {
          ...current,
          trades: union(current.trades ?? [], group.trades),
          locations: union(current.locations ?? [], group.locations),
        });
        stats.updated++;
      }
    }
  }

  return { groups: Array.from(map.values()), stats };
}
