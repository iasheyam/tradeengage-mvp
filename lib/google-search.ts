export interface GoogleSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchFacebookGroups(query: string): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error("SERPER_API_KEY must be set in .env.local");
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `site:facebook.com/groups ${query}`,
      num: 10,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? `Serper API error: ${res.status}`);
  }

  if (!data.organic) return [];

  return data.organic.map((item: { title: string; link: string; snippet: string }) => ({
    title: item.title.replace(/\s*[|\-–]\s*Facebook.*$/i, "").trim(),
    url: item.link,
    snippet: item.snippet,
  }));
}
