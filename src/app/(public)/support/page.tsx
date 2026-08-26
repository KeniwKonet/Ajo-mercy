import type { Metadata } from "next";
import Link from "next/link";
import { Alert, ButtonLink, Container, Display } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Support a business",
  description:
    "Register as an Ajo Mercy supporter, get approved, then choose which verified Nigerian businesses you want to back.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl">
          <Display size="lg">Back a business you believe in.</Display>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Read the stories, pick the ones that land, and tell us. We handle the checking, the
            introductions and the follow-up.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/register?role=supporter" size="lg">
              Register to support
            </ButtonLink>
            <ButtonLink href="/alajos" variant="secondary" size="lg">
              Browse businesses first
            </ButtonLink>
          </div>
        </div>
      </Container>

      <section className="border-y border-rule">
        <Container className="py-14">
          <div className="grid gap-10 md:grid-cols-3 md:gap-12">
            {[
              {
                n: "01",
                title: "Register and get approved",
                body: "A short form: who you are, where you are, and why you want to do this. We review every supporter by hand, the same way we review the businesses.",
              },
              {
                n: "02",
                title: "Choose who to support",
                body: "Browse the verified businesses and select the ones you want to back. You get a set number of selections, so the choice means something.",
              },
              {
                n: "03",
                title: "We confirm, then connect you",
                body: "Our team checks the selection and confirms it before the business is told anything is settled. Then we introduce you and agree how the support is delivered.",
              },
            ].map((step) => (
              <div key={step.n}>
                <span className="font-mono text-sm text-terracotta tabular">{step.n}</span>
                <h2 className="mt-2 font-display text-xl">{step.title}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-20">
          <div className="prose-editorial">
            <h2 className="font-display text-2xl">Why we cap selections</h2>
            <p className="mt-4">
              If everyone could back everyone, the businesses with the biggest social following would
              take everything and the rest would get nothing. That is the failure mode of every
              well-meaning platform that turns support into a leaderboard.
            </p>
            <p>
              So you get a limited number of selections, and we do not publish how many selections a
              business has. You are choosing who you want to back, not voting in a contest. If you
              genuinely need more selections, ask us.
            </p>

            <h2 className="mt-10 font-display text-2xl">Where the money goes</h2>
            <p className="mt-4">
              Nowhere near us. Ajo Mercy does not hold, escrow or transfer funds at any point. Once
              support is confirmed we introduce you to the business and agree how it is delivered,
              then follow up to make sure it actually happened.
            </p>
            <p>
              This is deliberate. A platform that touches the money has to be regulated like one, and
              it becomes the obvious thing for someone to impersonate. We would rather be the layer
              that verifies and coordinates.
            </p>
          </div>

          <aside className="lg:pt-2">
            <Alert tone="attention" title="Be careful out there">
              <p className="text-sm leading-relaxed">
                Nobody from Ajo Mercy will ever ask a business to pay a fee to receive support, and we
                will never ask you to send money through us. If someone claiming to be us does, it is
                not us.
              </p>
              <p className="mt-3">
                <Link href="/contact" className="link-rule font-medium text-ink">
                  Report it
                </Link>
              </p>
            </Alert>

            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="font-display text-lg">Who gets approved</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-soft">
                <li>People who give a real name, a reachable phone number and a real reason.</li>
                <li>Individuals, not organisations. Brands have their own route.</li>
                <li>Anyone anywhere, as long as the businesses you back are Nigerian.</li>
              </ul>
              <p className="mt-5">
                <Link href="/brands" className="link-rule text-sm font-medium text-ink">
                  Representing an organisation? Go here
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
