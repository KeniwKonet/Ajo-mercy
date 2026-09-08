# Handoff: Ajo Mercy — Dark Widget Redesign

## Overview
A full visual redesign of the Ajo Mercy product (Next.js 15 + Tailwind v4 + Supabase repo) into a dark, neon-accented "widget" aesthetic — black rounded stat cards, a floating pill navbar, white content panels for tables/lists, and bold Manrope numerals. It covers the full IA: public marketing pages, auth, all three signed-in dashboards (Alajo, Supporter, Brand), and the admin console.

## About the Design Files
The files in this bundle (`dark-widget-redesign.html`, `dark-editorial-v1.html`) are **HTML/CSS design references** built to show layout, color, type and spacing exactly — not production code to copy directly. The task is to **recreate these designs inside the existing Ajo Mercy Next.js codebase**, using its existing component library (`src/components/ui/*`, `src/components/site/*`, `src/components/dashboard/*`), Tailwind v4 `@theme` tokens in `src/app/globals.css`, and the same data-fetching/server-action/RLS logic already in place. Do not replace business logic, state machines, auth guards, or permission checks — only the visual layer changes.

`dark-widget-redesign.html` is the version to implement. `dark-editorial-v1.html` is an earlier direction kept for reference only — ignore it unless asked to compare.

## Fidelity
**High-fidelity.** Exact colors, radii, spacing and type are given below and in the HTML. Recreate pixel-for-pixel using Tailwind arbitrary values or new `@theme` tokens — do not approximate.

## Design tokens (replace/extend the existing `@theme` block in `src/app/globals.css`)

Keep the existing font stack (Manrope / Instrument Serif / JetBrains Mono) and the existing brand hexes as source values — this redesign reinterprets them, it doesn't discard them.

| Token | Value | Use |
|---|---|---|
| `--color-page-bg` | `#F3EEE3` | Page background (was `--color-paper`) |
| `--color-widget-black` | `#0B120E` | All dark "widget" cards — forest green pushed to near-black |
| `--color-widget-black-2` | `#10180F` | Nested tiles inside a black widget (stat sub-tiles, inputs) |
| `--color-panel-white` | `#FFFFFF` | Content panels inside black widgets (tables, lists) |
| `--color-lime` | `#C6E24C` | Primary neon accent — CTAs, progress bars, verified badges (derived from forest hue, brightened) |
| `--color-orange` | `#FF6B3D` | Secondary neon accent — CTA blocks, alert bars (derived from terracotta, brightened) |
| `--color-ochre-accent` | `#E8B33A` | Tertiary accent — "under review" states (existing brand ochre, unchanged) |
| `--color-ivory-text` | `#F5F1E8` | Primary text on black widgets |
| `--color-muted-on-black` | `#8A9186` | Secondary text on black widgets |
| `--color-muted-on-white` | `#8c8378` | Secondary text on white panels (existing `--color-ink-faint`) |
| `--color-ink` | `#181410` | Primary text on white/page background (existing token, unchanged) |

Radii: widgets `24–32px`, nested tiles `10–18px`, pills/buttons `999px` (full). Shadows: none — depth comes from the black/white/page contrast, not drop shadows.

Status chip colors (small pills, used everywhere a state is shown):
- Under review / progress: bg `#fdf4dd` text `#7a5a09` (on white) or bg `#E8B33A` text `#10180F` (on black)
- Needs info / attention: bg `#fbf3e8` text `#a33f14` (on white) or bg `#FF6B3D` text `#10180F` (on black)
- Approved / confirmed / positive: bg `#eaf8d5` text `#4e6e14` (on white) or bg `#C6E24C` text `#10180F` (on black)
- Neutral/shortlisted: bg `#f5f1e8` text `#8c8378`

## Screens / Views
Each is one full-width section in the HTML file, in this order top to bottom. All use the same 1400px max-width container, 32px side padding, and the floating pill nav pattern at the top of the page.

1. **Shared nav** — floating black pill (`#0B120E`, `border-radius:999px`, `padding:8px`), logo left, nav links center (active link = white pill `#F5F1E8` on black bg, `color:#10180F`), search icon + lime "Join Ajo Mercy" pill + avatar circle right.
2. **Homepage hero** — big bold Manrope headline (64px/800 weight) with one phrase wrapped in a rounded-pill outline containing a small lime checkmark badge; below it a widget stack: one wide black card (business preview with lime "seeking ₦X" bar and avatar stack + white "Back this business" pill), then a 2-up row (photo widget + "this week" stat widget with orange progress bar). Below that, a 4-up row of small black cards for the DISCOVER/VERIFY/BACK/AMPLIFY stages, each labelled with a colored eyebrow (lime/orange/ochre/lime) matching its stage.
3. **Discovery** — one wide black search widget (icon + placeholder text + pill category filters, active = lime). Below: a 2-column layout — one large black "feature" card (photo + verified pill + name/story/CTA) beside a 2×2 grid of smaller black cards, with the last cell replaced by a full-width orange "Show all N businesses" CTA block.
4. **Business profile** — 3 columns: photo widget, a wide black identity card (verified pill, name, category/location, story excerpt, tab row, two CTA pills), and a narrow column with a black verification-checklist widget plus an orange "Choosing is not confirming" callout block.
5. **How it works + Onboarding** — 2-column: left a black card with a numbered step list (each number in a colored pill matching its DISCOVER/VERIFY/BACK/AMPLIFY stage color); right a black onboarding-form widget with a 5-segment lime progress bar, step label, two input tiles (`#10180F` bg), and a lime "Next" pill.
6. **About + For Brands** — 2 black cards side by side: About (headline + "who runs it" nested tile), For Brands (headline + 2×2 stat tiles + lime CTA pill).
7. **Auth** — 2 black cards side by side: Sign in (email/password input tiles + lime submit pill) and Create account (3 role-choice tiles, first one highlighted lime, + lime submit pill).
8. **Alajo dashboard** — sidebar (220px black card, nav items, active = lime pill) + main column: welcome header card with status pill, 3-up stat row, white "Support" panel.
9. **Supporter dashboard** — same sidebar pattern + 3-up stat row (Selections allowed/Used/Saved) + white "My selections" list panel with status pills per row.
10. **Brand dashboard** — same sidebar pattern + 3-up stat row (Campaigns/Selected/Budget) + white "Campaigns" list panel with a black "+ Create campaign" pill and status pills per row.
11. **Admin dashboard** — one large black widget: header + "+ New review" pill, 4-up stat row (each with a colored mini progress bar: lime/ochre/lime/orange), then a white panel with a filter-tab row and an applications table (status as colored pills).
12. **Admin review workspace** — 3 columns: queue list (black card, status pills), profile card (photo + name/category), decision card (checklist + "Request info" outline pill + lime "Approve" pill).
13. **Admin: campaigns / support / email / team** — 4 black cards in a 2×2 grid, each a distinct list widget (campaigns with status pills, pending confirmations with a lime "Confirm" pill, email delivery log in JetBrains Mono, team member row with an avatar + lime "Full access" pill).
14. **Admin: supporters / brands / audit** — 3 black cards: supporter registrations list, brand registrations list, audit log (JetBrains Mono timestamps).

## Interactions & Behavior
These are static mockups — no JS behavior is implemented. Recreate standard behavior for each pattern:
- Nav links: active state = white pill background; hover on inactive = slight opacity/underline.
- All pill buttons: existing `.press` pattern from `primitives.tsx` (1px translateY on press) still applies.
- Status pills: purely presentational, driven by the same status vocabulary already in `src/components/ui/trust.tsx` (`StatusBadge`/`StatusChip`) — reskin those components' color maps to the new palette rather than writing new ones.
- Image placeholders (`<image-slot>` in the mockup) map to the existing `next/image` usage in `BusinessCard`, `HeroComposition`, profile galleries, etc. — no new image component needed.
- Progress bars (application completeness, stat widgets): simple width-percentage divs, no animation required unless the team wants a fill transition.

## State Management
No new state. Every screen maps 1:1 to an existing page/component already reading from Supabase — see Files below. The redesign only changes the presentational layer (`className`s / inline styles), not data fetching, server actions, or the state machine.

## Assets
No real photography — all imagery is a labelled placeholder (`business photo`, `owner photo`, etc.) per Ajo Mercy's content policy (no fabricated business photos). Use real uploaded media via the existing `publicMediaUrl()` helper once available; fall back to the existing monogram treatment in `BusinessPhoto` for missing images, restyled to the new dark palette (`#0B120E` bg, `#F5F1E8` monogram text).

## Files
- `dark-widget-redesign.html` — the design to implement (all 14 screens above, in canvas order).
- `dark-editorial-v1.html` — superseded direction, reference only.

## Mapping to the existing codebase
Reskin these existing files/components rather than creating new ones:
- Tokens: `src/app/globals.css` (`@theme` block), `DESIGN.md` (update prose to describe the new dark widget system once implemented).
- Primitives: `src/components/ui/primitives.tsx` (Button, Container, Stat, StatusChip, DataTable, EmptyState), `src/components/ui/trust.tsx` (StatusBadge, VerificationPanel, PageHeader).
- Site: `src/components/site/site-header.tsx` (→ floating pill nav), `hero-composition.tsx`, `journey.tsx`, `business-card.tsx`.
- Dashboard shell: `src/components/dashboard/shell.tsx` (`DashboardShell`, `DashboardPage`) — becomes the black sidebar + white/black content pattern.
- Pages: `src/app/(public)/*`, `src/app/(auth)/*`, `src/app/dashboard/*`, `src/app/admin/(console)/*` — layout structure is unchanged; only the visual treatment described above changes.
