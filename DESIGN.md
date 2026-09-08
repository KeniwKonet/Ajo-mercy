# Ajo Mercy — design system

The interface implements `design_handoff_dark_widget_redesign/`. Where this
document and that handoff disagree, the handoff wins.

## The idea

A warm cream page carrying near-black widgets. Nothing is a bordered box and
nothing floats: a card is a solid dark shape with a large radius, and it either
sits on the page or it does not. There are no shadows anywhere in the system —
every shadow token resolves to `none`, deliberately, so a card cannot be lifted
off the page by accident.

Neon does the pointing. Lime marks what is done or available, orange marks what
is still moving, ochre marks what is waiting on a person.

## Colour

| Token | Value | Role |
| --- | --- | --- |
| `--color-page-bg` | `#F3EEE3` | The page. Warm, not white. |
| `--color-widget-black` | `#0B120E` | A widget. |
| `--color-widget-black-2` | `#10180F` | A tile inside a widget, and outlines on the cream page. |
| `--color-panel-white` | `#FFFFFF` | The light panel, used where a block is read rather than scanned. |
| `--color-lime` | `#C6E24C` | Verified, complete, available. |
| `--color-orange` | `#FF6B3D` | In progress, needs attention. |
| `--color-ochre` | `#E8B33A` | Waiting on a person. |
| `--color-ivory-text` | `#F5F1E8` | Text on a widget. |
| `--color-muted-on-black` | `#8A9186` | Secondary text on a widget. |

### The rule that matters most

Neon is a *background* colour. As a text colour on the cream page, lime measures
about 1.3:1 and orange about 2.4:1 — both invisible. So `text-lime` and
`text-orange` resolve to ink-side twins (`--color-lime-ink`, `--color-orange-ink`)
by default, and the dark surfaces restore the real neon:

```css
.text-lime { color: var(--color-lime-ink); }
.widget .text-lime { color: var(--color-lime); }
```

These surface-aware rules sit **outside the layer system** at the bottom of
`globals.css`. Tailwind v4 puts utilities in `@layer utilities`, which outranks
`@layer components` no matter what the specificity is, so a rule that needs to
beat a utility cannot live in a layer at all. This is load-bearing; moving that
block into a layer silently breaks readability across the whole site.

The same block also remaps `text-ink`, `text-ink-soft`, headings and hairlines
when they appear inside a widget. That is why components are written with ink
roles rather than picking a colour per surface: the cascade decides, and a
component can be dropped on either ground.

## Type

Two faces, both from the handoff. **Manrope** is everything, including display
sizes — `.font-display` is Manrope 800 with display tracking, not a serif.
**JetBrains Mono** is only for machine identifiers: event names, table names,
digests, slugs. A small uppercase label is bold Manrope, never mono.

There is no eyebrow above a title anywhere. Small uppercase labels exist only
*inside* a widget, naming the tile they head.

## Shape

Radii run 6 / 10 / 16 / 24 / 32 / 40 / full. A widget is 24–32px; a tile inside
one is 10–16px; a pill is full.

## Images

Businesses without a photograph get generated cover art from
`src/lib/business-art.ts` — abstract shapes in the brand palette, seeded by the
slug so a business always draws the same art. This is deliberate: a stock
photograph of a real person placed on a named business would be inventing that
business owner, which the product's own rules forbid. The art is
non-representational so it cannot be mistaken for a photograph.

## What the visual layer must never do

Selection is not confirmation, and the interface has to keep saying so. A
supporter choosing a business puts it under consideration; only a deliberate
admin confirmation makes anything real. Ochre and orange carry "under
consideration"; lime is reserved for what a person has actually confirmed.

Selection counts are never published. The platform never holds, escrows or
transfers money, and no surface may imply otherwise.
