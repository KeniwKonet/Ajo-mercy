/**
 * Layout fault check: horizontal overflow, invisible controls, and content
 * hidden underneath something else.
 *
 * A page that is wider than the phone it is on does not look broken in the
 * obvious way. Chrome zooms the whole page out to fit, so every heading and
 * button simply renders smaller, with dead space down one side, and it reads
 * as a styling quirk rather than as a bug. That is how the support panel on
 * the business profile sat at a fixed 473px for as long as it did.
 *
 * So this measures rather than eyeballs: it fails when document.scrollWidth
 * exceeds the viewport, and it names the element responsible.
 *
 * Deliberately does NOT use Playwright's isMobile, because that enables the
 * shrink-to-fit behaviour that hides the very thing being tested.
 *
 * The second check catches a control whose background matches the surface
 * behind it, with no border to separate them. A contrast sweep will not find
 * this: the button's *text* is perfectly readable, it is the affordance that
 * has vanished. That is how "Register to support" — the primary action for
 * every signed-out visitor on a business profile — spent a release rendering
 * as bare text, because it kept a dark fill from when the card was white.
 *
 * The third check catches content covered by an element that is not its own
 * ancestor. CSS paints positioned elements above non-positioned ones whatever
 * the DOM order, so a card pulled up over a hero with a negative margin sits
 * *under* that hero unless it is positioned too. On the business profile that
 * hid the Verified chip, sliced the support heading in half, and left the
 * overlapped strip unclickable.
 *
 *   node scripts/check-overflow.mjs [baseUrl]
 *
 * Needs Playwright, which is not a dependency of this project. See below.
 */
/* Playwright is not a dependency of this project: it pulls a browser download
   that most contributors do not need. Resolve it wherever it happens to be
   installed and say so plainly when it is not. */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    [
      "This check needs Playwright.",
      "  npm i -D playwright && npx playwright install chromium",
      "or run it with NODE_PATH pointing at an existing install.",
    ].join("\n"),
  );
  process.exit(2);
}

const BASE = process.argv[2] ?? "http://localhost:3111";

/* 320px is the narrowest screen still in real use. 1440 is included because
   overlap faults often only appear in the wide layout. */
const WIDTHS = [320, 390, 1440];

const PAGES = [
  "/",
  "/alajos",
  "/alajos/iya-tola-frozen-foods",
  "/how-it-works",
  "/about",
  "/become-an-alajo",
  "/brands",
  "/support",
  "/impact",
  "/contact",
  "/login",
  "/register",
];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });

  for (const path of PAGES) {
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const win = window.innerWidth;
        const doc = document.documentElement.scrollWidth;
        if (doc <= win + 1) return { win, doc, culprits: [] };

        const clips = (el) => /auto|scroll|hidden|clip/.test(getComputedStyle(el).overflowX);
        const culprits = [];

        for (const el of document.querySelectorAll("body *")) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.right <= win + 1) continue;
          // An element inside a scroll container is contained, not overflowing.
          if (clips(el)) continue;
          let parent = el.parentElement;
          let contained = false;
          while (parent && parent !== document.body) {
            if (clips(parent)) { contained = true; break; }
            parent = parent.parentElement;
          }
          if (contained) continue;
          const cls = typeof el.className === "string" ? el.className : "";
          culprits.push(`${el.tagName.toLowerCase()}.${cls.trim().slice(0, 60)} (right ${Math.round(box.right)})`);
        }
        return { win, doc, culprits: [...new Set(culprits)].slice(0, 4) };
      });

      const invisible = await page.evaluate(() => {
        const found = [];
        const solid = (c) => c && c !== "transparent" && !c.startsWith("rgba(0, 0, 0, 0)");
        const surfaceBehind = (el) => {
          let n = el.parentElement;
          while (n) {
            const bg = getComputedStyle(n).backgroundColor;
            if (solid(bg)) return bg;
            n = n.parentElement;
          }
          return null;
        };
        for (const el of document.querySelectorAll("a, button")) {
          const cs = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          if (box.width < 40 || box.height < 20) continue;
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          if (!solid(cs.backgroundColor)) continue;
          // A border or an outline is a perfectly good affordance on its own.
          if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0) continue;
          if (cs.backgroundColor === surfaceBehind(el)) {
            const cls = typeof el.className === "string" ? el.className : "";
            found.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}" fill ${cs.backgroundColor} = its surface [${cls.slice(0, 50)}]`);
          }
        }
        return [...new Set(found)];
      });

      const obscured = await page.evaluate(() => {
        /* Test the cause rather than the symptom.
         *
         * Probing pixels for covered content sounds right and is not: sampling
         * a corner catches whatever sibling abuts the element, sampling the
         * centre misses a strip covered along one edge, and neither knows
         * which overlaps were intended. Both attempts at it produced false
         * positives and still missed the real fault.
         *
         * The mechanism is exact, so test that instead. An element pulled up
         * by a negative margin overlaps whatever is above it. If that element
         * is static and the thing it overlaps is positioned, CSS paints the
         * positioned one on top whatever the DOM order, and the overlap is
         * hidden. Deterministic, and no pixel sampling. */
        const found = [];
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          const marginTop = parseFloat(cs.marginTop);
          if (!(marginTop < -1)) continue;
          if (cs.position !== "static") continue;

          const above = el.previousElementSibling ?? el.parentElement?.previousElementSibling;
          if (!above) continue;
          const abovePos = getComputedStyle(above).position;
          if (abovePos === "static") continue;

          const cls = typeof el.className === "string" ? el.className : "";
          const aboveCls = typeof above.className === "string" ? above.className : "";
          found.push(
            `${el.tagName.toLowerCase()}.${cls.trim().slice(0, 40)} is pulled up ${Math.abs(Math.round(marginTop))}px ` +
              `while static, under positioned ${above.tagName.toLowerCase()}.${aboveCls.trim().slice(0, 30)}`,
          );
        }
        return [...new Set(found)].slice(0, 5);
      });

      if (obscured.length) {
        failures += 1;
        console.log(`FAIL  ${String(width).padStart(3)}px  ${path}  overlap hidden behind what it overlaps`);
        for (const c of obscured) console.log(`        ${c}`);
      }

      if (invisible.length) {
        failures += 1;
        console.log(`FAIL  ${String(width).padStart(3)}px  ${path}  invisible control`);
        for (const c of invisible) console.log(`        ${c}`);
      }

      if (result.doc > result.win + 1) {
        failures += 1;
        console.log(`FAIL  ${String(width).padStart(3)}px  ${path}`);
        console.log(`        document ${result.doc}px in a ${result.win}px viewport`);
        for (const c of result.culprits) console.log(`        ${c}`);
      } else {
        console.log(`ok    ${String(width).padStart(3)}px  ${path}`);
      }
    } catch (err) {
      failures += 1;
      console.log(`ERROR ${String(width).padStart(3)}px  ${path}  ${err.message.split("\n")[0]}`);
    }
  }

  await page.close();
}

await browser.close();
console.log(failures === 0 ? "\nNo horizontal overflow." : `\n${failures} page(s) overflow.`);
process.exit(failures === 0 ? 0 : 1);
