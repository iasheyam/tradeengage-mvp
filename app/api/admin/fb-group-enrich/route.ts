import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // single batch of ≤5 groups, ~30s max

const APIFY_ACTOR = "igview-owner~facebook-group-details-scraper";
const STALE_MS = 14 * 24 * 60 * 60 * 1000;

interface GroupInput {
  id: string;
  url: string;
  lastEnrichedAt: string | null;
}

interface ApifyResult {
  group_id: string;
  group_name: string;
  group_url: string;
  description: string;
  group_location: { name: string; id: string } | null;
  privacy: string;
  has_questions: boolean;
  members_count: number;
  scraped_at: string;
}

export interface EnrichResult {
  id: string;
  name: string | null;
  description: string | null;
  members: number | null;
  privacy: string | null;
  location: string | null;
  hasQuestions: boolean | null;
  lastEnrichedAt: string;
}

function isStale(lastEnrichedAt: string | null): boolean {
  if (!lastEnrichedAt) return true;
  return Date.now() - new Date(lastEnrichedAt).getTime() > STALE_MS;
}

async function callApify(urls: string[], token: string): Promise<ApifyResult[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupUrls: urls }),
      signal: AbortSignal.timeout(55_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Apify ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<ApifyResult[]>;
}

export async function POST(req: NextRequest) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "APIFY_API_TOKEN is not configured in environment variables." },
      { status: 500 }
    );
  }

  const { groups } = (await req.json()) as { groups: GroupInput[] };
  if (!groups?.length) {
    return NextResponse.json({ error: "groups array is required" }, { status: 400 });
  }

  const stale = groups.filter((g) => isStale(g.lastEnrichedAt));
  const skipped = groups.length - stale.length;

  if (!stale.length) {
    return NextResponse.json({ results: [], skipped });
  }

  const apifyResults = await callApify(stale.map((g) => g.url), token);

  const normalize = (u: string) => u.replace(/\/$/, "").toLowerCase();
  const byUrl = new Map<string, ApifyResult>();
  for (const r of apifyResults) {
    if (r.group_url) byUrl.set(normalize(r.group_url), r);
  }

  const results: EnrichResult[] = stale.map((group) => {
    const match = byUrl.get(normalize(group.url));
    return {
      id: group.id,
      name: match?.group_name ?? null,
      description: match?.description ?? null,
      members: match?.members_count ?? null,
      privacy: match?.privacy ?? null,
      location: match?.group_location?.name ?? null,
      hasQuestions: match?.has_questions ?? null,
      lastEnrichedAt: match?.scraped_at ?? new Date().toISOString(),
    };
  });

  return NextResponse.json({ results, skipped, _raw: apifyResults });
}
