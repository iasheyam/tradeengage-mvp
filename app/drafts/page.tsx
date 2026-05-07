"use client";

import { useState } from "react";

type Platform = "facebook" | "reddit";
type CommunityType = "contractor" | "homeowner";
type ComplianceStatus = "clean" | "review" | "flagged";
type PostType = "introduction" | "value" | "engagement" | "referral";

interface Draft {
  type: PostType;
  label: string;
  content: string;
  compliance: ComplianceStatus;
  complianceNote?: string;
}

interface SelectedCommunity {
  id: string;
  name: string;
  platform: Platform;
  type: CommunityType;
  postingRules: string;
  drafts: Draft[];
}

const SELECTED_COMMUNITIES: SelectedCommunity[] = [
  {
    id: "c1",
    name: "Atlanta HVAC Professionals",
    platform: "facebook",
    type: "contractor",
    postingRules: "No spam. Introduce yourself first.",
    drafts: [
      {
        type: "introduction",
        label: "Introduction",
        compliance: "clean",
        content: `Hey everyone! I'm reaching out from a local HVAC company based in Buckhead, Atlanta. We've been serving the metro area for 8+ years — residential and light commercial systems.

I'm looking to connect with other trades (plumbers, electricians, roofers) to build a solid referral network. We use TradeEngage to manage and track referrals, which makes paying out referral fees simple and transparent.

If you're open to trading referrals with a reliable HVAC company, drop a comment or send me a DM. Happy to connect!`,
      },
      {
        type: "value",
        label: "Value Post",
        compliance: "clean",
        content: `Quick field tip for fellow HVAC techs in the Atlanta market:

Before replacing a compressor on a short-cycling unit, always verify refrigerant charge first. In my experience, ~80% of short-cycling calls in older systems are caused by an undercharge tripping the high-pressure cutoff — not a failed compressor.

Saved a customer $2,400 last week by catching this before ordering parts.

What's the most common misdiagnosis you see on service calls? Would love to hear what the Atlanta market is dealing with this season.`,
      },
      {
        type: "engagement",
        label: "Engagement",
        compliance: "clean",
        content: `Question for the group — how are you handling lead generation heading into summer?

We're deciding between doubling down on maintenance contract renewals vs. pushing harder on new installs while demand is high. Trying to figure out what's working for other Atlanta HVAC companies right now.

Also curious: are any of you using referral networks with other trades to stay busy in shoulder season? Would love to compare notes.`,
      },
    ],
  },
  {
    id: "c5",
    name: "r/HVAC",
    platform: "reddit",
    type: "contractor",
    postingRules: "No self-promo without context. Flair required.",
    drafts: [
      {
        type: "introduction",
        label: "Introduction",
        compliance: "review",
        complianceNote: "r/HVAC discourages direct self-promotion in introductory posts. Lead with a question or shared experience before mentioning your business.",
        content: `Been lurking here for a while and finally making an account to engage more. Run a small HVAC operation in Atlanta — mostly residential, some light commercial.

Curious how other techs in warm-climate markets are handling the shift to heat pump installs. We're seeing more homeowners ask about them but the upfront cost objection is brutal in our market.

Anyone figured out a good way to frame the ROI conversation, especially with Georgia Power rates?`,
      },
      {
        type: "value",
        label: "Value Post",
        compliance: "clean",
        content: `TIL: Atlanta's new building code (adopted Jan 2025) requires ACCA Manual J load calculations for all replacement installs over 5 tons — not just new construction.

Had an inspector flag a straight swap on a 6-ton commercial unit last month. Worth double-checking if you're doing any larger replacements in Fulton or DeKalb counties.

Anyone else run into this yet? Happy to share the specific code section if useful.`,
      },
      {
        type: "engagement",
        label: "Engagement",
        compliance: "clean",
        content: `For Atlanta-area HVAC folks: what's your go-to approach for the "my unit is 12 years old, should I repair or replace?" conversation?

I've been using a rough rule of thumb — if repair cost exceeds 50% of a new unit's price AND efficiency delta is >30%, push for replacement. But curious if anyone has a better framework, especially with refrigerant transition costs now in the mix.`,
      },
    ],
  },
  {
    id: "h2",
    name: "Buckhead Neighbors",
    platform: "facebook",
    type: "homeowner",
    postingRules: "Local residents only. No promotional posts.",
    drafts: [
      {
        type: "introduction",
        label: "Introduction",
        compliance: "review",
        complianceNote: "This group restricts promotional posts. Avoid mentioning your company name or services directly. Lead with neighborhood context.",
        content: `Hi neighbors! Long-time Buckhead resident here. With summer coming up fast, just wanted to share a few things I've learned about keeping your home comfortable without the utility bill shock.

Atlanta's humidity makes HVAC maintenance more important than most people realize — a dirty coil in June can add 20–30% to your cooling costs.

Happy to answer any home cooling questions if anyone has them. We look out for each other here!`,
      },
      {
        type: "value",
        label: "Value Post",
        compliance: "clean",
        content: `🌡️ Atlanta Summer HVAC Checklist (before the real heat hits):

✓ Replace air filters — pollen season clogs them faster than you think
✓ Clear debris from your outdoor unit, especially after storms
✓ Set your thermostat to 78°F when home, 85°F when away to balance comfort and cost
✓ Listen for unusual sounds — rattling or squealing now means an expensive repair in August
✓ Check that condensate drain line is clear (pour a cup of bleach down it)

Starting the season right can save $300–$500 on your summer bills. Happy to answer any questions!`,
      },
      {
        type: "referral",
        label: "Referral",
        compliance: "flagged",
        complianceNote: "This group explicitly bans promotional posts and external links. Do not post referral links in this community. Consider using the Value Post template instead.",
        content: `Looking for a reliable HVAC tech in Buckhead? I've been using TradeEngage to find vetted local contractors — homeowners who book through my link also get access to a rewards program for future referrals.

[Your referral link: tradeengage.com/ref/user123?utm_source=facebook&utm_medium=group_post&utm_campaign=buckhead-neighbors]

Feel free to DM me if you want a personal recommendation!`,
      },
    ],
  },
  {
    id: "h6",
    name: "r/Atlanta",
    platform: "reddit",
    type: "homeowner",
    postingRules: "Broad topics. Self-promo gets downvoted.",
    drafts: [
      {
        type: "introduction",
        label: "Introduction",
        compliance: "clean",
        content: `Atlanta homeowner here (Decatur side). The amount of HVAC horror stories I've seen this summer got me thinking — what's everyone's strategy for vetting contractors?

I've had three bad experiences in four years. Would genuinely love to hear what the r/Atlanta community uses to find reliable trades. Angi? Nextdoor recommendations? Word of mouth only?`,
      },
      {
        type: "value",
        label: "Value Post",
        compliance: "clean",
        content: `For Atlanta homeowners prepping for summer: your AC system is about to work harder than it has all year. A few things worth checking this week:

**Filter** — if it's been more than 60 days, replace it. Pollen is brutal here.
**Outdoor unit** — clear at least 2 feet of clearance around it.
**Thermostat** — if it's more than 10 years old, a smart thermostat pays for itself in one Atlanta summer.
**Unusual sounds** — address them now. Emergency HVAC calls in July cost 40% more on average.

Happy to answer any questions in the comments.`,
      },
      {
        type: "referral",
        label: "Referral",
        compliance: "review",
        complianceNote: "r/Atlanta allows contractor recommendations when they're genuine and contextual. Avoid leading with the referral link — post it as a comment reply instead of the main post body.",
        content: `Been asked a few times via DM about how I find reliable HVAC contractors in Atlanta so sharing here.

I've been using TradeEngage — it's a platform that vets local home service companies and lets homeowners earn rewards when they refer contractors to friends. The referral program actually pays out, which is rare.

If you want to check it out: tradeengage.com/ref/user123?utm_source=reddit&utm_medium=group_post&utm_campaign=r-atlanta

Not affiliated, just a genuinely happy user.`,
      },
    ],
  },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "facebook") {
    return (
      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center shrink-0">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
        <path d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6C15.1 9.8 13.6 9.3 12 9.2l.8-3.6 2.5.5a1.5 1.5 0 1 0 .2-.9l-2.8-.6a.4.4 0 0 0-.5.3l-.9 4c-1.6.1-3 .6-4.1 1.4A2 2 0 1 0 5.5 13a3.6 3.6 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12zM9 13.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm5.6 2.7a3.5 3.5 0 0 1-2.6.8 3.5 3.5 0 0 1-2.6-.8.3.3 0 0 1 .4-.4 3 3 0 0 0 2.2.7 3 3 0 0 0 2.2-.7.3.3 0 0 1 .4.4zm-.1-1.7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
    </div>
  );
}

function ComplianceBanner({ status, note }: { status: ComplianceStatus; note?: string }) {
  if (status === "clean") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="text-xs font-medium text-green-700">Compliant — ready to post</span>
      </div>
    );
  }
  if (status === "review") {
    return (
      <div className="flex items-start gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p className="text-xs font-medium text-yellow-700">Review recommended</p>
          {note && <p className="text-xs text-yellow-600 mt-0.5">{note}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div>
        <p className="text-xs font-medium text-red-700">Flagged — do not post as-is</p>
        {note && <p className="text-xs text-red-600 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export default function DraftsPage() {
  const [activeCommunityId, setActiveCommunityId] = useState(SELECTED_COMMUNITIES[0].id);
  const [activeDraftType, setActiveDraftType] = useState<PostType>("introduction");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const community = SELECTED_COMMUNITIES.find((c) => c.id === activeCommunityId)!;
  const draft = community.drafts.find((d) => d.type === activeDraftType) ?? community.drafts[0];

  function handleTabChange(type: PostType) {
    setActiveDraftType(type);
    setCopied(false);
  }

  function handleCommunityChange(id: string) {
    const c = SELECTED_COMMUNITIES.find((c) => c.id === id)!;
    setActiveCommunityId(id);
    setActiveDraftType(c.drafts[0].type);
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRegenerating(false);
  }

  return (
    <div className="flex h-full">
      {/* Left panel — community list */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selected Communities</h2>
          <p className="text-xs text-gray-400 mt-0.5">{SELECTED_COMMUNITIES.length} communities</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SELECTED_COMMUNITIES.map((c) => {
            const flaggedCount = c.drafts.filter((d) => d.compliance === "flagged").length;
            const reviewCount = c.drafts.filter((d) => d.compliance === "review").length;
            const isActive = c.id === activeCommunityId;
            return (
              <button
                key={c.id}
                onClick={() => handleCommunityChange(c.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  isActive ? "bg-blue-50 border-r-2 border-blue-600" : "hover:bg-gray-50"
                }`}
              >
                <PlatformIcon platform={c.platform} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                    {c.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.type}</p>
                </div>
                {flaggedCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {flaggedCount}
                  </span>
                )}
                {flaggedCount === 0 && reviewCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-yellow-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {reviewCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right panel — draft workspace */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Community header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <PlatformIcon platform={community.platform} />
            <h1 className="text-xl font-semibold text-gray-900">{community.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              community.type === "contractor"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {community.type === "contractor" ? "Find Partners" : "Reach Homeowners"}
            </span>
          </div>
          <p className="text-xs text-gray-400 ml-9">
            <span className="font-medium text-gray-500">Posting rules:</span> {community.postingRules}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {community.drafts.map((d) => {
            const isActive = d.type === (draft?.type ?? community.drafts[0].type);
            const dotColor =
              d.compliance === "flagged" ? "bg-red-500" :
              d.compliance === "review" ? "bg-yellow-400" : "bg-green-500";
            return (
              <button
                key={d.type}
                onClick={() => handleTabChange(d.type)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "text-blue-700 border-blue-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {d.label}
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              </button>
            );
          })}
        </div>

        {/* Compliance banner */}
        <div className="mb-4">
          <ComplianceBanner status={draft.compliance} note={draft.complianceNote} />
        </div>

        {/* Draft content */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Draft</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {regenerating ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="px-5 py-5">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {regenerating ? (
                <span className="text-gray-400 italic">Generating a new draft...</span>
              ) : (
                draft.content
              )}
            </pre>
          </div>
        </div>

        {/* UTM link preview — only for homeowner referral drafts */}
        {community.type === "homeowner" && draft.type === "referral" && (
          <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM-Tagged Referral Link</p>
            <code className="text-xs text-blue-700 break-all">
              tradeengage.com/ref/user123?utm_source={community.platform}&amp;utm_medium=group_post&amp;utm_campaign={community.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
