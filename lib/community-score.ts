const TRADE_KEYWORDS: Record<string, string[]> = {
  HVAC: ["hvac", "heating", "cooling", "air conditioning", "ac", "furnace", "heat pump"],
  Plumbing: ["plumbing", "plumber", "pipe", "drain"],
  Electrical: ["electrical", "electrician", "electric", "wiring"],
  Roofing: ["roofing", "roofer", "roof"],
  Cleaning: ["cleaning", "cleaner", "housekeeping", "maid", "janitorial"],
  Landscaping: ["landscaping", "lawn", "landscape", "garden", "mowing"],
};

const CONTRACTOR_INTENT_WORDS = [
  "contractor", "professional", "tech", "technician", "network",
  "trade", "installer", "service pro",
];

const HOMEOWNER_INTENT_WORDS = [
  "homeowner", "neighbor", "neighborhood", "community", "home improvement",
  "home", "local", "resident", "diy",
];

// Returns a relevance score 0–10.
// Signals: trade keyword in name (+4), city in name (+2.5),
// intent words in name (+1.5), subscriber size for Reddit (+up to 2).
export function scoreCommunity(
  name: string,
  description: string,
  intent: "contractor" | "homeowner",
  platform: "facebook" | "reddit",
  subscribers: number,
  trade: string,
  location: string
): number {
  const nameLower = name.toLowerCase();
  const fullText = `${nameLower} ${description.toLowerCase()}`;
  const city = location.split(",")[0].trim().toLowerCase();
  const keywords = TRADE_KEYWORDS[trade] ?? [trade.toLowerCase()];

  let score = 0;

  if (keywords.some((k) => nameLower.includes(k))) {
    score += 4;
  } else if (keywords.some((k) => fullText.includes(k))) {
    score += 2;
  }

  if (nameLower.includes(city)) {
    score += 2.5;
  }

  const intentWords = intent === "contractor" ? CONTRACTOR_INTENT_WORDS : HOMEOWNER_INTENT_WORDS;
  if (intentWords.some((w) => nameLower.includes(w))) {
    score += 1.5;
  }

  if (platform === "reddit" && subscribers > 0) {
    score += Math.min(2, Math.log10(subscribers + 1) / 2.5);
  }

  return Math.min(10, Math.round(score * 10) / 10);
}
