import { NextRequest, NextResponse } from "next/server";

const APIFY_ACTOR = "apify~facebook-groups-scraper";
const APIFY_BASE = "https://api.apify.com/v2";

interface ApifyPost {
  id?: string;
  legacyId?: string;
  url?: string;
  text?: string;
  time?: string;
  user?: { id: string; name: string };
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
}

export interface FBGroupPostResult {
  id: string;
  url: string;
  text: string;
  time: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

function normalizePosts(raw: ApifyPost[]): FBGroupPostResult[] {
  return raw.slice(0, 5).map((p, i) => ({
    id: p.id ?? p.legacyId ?? String(i),
    url: p.url ?? "",
    text: p.text ?? "",
    time: p.time ?? "",
    authorName: p.user?.name ?? "Unknown",
    likesCount: p.likesCount ?? 0,
    commentsCount: p.commentsCount ?? 0,
    sharesCount: p.sharesCount ?? 0,
  }));
}

// POST — start async run, return { runId, datasetId }
export async function POST(req: NextRequest) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
  }

  const { groupUrl } = (await req.json()) as { groupUrl: string };
  if (!groupUrl) {
    return NextResponse.json({ error: "groupUrl is required" }, { status: 400 });
  }

  const res = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: groupUrl }],
      resultsLimit: 5,
      viewOption: "CHRONOLOGICAL",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Apify ${res.status}: ${text}` }, { status: 502 });
  }

  const { data } = await res.json() as { data: { id: string; defaultDatasetId: string } };
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

  const { data: run } = await runRes.json() as { data: { status: string; defaultDatasetId: string } };

  if (run.status === "SUCCEEDED") {
    const dataRes = await fetch(
      `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${token}&limit=5`
    );
    if (!dataRes.ok) {
      return NextResponse.json({ error: "Failed to fetch dataset" }, { status: 502 });
    }
    const raw: ApifyPost[] = await dataRes.json();
    return NextResponse.json({ status: "succeeded", posts: normalizePosts(raw) });
  }

  if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
    return NextResponse.json({ status: "failed", error: `Run ${run.status.toLowerCase()}` });
  }

  return NextResponse.json({ status: "running" });
}
