const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "TradeEngage/1.0 MVP subreddit-discovery";

export interface SubredditResult {
  name: string;        // display_name, e.g. "HVAC"
  title: string;       // subreddit title
  description: string; // public_description
  url: string;         // full URL, e.g. "https://www.reddit.com/r/HVAC/"
  subscribers: number;
  over18: boolean;
}

async function redditGet(path: string): Promise<Response> {
  return fetch(`${REDDIT_BASE}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
}

function parseSubredditChild(data: Record<string, unknown>): SubredditResult {
  const name = String(data.display_name ?? "");
  return {
    name,
    title: String(data.title ?? ""),
    description: String(data.public_description ?? ""),
    url: `${REDDIT_BASE}/r/${name}/`,
    subscribers: Number(data.subscribers ?? 0),
    over18: Boolean(data.over18),
  };
}

export async function searchSubreddits(query: string): Promise<SubredditResult[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: "10", include_over_18: "false" });
    const res = await redditGet(`/subreddits/search.json?${params}`);
    if (!res.ok) return [];

    const json = await res.json() as {
      data?: { children?: Array<{ data: Record<string, unknown> }> };
    };

    return (json.data?.children ?? []).map((c) => parseSubredditChild(c.data));
  } catch {
    return [];
  }
}

export async function fetchSubredditAbout(name: string): Promise<SubredditResult | null> {
  try {
    const res = await redditGet(`/r/${name}/about.json`);
    if (!res.ok) return null;

    const json = await res.json() as { data?: Record<string, unknown> };
    if (!json.data) return null;

    return parseSubredditChild(json.data);
  } catch {
    return null;
  }
}
