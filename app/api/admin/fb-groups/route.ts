import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { FBGroup } from "@/lib/extract-groups";

// GET — return all stored FB groups
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("fb_groups").select("*").order("saved_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — upsert a batch of FB groups (merge / replace)
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const groups: FBGroup[] = await req.json();

  if (!Array.isArray(groups) || groups.length === 0) {
    return NextResponse.json({ error: "groups array required" }, { status: 400 });
  }

  const rows = groups.map((g) => ({
    id: g.id,
    name: g.name,
    url: g.url,
    snippet: g.snippet,
    members: g.members,
    privacy: g.privacy ?? null,
    location: g.location ?? null,
    weekly_post_frequency: g.weeklyPostFrequency,
    has_questions: g.hasQuestions ?? null,
    intent: g.intent,
    trades: g.trades,
    locations: g.locations,
    last_enriched_at: g.lastEnrichedAt ?? null,
    saved_at: g.savedAt,
  }));

  const { error } = await supabase.from("fb_groups").upsert(rows, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ upserted: rows.length });
}

// DELETE — clear all FB groups
export async function DELETE() {
  const supabase = createServiceClient();
  const { error } = await supabase.from("fb_groups").delete().neq("id", "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
