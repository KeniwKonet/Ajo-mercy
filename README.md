# Ajo Mercy

A discovery, verification and coordination platform connecting verified Nigerian
business owners ("Alajos") with individuals and brands who want to back them.

**Ajo Mercy does not process, hold, custody, escrow or transfer support funds.**
That constraint shapes the whole architecture and is restated on every page and
in every email, because it is also the thing scammers will impersonate.

---

## Getting it running

```bash
npm install
cp .env.example .env.local        # then fill in the Supabase values
npm run db:push                   # apply migrations
npm run bootstrap                 # create the Super Admin (Woli Arole)
npm run db:seed                   # optional: demo applications to review
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm test` | Unit, contract and security tests |
| `npm run db:push` | Apply pending SQL migrations |
| `npm run db:status` | List pending migrations without applying |
| `npm run bootstrap` | Create or promote the Super Admin |
| `npm run db:seed` / `db:unseed` | Add or remove clearly-marked demo data |

Every environment variable is documented in `.env.example`. The app fails loudly
at startup if a required one is missing rather than misbehaving later.

---

## Architecture

**Next.js 15 (App Router) · TypeScript strict · Supabase Postgres + Auth +
Storage · Resend · Zod · Tailwind v4.**

### Authorisation is enforced three times

This is the core design decision. A role is never read from a JWT claim, a
cookie or a prop:

1. **Middleware** redirects signed-out visitors away from private routes. This
   is a convenience, not a boundary.
2. **Server-side guards** (`requireStaff`, `requirePermission`, `requireRoleOrThrow`)
   resolve the caller's role from the database on every request.
3. **Row Level Security** re-checks in Postgres. Even a bug in a page or a
   leaked anon key cannot read another user's application.

`tests/security.test.ts` asserts that every table created has RLS enabled and
that every `"use server"` module carries a guard.

### State machines are enforced in two places

Applications, profiles, campaigns, selections and confirmations all move through
explicit states. The legal edges are declared once in
`supabase/migrations/0002_*.sql` and mirrored in `src/lib/state-machine.ts`.

The database refuses an illegal transition with a trigger; the app uses the same
table to decide which buttons to render. `tests/state-machine.test.ts` fails the
build if the two ever drift, which is what stops the UI offering an action the
database would reject.

### Selection is not confirmation

The single most important rule in the product:

| Step | What the business is told |
|---|---|
| A supporter selects them | "Your business has been selected for consideration." Explicitly *not* a confirmation. |
| Admin shortlists | Nothing. Internal only. |
| Admin creates a support record | Nothing. Still internal. |
| **Admin confirms** | The congratulations email. |

Confirming requires the `confirmation.confirm` permission and typing `CONFIRM`
in a dialog. Announcing publicly is a *separate* permission the super admin holds
by default. Raising someone's hopes and quietly dropping them is the standard
failure of campaigns like this, and the schema is built to make it hard.

### Email is event-driven

Business logic never calls `sendEmail`. It emits a domain event
(`src/lib/events.ts`) and stops caring:

```ts
await emit({ type: "alajo.application_approved", applicationId, message });
```

One handler per event fans out to email, in-app notification and analytics.
`sendEmail` accepts no free-form HTML — only a template key from
`src/emails/templates.ts` — so nothing can go out unbranded or unlogged.

Every send is written to `email_events` **before** it is attempted, then updated
with the outcome. `/admin/emails` is therefore the truth about what a user did
or did not receive, and failures can be retried from there. Resend delivery
webhooks (`/api/webhooks/resend`) move rows to `delivered` or `bounced`.

All dynamic values in emails are HTML-escaped by default — applicants control
their business name, so `paragraph()` escapes and `paragraphRaw()` is the
explicit opt-out.

### Caching

Public pages (`/`, `/alajos`, `/alajos/[slug]`) read through a **cookie-free
anon client** so they stay statically cacheable with ISR. Reading cookies during
render would make every marketing page dynamic, which matters when a viral post
sends traffic all at once. The signed-in state resolves in a small client island
(`AccountNav`); it decides which link to show and grants no access.

### Abuse prevention

- Cloudflare Turnstile on signup, login, submission, selection and contact.
- Fixed-window rate limits in Postgres (`bump_rate_limit`) — no Redis dependency,
  and it works across serverless instances where in-memory limiters do not.
- IPs and device signals are stored **salted-hashed only**. Enough to notice one
  machine running many accounts (`admin_selection_risk`), deliberately not enough
  to track a person.
- Supporters may select as many businesses as they want. `selection_credits`
  is null by default, which means unlimited; setting a number on one row caps
  that account, which is the throttle for an abusive supporter.
- Selection counts are never published. This is a choice, not an oversight:
  publishing them turns support into a popularity contest.
- Uploads are checked for MIME type, size **and magic bytes**, and the storage
  policy requires objects to live under the uploader's own user id.

---

## Roles

| Role | Can |
|---|---|
| `super_admin` | Everything. Woli Arole. One seat, enforced by a unique index. |
| `admin` | Review, approve, reject, feature, suspend, manage campaigns, confirm support |
| `reviewer` | Read applications, request more information |
| `alajo` | Own application and public profile |
| `supporter` | Browse and select verified businesses |
| `brand` | Run campaigns and select businesses |

Permissions are capabilities, not roles (`src/lib/rbac.ts`). A role sets
defaults; individual accounts can be widened or narrowed via
`profiles.permissions`, so a trusted reviewer can be granted `alajo.approve`
without becoming an admin. Staff role changes are blocked by a database trigger
as well as the app.

---

## Data model

`supabase/migrations/` — four migrations, applied in order:

| File | Contents |
|---|---|
| `0001_core_schema.sql` | Enums, tables, constraints, indexes |
| `0002_functions_and_state_machines.sql` | Identity helpers, transition table and triggers, slugs, rate limiting, public stats view |
| `0003_rls_policies.sql` | RLS on every table, storage buckets and policies |
| `0004_operations.sql` | Atomic approval, atomic selection, dashboard counts, abuse view |
| `0005_unlimited_selections.sql` | Selections uncapped by default; per-account caps still enforced |

Multi-table workflows live in SQL functions so they are atomic: approving an
application publishes the profile and activates the account in one transaction,
or none of it happens.

---

## Design

Warm clay paper (`#FBF7F0`), forest green (`#0F3D2E`), terracotta (`#C9531F`),
ochre (`#E8B33A`). Fraunces (editorial serif) + Archivo (grotesque) + JetBrains
Mono (admin data). Corners are near-square and the recurring device is a hairline
rule, not a card — this is a publication that happens to have a database.

### Design explorations

Four genuinely different landing directions and four dashboard directions, each
with its own layout philosophy rather than a recoloured variant:

```
/designs/v1   Editorial — magazine masthead, margin index, pull quotes
/designs/v2   Movement — poster type, marquee, ink/paper panels
/designs/v3   Impact platform — left rail, strict grid, claim-and-mechanism
/designs/v4   Discovery — search-first, filters above the fold, dense grid

/admin/designs/v1   Command centre — console, monospace, queue only
/admin/designs/v2   Impact desk — editorial frame around the queues
/admin/designs/v3   Review workspace — inbox split pane
/admin/designs/v4   Hybrid — three bands: decide, work, numbers
```

A switcher at the bottom of each moves between them. **These routes 404 in
production** unless `ENABLE_DESIGN_ROUTES=true`; the admin ones also require a
signed-in staff account because they read live data.

The shipped `/` is a synthesis of v3 and v1; the shipped `/admin` is v4.

---

## Testing

```bash
npm test        # 72 tests
```

| File | Covers |
|---|---|
| `state-machine.test.ts` | TypeScript ↔ SQL transition parity; illegal shortcuts |
| `rbac.test.ts` | Permission resolution, overrides, suspended accounts |
| `validation.test.ts` | Nigerian phones, prose minimums, file sniffing, review decisions |
| `emails.test.ts` | Every template renders; escaping; consideration ≠ congratulations |
| `security.test.ts` | RLS on every table, storage scoping, no service key in client code |

`emails.test.ts` asserts that the "selected for consideration" email never
contains the word *congratulations*, and `security.test.ts` walks the source
tree to confirm the service-role key never reaches a client bundle.

### Journeys to verify against a live database

The automated tests cover logic and configuration. These need a real Supabase
project (`npm run db:seed` sets up the first four):

1. Alajo: register → verify → submit → review → approve → email → public profile
2. Alajo: submit → request info → email → update → resubmit → approve
3. Supporter: register → approve → discover → select → confirmation
4. Brand: register → approve → campaign → select → admin confirmation
5. Winner: selection → shortlist → support record → confirm → congratulations
6. Admin: login → dashboard → review → inspect documents → decide → audit log
7. Email: trigger each notification, confirm logging and retry
8. Security: attempt admin endpoints as a supporter; confirm 403 and RLS denial

---

## Deployment

Works on any Node host; Vercel needs no extra configuration.

Before going live:

- [ ] `npm run db:push` against the production database
- [ ] `npm run bootstrap`, then change the password and clear
      `SUPER_ADMIN_PASSWORD` from the environment
- [ ] Verify the sending domain in Resend and set `RESEND_API_KEY`
- [ ] Point the Resend webhook at `/api/webhooks/resend` and set
      `RESEND_WEBHOOK_SECRET`
- [ ] Set both Turnstile keys — without them verification is skipped and a
      warning is logged
- [ ] Set `HASH_SALT` to 32 random bytes and never rotate it casually; it
      invalidates abuse-detection history
- [ ] Leave `ENABLE_DESIGN_ROUTES` unset
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is the real origin — email links use it

---

## Content policy

Nothing on this platform is invented. No fabricated statistics, testimonials,
brand partners, winners or business owners. Impact figures are counted from the
database and render as a dash when the value is zero, because an honest empty
state is better than a hopeful one.

Demo data from `npm run db:seed` uses the reserved `.test` domain and carries a
`[DEMO SEED]` marker in internal fields, so it can never be mistaken for real
content. It is created in `submitted` state, never pre-approved, so the review
flow still has to be exercised by hand.
