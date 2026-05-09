import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Subreddit } from "@/lib/extract-subreddits";

// GET — return all stored subreddits (mapped to camelCase Subreddit shape)
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("subreddits").select("*").order("saved_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const subs = (data ?? []).map((r) => ({
    name: r.name,
    title: r.title,
    description: r.description,
    url: r.url,
    subscribers: r.subscribers,
    weeklyPostFrequency: r.weekly_post_frequency,
    intent: r.intent,
    trades: r.trades,
    locations: r.locations,
    savedAt: r.saved_at,
  }));

  return NextResponse.json(subs);
}

// POST — upsert a batch of subreddits (merge / replace)
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const subs: Subreddit[] = await req.json();

  if (!Array.isArray(subs) || subs.length === 0) {
    return NextResponse.json({ error: "subreddits array required" }, { status: 400 });
  }

  const rows = subs.map((s) => ({
    name: s.name,
    title: s.title,
    description: s.description,
    url: s.url,
    subscribers: s.subscribers,
    weekly_post_frequency: s.weeklyPostFrequency,
    intent: s.intent,
    trades: s.trades,
    locations: s.locations,
    saved_at: s.savedAt,
  }));

  const { error } = await supabase.from("subreddits").upsert(rows, { onConflict: "name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ upserted: rows.length });
}

// DELETE — clear all subreddits
export async function DELETE() {
  const supabase = createServiceClient();
  const { error } = await supabase.from("subreddits").delete().neq("name", "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
