const TRADE_SYNONYMS: Record<string, string[]> = {
  HVAC: ["HVAC", "heating cooling", "air conditioning"],
  Plumbing: ["plumbing", "plumber"],
  Electrical: ["electrical", "electrician"],
  Roofing: ["roofing", "roofer"],
  Cleaning: ["cleaning", "house cleaning"],
  Landscaping: ["landscaping", "lawn care"],
};

const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  Atlanta: ["Buckhead", "Midtown Atlanta", "Sandy Springs", "Decatur", "Marietta", "Alpharetta", "Roswell", "Dunwoody"],
};

export interface SearchQuery {
  query: string;
  intent: "contractor" | "homeowner";
}

export function generateFBSearchQueries(trade: string, location: string): SearchQuery[] {
  const city = location.split(",")[0].trim();
  const state = location.split(",")[1]?.trim() ?? "";
  const synonyms = TRADE_SYNONYMS[trade] ?? [trade.toLowerCase()];
  const neighborhoods = CITY_NEIGHBORHOODS[city] ?? [];

  const contractorQueries: SearchQuery[] = [
    { query: `${synonyms[0]} ${city} contractors`, intent: "contractor" },
    { query: `${city} ${synonyms[0]} professionals`, intent: "contractor" },
    { query: `${city} ${synonyms[0]} network`, intent: "contractor" },
    { query: `${state} ${synonyms[0]} contractors`, intent: "contractor" },
  ];

  const homeownerQueries: SearchQuery[] = [
    { query: `${city} home improvement`, intent: "homeowner" },
    { query: `${city} homeowners`, intent: "homeowner" },
    { query: `${city} neighborhood community`, intent: "homeowner" },
    ...neighborhoods.slice(0, 5).map((n) => ({
      query: `${n} neighbors`,
      intent: "homeowner" as const,
    })),
  ];

  return [...contractorQueries, ...homeownerQueries];
}
