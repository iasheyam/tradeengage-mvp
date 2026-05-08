import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ModifyRequest {
  postType: "introduction" | "value" | "engagement";
  currentContent: string;
  instruction: string;
  community: {
    name: string;
    platform: "facebook" | "reddit";
    type: "contractor" | "homeowner";
  };
  userProfile: {
    trade: string;
    location: string;
  };
}

export interface ModifyResponse {
  content: string;
}

const SYSTEM_PROMPT = `You are editing a social media post written by a real trade contractor. Apply the requested changes while keeping everything that wasn't mentioned intact.

HARD RULES — the same as when writing from scratch:
- Never use em dashes (—). Use a comma, period, or rephrase.
- No bullet points or numbered lists. Paragraphs only.
- Forbidden phrases: "I hope this helps", "It's important to note", "In conclusion", "Certainly!", "Absolutely!", "Great question"
- Forbidden words: delve, leverage, tapestry, vibrant, crucial, paramount, game-changer, cutting-edge, holistic, synergy, robust, comprehensive, multifaceted, foster, facilitate, utilize, spearhead, pivotal, transformative
- No corporate or marketing language.
- Contractions where natural: don't, can't, I've, you're, it's
- Short paragraphs, two to four sentences max.
- First person only.
- No hashtags on Reddit. Match the platform's conventions.

Return ONLY the revised post text. No explanation, no preamble, no quotes around it.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: ModifyRequest;
  try {
    body = (await req.json()) as ModifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.instruction?.trim()) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }
  if (!body.currentContent?.trim()) {
    return NextResponse.json({ error: "currentContent is required" }, { status: 400 });
  }

  const postTypeLabel =
    body.postType === "introduction"
      ? "introduction post"
      : body.postType === "value"
      ? "value/tip post"
      : "engagement/question post";

  const userMessage = `You are editing a ${postTypeLabel} for a ${body.community.platform} community called "${body.community.name}".

The author is a ${body.userProfile.trade} contractor${body.userProfile.location ? ` based in ${body.userProfile.location}` : ""}.

CURRENT POST:
${body.currentContent}

MODIFICATION REQUESTED:
${body.instruction}

Apply the modification. Keep everything else as-is. Return only the revised post text.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!content) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    return NextResponse.json({ content } satisfies ModifyResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
