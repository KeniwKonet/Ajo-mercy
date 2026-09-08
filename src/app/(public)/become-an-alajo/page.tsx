import type { Metadata } from "next";
import Link from "next/link";
import { Alert, ButtonLink, Container, Display } from "@/components/ui/primitives";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Become an Alajo",
  description:
    "Apply to be a verified business on Ajo Mercy. Tell us what you are building and what is standing in the way. Free to apply.",
  alternates: { canonical: "/become-an-alajo" },
};

const NEEDED = [
  "Your full name, date of birth, phone number and address",
  "Your business name, what it does, where it is and when you started",
  "An identity document: NIN slip, driver's licence, voter's card or passport",
  "A photograph of you, and photographs of the business",
  "Your story, the challenge you are facing, and what support would let you do",
  "How much you are asking for, in naira",
];

export default function BecomeAnAlajoPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does it cost anything to apply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Applying is free and nobody from Ajo Mercy will ever ask you for a fee to be considered.",
        },
      },
      {
        "@type": "Question",
        name: "Does applying guarantee I will be supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Registering does not guarantee selection or support. Support depends on the relevant campaign, our verification process and final approval.",
        },
      },
      {
        "@type": "Question",
        name: "How long does review take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Applications are read in the order they arrive by a person, not a filter. You will be emailed as soon as there is a decision or if we need anything else.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <Display size="lg" className="max-w-[16ch]">
              Tell us what you are building.
            </Display>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              If you run a business in Nigeria and something specific is standing in the way, this is
              where you say so. A person reads every application.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register?role=alajo" size="lg">
                Start my application
              </ButtonLink>
              <Link href="/login" className="link-rule text-sm text-ink-soft hover:text-ink">
                Already applied? Sign in
              </Link>
            </div>

            <Alert tone="attention" className="mt-9 max-w-md">
              Registering does not guarantee selection or support. Applying is free, and nobody from
              Ajo Mercy will ever ask you for a fee.
            </Alert>
          </div>

          <div className="lg:pt-3">
            <h2 className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
              What you will need
            </h2>
            <ul className="mt-4 border-t border-rule">
              {NEEDED.map((item) => (
                <li key={item} className="flex gap-3 border-b border-rule py-3.5 text-sm text-ink-soft">
                  <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-rule-strong" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Your identity document is seen only by the review team. It never appears on your public
              profile.
            </p>
          </div>
        </div>
      </Container>

      <section className="border-y border-rule bg-widget-black-2">
        <Container className="py-14">
          <h2 className="font-display text-2xl sm:text-3xl">Writing the story part</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-orange">
                What gets read
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                <li>
                  Specific things. &ldquo;The freezer died in March and I have been buying ice every
                  day since&rdquo; tells a reader more than three paragraphs about resilience.
                </li>
                <li>Numbers you actually know. How many people you employ. What you take in a good week.</li>
                <li>What changes if this works. For the business, and for the people around it.</li>
              </ul>
            </div>
            <div>
              <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                What gets skipped
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                <li>Proposal language. You are not writing a grant application.</li>
                <li>Vague amounts. An honest, specific number reads better than a round one.</li>
                <li>Someone else&rsquo;s story. Applications that turn out not to be yours are removed.</li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <h2 className="font-display text-2xl">Common questions</h2>
        <dl className="mt-6 border-t border-rule">
          {[
            [
              "Does it cost anything?",
              "No. Applying is free. If anyone asks you to pay to be considered, to be shortlisted, or to release support, it is not us. Report it to us.",
            ],
            [
              "How long does review take?",
              "Applications are read in the order they arrive. We will email you as soon as there is a decision, or sooner if we need something else from you.",
            ],
            [
              "What if I am asked for more information?",
              "You will get an email listing exactly what to change, and your form unlocks so you can update it. Everything you already filled in is kept.",
            ],
            [
              "Do I have to register the business with CAC?",
              "No. Plenty of real businesses are not registered. We verify you and the business through identity documents and photographs, not through paperwork you may not have.",
            ],
            [
              "Who sees my documents?",
              "Only the Ajo Mercy review team. They are stored privately and are never shown on your public profile.",
            ],
          ].map(([question, answer]) => (
            <div key={question} className="border-b border-rule py-5 md:grid md:grid-cols-[18rem_1fr] md:gap-10">
              <dt className="font-medium text-ink">{question}</dt>
              <dd className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft md:mt-0">{answer}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10">
          <ButtonLink href="/register?role=alajo" size="lg">
            Start my application
          </ButtonLink>
          <p className="mt-3 text-xs text-ink-faint">
            Or read <Link href={`${siteUrl}/how-it-works`} className="link-rule text-ink">how the whole process works</Link> first.
          </p>
        </div>
      </Container>
    </>
  );
}
