"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Subreddit } from "@/lib/extract-subreddits";

export default function EditSubredditPage() {
  const params = useParams();
  const router = useRouter();
  const subredditName = decodeURIComponent(params.name as string);

  const [subreddit, setSubreddit] = useState<Subreddit | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [subscribers, setSubscribers] = useState(0);
  const [weeklyPostFrequency, setWeeklyPostFrequency] = useState(0);
  const [intent, setIntent] = useState<"contractor" | "homeowner">("homeowner");
  const [trades, setTrades] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [tradeInput, setTradeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [saved, setSaved] = useState(false);

  const tradeInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const subreddits: Subreddit[] = await fetch("/api/admin/subreddits").then((r) => r.json());
      const found = subreddits.find((s) => s.name === subredditName);
      if (!found) { setNotFound(true); return; }
      setSubreddit(found);
      setTitle(found.title);
      setDescription(found.description);
      setUrl(found.url);
      setSubscribers(found.subscribers);
      setWeeklyPostFrequency(found.weeklyPostFrequency);
      setIntent(found.intent);
      setTrades([...found.trades]);
      setLocations([...found.locations]);
    })();
  }, [subredditName]);

  function addTrade() {
    const val = tradeInput.trim();
    if (val && !trades.includes(val)) setTrades((prev) => [...prev, val]);
    setTradeInput("");
    tradeInputRef.current?.focus();
  }

  function removeTrade(t: string) {
    setTrades((prev) => prev.filter((x) => x !== t));
  }

  function addLocation() {
    const val = locationInput.trim();
    if (val && !locations.includes(val)) setLocations((prev) => [...prev, val]);
    setLocationInput("");
    locationInputRef.current?.focus();
  }

  function removeLocation(l: string) {
    setLocations((prev) => prev.filter((x) => x !== l));
  }

  async function save() {
    if (!subreddit) return;
    const subreddits: Subreddit[] = await fetch("/api/admin/subreddits").then((r) => r.json());
    const updated = subreddits.map((s) =>
      s.name === subredditName ? { ...s, title, description, url, subscribers, weeklyPostFrequency, intent, trades, locations } : s
    );
    await fetch("/api/admin/subreddits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setSaved(true);
    setTimeout(() => router.push("/admin/subreddits"), 600);
  }

  if (notFound) {
    return (
      <div className="p-8 max-w-2xl">
        <p className="text-sm text-gray-500">Subreddit not found.</p>
        <Link href="/admin/subreddits" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          ← Back to Subreddits
        </Link>
      </div>
    );
  }

  if (!subreddit) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/subreddits" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Subreddits
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 font-medium">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Subreddit</h1>
        <p className="mt-1 text-xs text-gray-400 font-mono">r/{subredditName}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name — read-only identifier */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Subreddit Name
            <span className="ml-2 text-xs font-normal normal-case text-gray-400">(read-only — primary key)</span>
          </label>
          <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500 font-mono">
            r/{subredditName}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Subscribers + Weekly Post Frequency — side by side */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Subscribers
            </label>
            <input
              type="number"
              min={0}
              value={subscribers}
              onChange={(e) => setSubscribers(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Weekly Post Frequency
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.1}
                value={weeklyPostFrequency}
                onChange={(e) => setWeeklyPostFrequency(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 pr-16 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                posts/wk
              </span>
            </div>
          </div>
        </div>

        {/* Intent */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Intent
          </label>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-0.5">
            {(["contractor", "homeowner"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setIntent(opt)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  intent === opt
                    ? opt === "contractor"
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-200"
                      : "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Trades */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Trades
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {trades.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {t}
                <button onClick={() => removeTrade(t)} className="text-blue-400 hover:text-blue-700 ml-0.5 leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={tradeInputRef}
              type="text"
              value={tradeInput}
              onChange={(e) => setTradeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTrade()}
              placeholder="Add trade… (press Enter)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTrade}
              className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Locations */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Locations
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {locations.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                {l}
                <button onClick={() => removeLocation(l)} className="text-gray-400 hover:text-gray-700 ml-0.5 leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={locationInputRef}
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLocation()}
              placeholder="Add location… (press Enter)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addLocation}
              className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saved}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            saved
              ? "bg-green-500 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saved ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
        <Link
          href="/admin/subreddits"
          className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
