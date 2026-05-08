# Database Migrations

Migrations live in `supabase/migrations/` and are numbered sequentially.
Run them in order against your Supabase project.

## Running migrations

### Option A — Supabase CLI (recommended)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The CLI picks up all files in `supabase/migrations/` and applies any that
haven't run yet (tracked in `supabase_migrations` in your database).

### Option B — Supabase Dashboard SQL editor

Open each file in order and paste + run it in the SQL editor:
1. `0001_create_helpers.sql`
2. `0002_create_user_profiles.sql`
3. `0003_create_fb_groups.sql`
4. `0004_create_subreddits.sql`
5. `0005_create_community_memberships.sql`
6. `0006_create_community_drafts.sql`
7. `0007_create_post_history.sql`
8. `0008_create_inspiration_posts.sql`
9. `0009_create_scrape_runs.sql`

## Schema overview

```
auth.users  (Supabase managed)
    │
    ├── user_profiles          trade, location, referral link, company info
    │
    ├── community_memberships  joined / pending / not_interested per community
    │
    ├── community_drafts       AI-generated intro / value / engagement drafts
    │
    └── post_history           posts marked as published or pending approval

fb_groups                      Facebook group directory (admin-populated)
subreddits                     Subreddit directory (admin-populated)
inspiration_posts              Scraped posts used as style examples
scrape_runs                    In-flight Apify actor runs
```

## Key design decisions

**community_id convention** — Instead of a unified communities table,
`community_memberships`, `community_drafts`, `post_history`, and
`inspiration_posts` all share the same `community_id` TEXT format:
- Facebook: `fb-{group_id}` e.g. `fb-123456789`
- Reddit: `reddit-{name}` e.g. `reddit-HomeImprovement`

This mirrors the existing localStorage convention, making the code migration
straightforward.

**Row-level security** — Every table has RLS enabled. User-owned tables
(memberships, drafts, history, profile) are locked to `auth.uid() = user_id`.
Shared tables (fb_groups, subreddits, inspiration_posts) are readable by
all authenticated users; writes use the service-role key from API routes.

**Upsert semantics** — `community_drafts` has a `UNIQUE (user_id, community_id)`
constraint. Generating new posts does `INSERT ... ON CONFLICT DO UPDATE`.
`post_history` has a `UNIQUE (user_id, community_id, type)` constraint,
matching the one-entry-per-post-type behaviour of `upsertHistoryItem()`.

## Environment variables needed

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only, never exposed to client
```

## Adding a new migration

```bash
npx supabase migration new <descriptive_name>
# creates supabase/migrations/<timestamp>_<descriptive_name>.sql
```

Or manually create the next numbered file following the `0001_` convention.
