# Ajo Mercy — design system

The product has one idea, and the interface exists to make it legible:

**A business has a story → Ajo Mercy verifies it → people discover it → people
can choose to back it → the story moves forward.**

Every decision below serves that sequence. If something here stops serving it,
change it.

---

## Typography

Two voices, and the contrast between them is the identity.

| Face | Role | Where |
|---|---|---|
| **Manrope** | The product | Navigation, buttons, body, forms, labels, cards, tables, dashboards, admin, status |
| **Instrument Serif** | The editorial voice | Hero headlines, major section statements, the lead business feature, pull quotes |
| **JetBrains Mono** | Technical metadata only | Reference numbers, ids, timestamps, audit entries |

**Manrope is the default for every heading.** The serif is opt-in, through
`.font-display` or `<Display>`. This is the rule that keeps it working: if
every heading were Instrument Serif, none of them would read as editorial.

Instrument Serif ships one weight. Emphasis comes from size and the italic,
never from a bolder cut.

Mono never carries a sentence. If a monospace string is a phrase rather than an
identifier, it is in the wrong face.

### Weights

400 body · 500 supporting emphasis · 600 labels and buttons · 700 headings ·
800 reserved for rare display moments.

### Scale

Body starts at 16px, not 15. Line height loosens as size drops and tightens as
it grows. Tokens: `--text-2xs` (12) through `--text-7xl` (104).

---

## Colour

The brand palette is unchanged. What changed is the discipline about where each
colour is allowed.

| Token | Hex | Use |
|---|---|---|
| Warm clay | `#FBF7F0` | The canvas. Most of the product is this colour |
| Forest | `#0F3D2E` | Major surfaces, the trust band, primary buttons, confirmed states |
| Terracotta | `#C9531F` | Actions and attention. Never a background for large areas |
| Ochre | `#E8B33A` | Warmth, featured markers, selected-but-not-confirmed |
| Ink | `#181410` | Text |

Supporting: `paper-deep`, `paper-warm`, `card`, `ink-soft`, `ink-faint`,
`rule`, `rule-strong`, plus `danger` / `success` / `info` and their washes.

**Not every section is coloured.** A page is warm clay with one or two moments
of forest. Gradients are not used anywhere.

---

## Shape and depth

Radii are softened from near-square, but only just: `2 / 4 / 6 / 10 / 14px`.
Nothing is fully rounded except a status dot. A 16px+ pill reads as a template.

Shadows are for things that genuinely float, which means menus and dialogs.
Cards do not float; they sit on the page and are separated by hairlines.

---

## Motion

Every animation reports a state change. Nothing moves decoratively.

- Validation messages drop into place; the confirmation tick is slower and
  gentler, because good news is not urgent
- Menus unfold from the edge they are anchored to
- Buttons take a 1px press, and gain a travelling bar while loading
- Sections reveal as they are scrolled to

All of it is disabled under `prefers-reduced-motion`.

**A reveal must never be the reason content is missing.** `<Reveal>` renders
visible and only arms itself after mount, and only when the element is below
the fold. Hiding first and revealing on scroll leaves content invisible forever
in a print, a screenshot, or any context where the callback never fires.

---

## The four stages

`DISCOVER → VERIFY → BACK → AMPLIFY` is drawn, not just described:
`JourneyStrip` on the homepage and `/how-it-works`, `JourneyDiagram` in the
hero. The diagram is built from the product's own objects so it still reads
with the words removed.

---

## Trust

Verification is the central claim, so it gets a real treatment.

- `VerifiedMark` — compact, for cards and rows
- `VerificationPanel` — expanded, for a profile. **Lists only checks the review
  team actually performs.** If a check is added or dropped, this list changes

The panel says what verification is *not*: not a recommendation, not a rating,
not a promise about what happens next.

---

## Status

One vocabulary, used everywhere: draft, submitted, under review, needs
information, approved, not approved, under consideration, support confirmed,
announced, suspended.

Two rules:

1. **Never state through colour alone.** Every badge carries a dot and a word
   as well as a hue.
2. **Every status has a meaning sentence.** A word alone makes someone guess.
   `statusMeaning()` is the single source for that sentence.

**Under consideration and support confirmed are deliberately different
states with deliberately different words.** Choosing a business is not
supporting it, and a business is told nothing definite until a person confirms.
This is the product's most important promise and the copy protects it.

---

## Copy

- No em dashes in interface copy
- Concrete over enthusiastic. "8 more words to go" beats "Almost there!"
- Never claim a number, testimonial, partner or outcome that is not in the
  database. A dash where nothing has happened yet
- Never financial language that implies the platform moves money. No donate,
  pay, deposit, invest, transfer
- Empty states say what happened, what it means, and what to do next
- An error says what is still true, not only what broke

---

## Components

`src/components/ui/` — `primitives.tsx` (Button, Container, Alert, EmptyState,
Stat, DataTable, Skeleton), `trust.tsx` (VerifiedMark, VerificationPanel,
StatusBadge, StatusExplainer, PageHeader, SectionHeader, ErrorState),
`form.tsx` (Field with live validation, Input, Textarea, SelectField),
`select-menu.tsx`, `dialog.tsx`, `reveal.tsx`, `loading-skeletons.tsx`,
`draft-notice.tsx`.

`src/components/site/` — `business-card.tsx` (BusinessCard, BusinessFeature),
`journey.tsx` (JourneyStrip, JourneyDiagram), header, footer, account nav.

Before building a new component, check whether one of these already does the
job. The failure mode to avoid is three slightly different cards on three
different pages.

---

## What the UI must enforce

These are not styling choices. Breaking one is a product bug.

1. Selection counts are **never** published. No leaderboards
2. Private application fields — identity documents, date of birth, home
   address, personal phone — **never** appear on a public surface
3. Selecting is not confirming, and the interface must not blur them
4. Nothing implies Ajo Mercy holds or moves money
5. Registering guarantees nothing, and pages that invite registration say so
6. Design routes stay behind `ENABLE_DESIGN_ROUTES` and 404 in production
