/**
 * Cover art for a business that has not uploaded a photograph.
 *
 * Every image slot in the design needs to hold something, but the alternative
 * to a real photograph is not a stock photograph. Putting a picture of a real
 * stranger on a named business would be inventing that business owner, so
 * these are non-representational: concentric arcs and a diagonal band in the
 * brand palette, seeded by the business slug so a given business always draws
 * the same art.
 *
 * They are deliberately abstract and deliberately quiet. The art sits behind a
 * monogram and next to a business name, so it reads as texture rather than as
 * a picture, and nobody can mistake one for a photograph of a place or person.
 *
 * Two shapes, because one drawing cannot serve both slots. A card is roughly
 * square; the profile cover is a 4:1 banner. Scaling the square composition to
 * cover a banner enlarges it about fourfold and crops it to a thin strip
 * through the middle, which turns a small ring into a giant arc and the
 * accent band into a wedge across the corner. So the banner gets its own wide
 * composition at close to the aspect it will actually be drawn at.
 */

/** FNV-1a. Small, stable, and enough to spread slugs across the palette. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* Art is drawn on the near-black ground the widgets already use, so a
   generated cover sits in the layout the same way a photograph does. */
const GROUND = "#0B120E";
const INKS = ["#C6E24C", "#FF6B3D", "#E8B33A", "#2F7D5B", "#F5F1E8"];

export type ArtShape = "square" | "banner";

export function businessArt(seed: string, shape: ArtShape = "square"): string {
  const h = hash(seed || "ajo");
  if (shape === "banner") return bannerArt(h);
  const accent = INKS[h % INKS.length];
  const second = INKS[(h >> 6) % INKS.length];
  const rot = (h >> 3) % 180;
  const cx = 34 + ((h >> 8) % 32);
  const cy = 32 + ((h >> 14) % 36);
  const rings = 3 + ((h >> 20) % 3);
  const bandY = 58 + ((h >> 11) % 26);
  const bandH = 3 + ((h >> 17) % 5);

  // Rings rather than filled discs: thin strokes keep the plate dark, so a
  // name set over the top stays readable and a wall of these stays calm.
  const arcs = Array.from({ length: rings }, (_, i) => {
    const r = 12 + i * (7 + (h % 5));
    const op = (0.5 - i * 0.09).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="1.6" opacity="${op}"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
<rect width="100" height="100" fill="${GROUND}"/>
<g transform="rotate(${rot} 50 50)">
${arcs}
<circle cx="${cx}" cy="${cy}" r="6" fill="${accent}" opacity="0.85"/>
<rect x="-20" y="${bandY}" width="140" height="${bandH}" fill="${second}" opacity="0.4"/>
</g>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ""))}`;
}

/**
 * The wide cover. Small motifs spread along the band rather than one large
 * one, so nothing has to be scaled up to fill the width, and everything stays
 * far enough from the middle that the business name over the top still reads.
 */
function bannerArt(h: number): string {
  const accent = INKS[h % INKS.length];
  const second = INKS[(h >> 6) % INKS.length];

  // Five clusters across the band, each nudged by its own slice of the hash so
  // two businesses do not draw the same row.
  const motifs = Array.from({ length: 5 }, (_, i) => {
    const shift = (h >> (i * 3 + 2)) % 24;
    const cx = 30 + i * 85 + shift;
    const cy = 34 + ((h >> (i * 2 + 5)) % 34);
    const r = 9 + ((h >> (i + 7)) % 11);
    const ink = i % 2 === 0 ? accent : second;
    return (
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="1.5" opacity="0.32"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${(r / 3).toFixed(1)}" fill="${ink}" opacity="0.4"/>`
    );
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid slice">
<rect width="400" height="100" fill="${GROUND}"/>
${motifs}
<rect x="0" y="${72 + (h % 14)}" width="400" height="1.5" fill="${accent}" opacity="0.25"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ""))}`;
}
