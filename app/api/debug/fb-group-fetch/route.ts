import { NextRequest, NextResponse } from "next/server";
import { generateFBSearchQueries } from "@/lib/search-terms";
import { searchFacebookGroups } from "@/lib/google-search";

export interface FBGroupResult {
  title: string;
  url: string;
  snippet: string;
  intent: "contractor" | "homeowner";
  queryUsed: string;
}

export interface FBGroupFetchResponse {
  trade: string;
  location: string;
  queriesRun: number;
  totalFound: number;
  results: FBGroupResult[];
  errors: { query: string; error: string }[];
}

export async function GET() {
  return NextResponse.json({
    SERPER_API_KEY: process.env.SERPER_API_KEY ? `set (${process.env.SERPER_API_KEY.slice(0, 6)}...)` : "NOT SET",
  });
}

export async function POST(req: NextRequest) {
  const { trade, location } = await req.json();

  if (!trade || !location) {
    return NextResponse.json({ error: "trade and location are required" }, { status: 400 });
  }

  const queries = generateFBSearchQueries(trade, location);
  const seen = new Set<string>();
  const results: FBGroupResult[] = [];
  const errors: { query: string; error: string }[] = [];

  for (const { query, intent } of queries) {
    try {
      const items = await searchFacebookGroups(query);
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          results.push({ ...item, intent, queryUsed: query });
        }
      }
    } catch (err) {
      errors.push({ query, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const response: FBGroupFetchResponse = {
    trade,
    location,
    queriesRun: queries.length,
    totalFound: results.length,
    results,
    errors,
  };

  return NextResponse.json(response);
}
