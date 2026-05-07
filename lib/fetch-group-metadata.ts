export interface GroupMetadata {
  id: string;
  name: string | null;
  description: string | null;
}

function parseOgTag(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const altRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "i"
  );
  const match = html.match(regex) ?? html.match(altRegex);
  return match ? decodeHTMLEntities(match[1]) : null;
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function fetchGroupMetadata(groupId: string, url: string): Promise<GroupMetadata> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { id: groupId, name: null, description: null };

    const html = await res.text();
    const name = parseOgTag(html, "og:title");
    const description = parseOgTag(html, "og:description");

    return { id: groupId, name, description };
  } catch {
    return { id: groupId, name: null, description: null };
  }
}
