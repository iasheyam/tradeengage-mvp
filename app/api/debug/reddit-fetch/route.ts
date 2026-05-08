import { NextRequest, NextResponse } from "next/server";
import { generateRedditQueries } from "@/lib/search-terms";
import { searchSubreddits } from "@/lib/reddit-search";

export interface SubredditResult {
  name: string;
  title: string;
  description: string;
  url: string;
  subscribers: number;
  intent: "contractor" | "homeowner";
  queryUsed: string;
}

export interface RedditFetchResponse {
  trade: string;
  location: string;
  queriesRun: number;
  totalFound: number;
  results: SubredditResult[];
  errors: { query: string; error: string }[];
}

export async function POST(req: NextRequest) {
  const { trade, location } = await req.json();

  if (!trade || !location) {
    return NextResponse.json({ error: "trade and location are required" }, { status: 400 });
  }

  const queries = generateRedditQueries(trade, location);
  const seen = new Set<string>();
  const results: SubredditResult[] = [];
  const errors: { query: string; error: string }[] = [];

  for (const { query, intent } of queries) {
    try {
      const items = await searchSubreddits(query);
      for (const sub of items) {
        const key = sub.name.toLowerCase();
        if (seen.has(key) || sub.over18) continue;
        seen.add(key);
        results.push({ ...sub, intent, queryUsed: query });
      }
    } catch (err) {
      errors.push({ query, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const response: RedditFetchResponse = {
    trade,
    location,
    queriesRun: queries.length,
    totalFound: results.length,
    results,
    errors,
  };

  return NextResponse.json(response);
}
