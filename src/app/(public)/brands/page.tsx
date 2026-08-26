import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Container, Display, Stat } from "@/components/ui/primitives";
import { getImpactStats } from "@/lib/data/alajos";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "For brands",
  description:
    "Run a verified support campaign with Ajo Mercy. Set a budget, choose sectors and states, and pick from businesses that have already been checked.",
  alternates: { canonical: "/brands" },
};

export const revalidate = 600;

export default async function BrandsPage() {
  const stats = await getImpactStats();

  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <Display size="lg" className="max-w-[16ch]">
              The verification is already done.
            </Display>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              You have a budget and a list of people asking for it. What you do not have is a way to
              tell which of them are real. That is the part we have already done.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register?role=brand" size="lg">
                Register your organisation
              </ButtonLink>
              <Link href="/alajos" className="link-rule text-sm text-ink-soft hover:text-ink">
                See who is on the platform
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px self-start border border-rule bg-rule">
            <div className="bg-paper px-5">
              <Stat value={stats.alajos_approved || null} label="Verified businesses" />
            </div>
            <div className="bg-paper px-5">
              <Stat value={stats.states_reached || null} label="States" />
            </div>
            <div className="bg-paper px-5">
              <Stat value={stats.categories_supported || null} label="Sectors" />
            </div>
            <div className="bg-paper px-5">
              <Stat value={stats.brands_participating || null} label="Brands taking part" />
            </div>
          </dl>
        </div>
      </Container>

      <section className="border-y border-rule bg-paper-warm">
        <Container className="py-14 sm:py-18">
          <h2 className="font-display text-2xl sm:text-3xl">How a campaign runs</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {[
              {
                n: "01",
                title: "Register and get verified",
                body: "Organisation details, a named contact, and what you are hoping to do. We check you are who you say you are.",
              },
              {
                n: "02",
                title: "Create a campaign",
                body: "Budget, how many businesses, which sectors, which states, and a window. You can run more than one.",
              },
              {
                n: "03",
                title: "Choose from verified businesses",
                body: "Once we open selections you browse the businesses that match your brief and pick the ones you want.",
              },
              {
                n: "04",
                title: "We confirm and coordinate",
                body: "Our team confirms each recipient before anyone is told, then introduces you and follows the support through.",
              },
            ].map((step) => (
              <li key={step.n}>
                <span className="font-mono text-sm text-terracotta tabular">{step.n}</span>
                <h3 className="mt-2 font-display text-lg leading-snug">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container className="py-14 sm:py-18">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-2xl">What you get</h2>
            <ul className="mt-5 border-t border-rule">
              {[
                ["Businesses checked by a person", "Identity documents, photographs and the story, reviewed by hand before anything goes live."],
                ["A named contact", "Someone at Ajo Mercy coordinates your campaign and follows up after support is delivered."],
                ["Recipients confirmed before announcement", "No business is told it has been chosen until your selections have been confirmed. Nothing gets out early."],
                ["A record of what happened", "Every decision on your campaign is logged, so you can account for where the budget went."],
              ].map(([title, body]) => (
                <li key={title} className="border-b border-rule py-4">
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl">What we ask</h2>
            <div className="prose-editorial mt-5">
              <p>
                That the support is real and that it arrives. We follow up with every business after
                confirmation, and a campaign that does not deliver is one we will not run again.
              </p>
              <p>
                That businesses are not asked to perform for it. No conditions requiring public
                thanks, no filming a struggling business owner receiving help unless they have freely
                agreed to it and understand what they are agreeing to.
              </p>
              <p>
                That you are patient with the process. Verification takes as long as it takes, and we
                will not shortcut it to hit a campaign date.
              </p>
            </div>
            <div className="mt-8">
              <ButtonLink href="/register?role=brand">Register your organisation</ButtonLink>
              <p className="mt-3 text-xs text-ink-faint">
                Questions first?{" "}
                <Link href="/contact?topic=brand_partnership" className="link-rule text-ink">
                  Talk to us
                </Link>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
