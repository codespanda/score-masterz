# Score Masterz

Cricket scoring for clubs and leagues: add teams and players, set up matches, score ball by ball on a phone, and follow live scorecards on the web.

## Layout

```
apps/
  web/        Next.js 16 (App Router, Tailwind 4): dashboard, scorecards, tournaments
  mobile/     Expo SDK 58 (Expo Router): live scoring, teams, match setup
packages/
  scoring/    Cricket rules engine — every score is derived from a list of ball events
  tokens/     Shared design tokens (colours, radii, spacing) from the design canvas
supabase/
  migrations/ Postgres schema, row-level security and realtime setup
```

npm workspaces + Turborepo. Both apps import `@score-masterz/scoring` and `@score-masterz/tokens` straight from TypeScript source.

## Getting started

Requires Node 20+.

```bash
npm install
npm test             # scoring engine tests
npm run dev:web      # http://localhost:3000
npm run dev:mobile   # Expo dev server — open in Expo Go or a simulator
```

### Database

Without Supabase env vars the apps still run: the Teams screens show a setup notice and the mobile Score tab runs in an unsaved demo mode.

Hosted Supabase project (no Docker needed):

1. In the project's **SQL Editor**, paste the whole of `supabase/migrations/20261018000000_initial_schema.sql` (nothing highlighted) and run it.
2. **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins** and click **Save changes**. Each device signs in anonymously so row-level security knows who owns each team and match.
3. Put the Project URL and publishable key in `apps/web/.env.local` (`NEXT_PUBLIC_SUPABASE_*`) and `apps/mobile/.env.local` (`EXPO_PUBLIC_SUPABASE_*`); see the `.env.example` files. Restart both dev servers.

Quick check that the schema and auth setting took effect (the `teams` call should return `200`, the setting `true`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$URL/rest/v1/teams?select=id&limit=1" -H "apikey: $KEY"
curl -s "$URL/auth/v1/settings" -H "apikey: $KEY" | grep -o '"anonymous_users":[a-z]*'
```

Local alternative (requires Docker): `npx supabase init`, `npx supabase start`, `npx supabase db reset`.

## Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds on every push to `main`: the web app as a static export at the site root, and the Expo app's web build under `/app`.

One-time setup in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key — it ends up in the public site, which is what it is for; never use the secret/service-role key).

Because the site is static, match pages use `/matches/view?id=…` instead of a dynamic path.

## How scoring works

The `balls` table holds one row per delivery. `summariseInnings()` in `packages/scoring` turns that list into the score, overs, batting and bowling figures, fall of wickets, the current over, strike and free-hit state. Undo is deleting the last ball; offline scoring only ever appends; live updates stream new rows over Supabase Realtime.

## Next steps

1. Wire teams and players screens to Supabase (auth: phone OTP / Google).
2. Match setup and toss flow on mobile; persist balls to `balls`.
3. Offline queue for balls (expo-sqlite), synced when back online.
4. Realtime web scorecard subscribed to `balls`.
5. Tournaments and points table (`pointsTable()` is ready in the engine).
6. Load Barlow Condensed / DM Sans on mobile, push notifications, EAS builds.
