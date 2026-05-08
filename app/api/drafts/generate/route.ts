import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GenerateRequest {
  prompt: string;
  tone: "professional" | "friendly" | "casual";
  community: {
    name: string;
    description: string;
    type: "contractor" | "homeowner";
    platform: "facebook" | "reddit";
  };
  userProfile: {
    trade: string;
    location: string;
  };
  inspirationPosts: Array<{
    title?: string;
    text: string;
    authorName: string;
    likesCount: number;
    commentsCount: number;
  }>;
  referralLink?: string;
}

export interface GenerateResponse {
  introduction: string;
  value: string;
  engagement: string;
}

const SYSTEM_PROMPT = `You write social media posts on behalf of a real trade contractor. The posts must be indistinguishable from something a genuine community member would write.

HARD RULES — violating any of these makes the post unusable:
- Never use em dashes (—). Use a comma, period, or just rephrase.
- No bullet points or numbered lists. Write in paragraphs.
- Forbidden phrases: "I hope this helps", "It's important to note", "In conclusion", "In summary", "Certainly!", "Absolutely!", "Great question", "I'd be happy to", "As a [trade] professional"
- Forbidden words: delve, leverage, tapestry, vibrant, crucial, paramount, game-changer, cutting-edge, holistic, synergy, robust, comprehensive, multifaceted, foster, facilitate, utilize, spearhead, pivotal, transformative, it's worth noting, in today's world, pain points, best practices
- No corporate or marketing language. Write like a person typing on their phone.
- Contractions are required where natural: don't, can't, I've, you're, we're, it's
- Short paragraphs. Two to four sentences per paragraph max.
- Mix sentence lengths. Short punchy sentences break up longer ones.
- Be specific. Mention real numbers, durations, trade-specific details, named materials, dollar ranges.
- First person only. Never refer to yourself in third person.
- No hashtags on Facebook posts unless the example posts use them. Reddit posts never use hashtags.

GOAL: The post must feel like it came from someone who lives and breathes this trade, not from someone who used AI. A moderator reading it should have zero suspicion.`;

function buildUserMessage(req: GenerateRequest): string {
  const audienceLabel =
    req.community.type === "contractor"
      ? "fellow contractors and tradespeople"
      : "homeowners";

  const platformNote =
    req.community.platform === "reddit"
      ? "This is a Reddit community. Keep it direct and informative. Reddit users are skeptical of anything promotional. Never sound like an advertisement. No hashtags."
      : "This is a Facebook group. A slightly warmer, more personal tone works here. Keep it real and conversational.";

  const toneGuide =
    req.tone === "professional"
      ? "Clear and knowledgeable, like a seasoned contractor talking to peers. Not formal — just confident and precise."
      : req.tone === "friendly"
      ? "Warm and approachable. Like catching up with someone at a trade show. Easy to read."
      : "Relaxed and casual. Short sentences. Sounds like a text message from a contractor friend.";

  const inspirationBlock =
    req.inspirationPosts.length > 0
      ? `REAL POSTS FROM THIS COMMUNITY (study the vocabulary, length, and energy — match it closely):
${req.inspirationPosts
  .slice(0, 4)
  .map(
    (p, i) =>
      `[Post ${i + 1}]${p.title ? ` "${p.title}"` : ""}
${p.text.trim().slice(0, 600)}${p.text.length > 600 ? "..." : ""}`
  )
  .join("\n\n")}`
      : "No example posts available. Use your best judgment for the community style.";

  const valuePostInstruction = req.referralLink
    ? `Share something genuinely useful — a specific tip, a hard lesson, a mistake you made, something that saved you time or money. Make it concrete. Readers should feel like they learned something real. You MUST include this exact URL somewhere in the text: ${req.referralLink} — drop it in mid-sentence as a natural resource mention, not as a call-to-action or labeled link.`
    : `Share something genuinely useful — a specific tip, a hard lesson, a mistake you made, something that saved you time or money. Make it concrete. Readers should feel like they learned something real.`;

  return `Write 3 posts for a ${req.community.platform} community.

ABOUT ME:
Trade: ${req.userProfile.trade}
Location: ${req.userProfile.location}

COMMUNITY:
Name: ${req.community.name}
Description: ${req.community.description || "Not available"}
Audience: ${audienceLabel}
${platformNote}

WHAT I WANT TO POST ABOUT:
${req.prompt}

TONE: ${toneGuide}

${inspirationBlock}

---
Write exactly these 3 post types. Return a JSON object and nothing else — no explanation, no markdown fences.

{
  "introduction": "A genuine first post introducing yourself to the community. Personal, a little vulnerable, shows real experience. Mention your trade, location, and one specific thing you've learned or dealt with recently. Do NOT say you're 'excited to join' or use any generic opener.",
  "value": "${valuePostInstruction}",
  "engagement": "A question or conversation starter that gets people talking. Specific enough to attract real answers from ${audienceLabel}. Not vague. Something you'd actually want to know."
}`;
}

function parseResponse(raw: string): GenerateResponse {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const parsed = JSON.parse(cleaned) as GenerateResponse;
  if (!parsed.introduction || !parsed.value || !parsed.engagement) {
    throw new Error("Incomplete response from model");
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(body) }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const drafts = parseResponse(raw);
    return NextResponse.json(drafts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
