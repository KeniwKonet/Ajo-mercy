import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Container, Display } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ajo Mercy came out of a viral conversation about Ajo. It exists to make the support that followed actually reach real businesses.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl">
          <Display size="lg">About Ajo Mercy</Display>
        </div>
      </Container>

      <Container className="pb-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-20">
          <div className="prose-editorial">
            <p>
              An argument about Ajo went around Nigeria and, as these things do, turned into
              something else. People started asking a practical question underneath the noise: if I
              wanted to help a small business right now, how would I know which one was real?
            </p>
            <p>
              Brands started reaching out to Woli Arole directly. Individuals offered money. Business
              owners sent messages describing what they were up against. All of it arriving in DMs,
              in comments, in voice notes, with no way to check any of it and no way to keep track.
              Most of that goodwill was going to evaporate.
            </p>
            <p>
              Ajo Mercy is the part that was missing. Business owners apply and are verified by a
              person. Supporters and brands are verified too. Then they choose, we confirm, and we
              follow the support through to the point where it actually arrives.
            </p>

            <h2 className="mt-10 font-display text-2xl">Why verification is the product</h2>
            <p>
              Anyone can build a page that collects names. The difficult, unglamorous, expensive part
              is knowing that the business on the other end exists, that the story belongs to the
              person telling it, and that support reaches the person it was meant for.
            </p>
            <p>
              That is why nothing here is automatic. Applications are read in the order they arrive.
              Identity documents are looked at. Photographs are looked at. When something does not add
              up we ask, and the applicant gets a list of exactly what to fix rather than a rejection
              with no explanation.
            </p>

            <h2 className="mt-10 font-display text-2xl">Selection is not confirmation</h2>
            <p>
              The thing we are most careful about is the gap between being chosen and being supported.
              When a supporter selects a business, that business is told it is under consideration,
              in those words. Nobody is congratulated until a person on our team has confirmed the
              support is real.
            </p>
            <p>
              This is slower and it is the whole point. Raising someone&rsquo;s hopes and then
              quietly dropping them is its own kind of harm, and it is the standard failure of every
              campaign that has come before this one.
            </p>

            <h2 className="mt-10 font-display text-2xl">We do not touch the money</h2>
            <p>
              Ajo Mercy holds no funds, operates no wallet and transfers nothing. Support is arranged
              directly between the supporter and the business, with our team coordinating and
              following up.
            </p>
            <p>
              A platform that handles money has to be regulated like one, and it immediately becomes
              the thing scammers impersonate. We would rather be the layer that verifies and
              coordinates, and be very loud about the fact that we will never ask anyone for a fee.
            </p>
          </div>

          <aside className="lg:pt-2">
            <div className="widget !p-0 p-5">
              <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                Who runs it
              </p>
              <p className="mt-3 font-display text-lg">Woli Arole</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Super Admin. He and the Ajo Mercy team review applications, approve businesses and
                confirm every recipient before anyone is told they are being supported.
              </p>
            </div>

            <div className="mt-6 border-t border-rule pt-5">
              <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                Our commitments
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                <li>Applying is free and always will be.</li>
                <li>We will never ask anyone for a fee to be considered or to receive support.</li>
                <li>We do not publish selection counts. This is not a contest.</li>
                <li>We do not invent numbers. Every figure on this site is counted from the database.</li>
                <li>Registering does not guarantee selection or support, and we say so everywhere.</li>
              </ul>
            </div>

            <div className="mt-6 border-t border-rule pt-5">
              <ButtonLink href="/how-it-works" variant="secondary" className="w-full">
                Read the full process
              </ButtonLink>
              <p className="mt-3 text-xs text-ink-faint">
                Or{" "}
                <Link href="/contact" className="link-rule text-ink">
                  get in touch
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
