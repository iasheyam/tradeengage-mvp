import { NextRequest, NextResponse } from "next/server";

const APIFY_ACTOR = "trudax~reddit-scraper-lite";
const APIFY_BASE = "https://api.apify.com/v2";

interface ApifyRedditItem {
  dataType?: string;
  id?: string;
  url?: string;
  title?: string;
  body?: string;
  username?: string;
  upVotes?: number;
  numberOfComments?: number;
  createdAt?: string;
}

export interface RedditPostResult {
  id: string;
  url: string;
  title: string;
  text: string;
  time: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
}

function normalizePosts(raw: ApifyRedditItem[]): RedditPostResult[] {
  return raw
    .filter((p) => p.dataType === "post")
    .slice(0, 5)
    .map((p, i) => ({
      id: p.id ?? String(i),
      url: p.url ?? "",
      title: p.title ?? "",
      text: p.body ?? "",
      time: p.createdAt ?? "",
      authorName: p.username ?? "Unknown",
      likesCount: p.upVotes ?? 0,
      commentsCount: p.numberOfComments ?? 0,
    }));
}

// POST — start async run, return { runId, datasetId }
export async function POST(req: NextRequest) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
  }

  const { subredditUrl } = (await req.json()) as { subredditUrl: string };
  if (!subredditUrl) {
    return NextResponse.json({ error: "subredditUrl is required" }, { status: 400 });
  }

  const res = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: subredditUrl }],
      maxItems: 5,
      maxPostCount: 5,
      maxComments: 0,
      skipComments: true,
      skipCommunity: true,
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Apify ${res.status}: ${text}` }, { status: 502 });
  }

  const { data } = (await res.json()) as { data: { id: string; defaultDatasetId: string } };
  return NextResponse.json({ runId: data.id, datasetId: data.defaultDatasetId });
}

// GET — poll run status; if succeeded, fetch and return posts
export async function GET(req: NextRequest) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
  }

  const runId = req.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const runRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
  if (!runRes.ok) {
    return NextResponse.json({ error: `Failed to get run: ${runRes.status}` }, { status: 502 });
  }

  const { data: run } = (await runRes.json()) as { data: { status: string; defaultDatasetId: string } };

  if (run.status === "SUCCEEDED") {
    const dataRes = await fetch(
      `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${token}&limit=10`
    );
    if (!dataRes.ok) {
      return NextResponse.json({ error: "Failed to fetch dataset" }, { status: 502 });
    }
    const raw: ApifyRedditItem[] = await dataRes.json();
    return NextResponse.json({ status: "succeeded", posts: normalizePosts(raw) });
  }

  if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
    return NextResponse.json({ status: "failed", error: `Run ${run.status.toLowerCase()}` });
  }

  return NextResponse.json({ status: "running" });
}
