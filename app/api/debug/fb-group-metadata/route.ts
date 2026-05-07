import { NextRequest, NextResponse } from "next/server";
import { fetchGroupMetadata, type GroupMetadata } from "@/lib/fetch-group-metadata";

export async function POST(req: NextRequest) {
  const { groups } = await req.json() as { groups: { id: string; url: string }[] };

  if (!groups?.length) {
    return NextResponse.json({ error: "groups array is required" }, { status: 400 });
  }

  const results: GroupMetadata[] = [];

  for (const { id, url } of groups) {
    const metadata = await fetchGroupMetadata(id, url);
    results.push(metadata);
    // Small delay between requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ results });
}
