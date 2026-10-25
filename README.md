# Humor Admin

An admin area for the Humor Project database, built with Next.js 15 (App Router) and Supabase. Users sign in with Google, and only accounts with `profiles.is_superadmin = true` get in.

| Area | Access | Route |
|---|---|---|
| **The Laugh Report** (statistics) | read | `/admin` |
| Users / profiles | read | `/admin/users`, `/admin/users/[id]` |
| AI media (`memes`) | **create / read / update / delete** | `/admin/memes`, `/new`, `/[id]` |
| Captions | create / read / update / delete | `/admin/captions`, `/new`, `/[id]` |
| Upvotes / downvotes / ratings | read | `/admin/votes` |

## Setup

```bash
npm install
cp .env.example .env.local      # fill in URL, anon key, service-role key
```

Before using the admin pages, run `sql/align-admin-schema.sql` in the Supabase SQL Editor as `postgres`. It adds only `profiles.is_superadmin` (default false) and protects the flag from user self-promotion; it does not rename or remove any existing table or column. The other mappings in `schema.config.json` match the supplied schema (`created_at`, `user_id`, and `vote`). Then run `npm run check-schema` to verify the mapping.

After configuring Google OAuth and bootstrapping your first superadmin, run `npm run dev`.

**Google login.** In the Supabase dashboard, go to Authentication → Providers → Google, enable it, and paste your Google OAuth client ID and secret. Then add `http://localhost:3000/auth/callback` (and your Vercel URL) under Authentication → URL Configuration → Redirect URLs.

**Column names.** All table and column names live in `schema.config.json`. If `check-schema` flags anything, edit that file. No code changes are needed.

## How the login wall works

1. **`middleware.ts`** runs on every request except static assets. With no session it redirects to `/login`. With a session but no superadmin flag it redirects to `/unauthorized`. Only `/login`, `/auth/*` and `/unauthorized` are public, and none of them read app data.
2. **`requireSuperadmin()`** (`lib/auth.ts`) runs again in the admin layout, in every page and in **every server action**. Server actions are public POST endpoints, so they can't rely on the page that rendered them.
3. **The check fails closed.** A missing row, a query error or any value other than `true` means no access.
4. **The service-role key stays on the server.** It is only used after the check passes (`import "server-only"`), and it never has a `NEXT_PUBLIC_` prefix.
5. **Sessions are verified with `supabase.auth.getUser()`**, which validates the JWT with Supabase Auth. It does not trust the cookie on its own, which is what `getSession()` would do.

## "Won't I lock myself out?" — the bootstrap problem

Yes. The app only lets superadmins in, so it can't be used to create the first superadmin. That flag has to be set **out-of-band**, with a credential that has more privilege than the app. I have dashboard and service-role access, so there are two ways:

**Option A: SQL editor** (`sql/bootstrap-superadmin.sql`)
1. Sign in through the app once. You'll land on `/unauthorized`, but your `auth.users` and `profiles` rows now exist.
2. First run `sql/align-admin-schema.sql` if you have not already. Then run `sql/bootstrap-superadmin.sql`, replacing its example email with the Google account you just used. SQL Editor runs as `postgres`, so RLS doesn't apply.

**Option B: CLI script with the service-role key**
```bash
npm run make-superadmin -- you@gmail.com     # --revoke to undo
```

Either way it's a one-time manual step, and nothing in the deployed app can grant admin. Once you're in, add more admins the same way.

If a service-role key has ever been pasted into chat, committed, or otherwise shared, rotate it in Supabase before running the CLI script, then update the local/server environment variable. Never put it in a `NEXT_PUBLIC_` variable.

**Watch out for:** if your RLS policies let users update or insert their own profile row, they must not be able to set `is_superadmin = true`. The migration installs a trigger that blocks that flag from ordinary authenticated users.

## Statistics on the dashboard

- **Laugh rate gauge:** the overall share of votes that are upvotes.
- **30-day pulse:** votes and captions per day.
- **Punchcard:** when people vote, by weekday and hour.
- **Hall of Fame:** best captions ranked by the **Wilson score lower bound**, so 40 up out of 50 beats 1 up out of 1.
- **Most divisive:** captions with lots of votes and a near-even split (Reddit's controversy formula).
- **Does brevity win?** Upvote share grouped by caption word count.
- **Most-captioned memes** and the **funniest templates** (memes whose captions score best).
- **Top comedians**, the **critics**, the toughest crowd and the easiest laugh.
- **Fun facts:** the busiest day ever, ghosted captions, lurkers, and people voting on their own captions.

## Deploy

Push to GitHub, import the repo in Vercel, add the three env vars, and add the production `/auth/callback` URL to Supabase's redirect list.
