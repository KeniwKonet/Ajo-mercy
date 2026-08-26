import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display, ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Ajo Mercy verifies Nigerian businesses, how supporters and brands choose who to back, and where the platform stops.",
  alternates: { canonical: "/how-it-works" },
};

const STAGES = [
  {
    n: "01",
    title: "A business applies",
    body: "The owner fills in who they are, what the business does, what is standing in the way and what support would let them do. They upload photographs of the business and an identity document.",
    detail: "Free. Takes about fifteen minutes. Can be saved and finished later.",
  },
  {
    n: "02",
    title: "A person reads it",
    body: "The Ajo Mercy team opens the application, reads the story, looks at the photographs and checks the identity document. Applications are read in the order they arrive.",
    detail: "Woli Arole is the Super Admin. Nothing goes live automatically.",
  },
  {
    n: "03",
    title: "One of three things happens",
    body: "The application is approved and the profile goes live. Or we ask for specific things to be fixed and the applicant gets an email listing exactly what. Or it is not taken forward, and we say so.",
    detail: "Every decision is emailed and recorded on our audit log.",
  },
  {
    n: "04",
    title: "Supporters and brands choose",
    body: "Approved individuals and verified organisations browse the businesses, read the stories, and select the ones they want to back. Selections are capped so attention spreads rather than piling onto whoever is loudest.",
    detail: "Selection counts are not published. This is not a popularity contest.",
  },
  {
    n: "05",
    title: "The business is told it is being considered",
    body: "Not that it has won anything. Being selected and being supported are two different things, and we are careful about the difference because getting someone's hopes up wrongly is its own kind of harm.",
    detail: "The email says exactly this, in these words.",
  },
  {
    n: "06",
    title: "The team confirms",
    body: "We check the selection, confirm the supporter is real and willing, and only then record the support as confirmed. That is the moment the business gets the email that says congratulations.",
    detail: "A deliberate, separate, human decision.",
  },
  {
    n: "07",
    title: "Support is arranged directly",
    body: "Between the supporter and the business, with our team coordinating and following up. Ajo Mercy does not hold, escrow or transfer any money at any point.",
    detail: "We stay in the loop to make sure it actually lands.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl">
          <Display size="lg">How this works</Display>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Seven steps, and a person involved at every one that matters. The slow parts are slow on
            purpose.
          </p>
        </div>
      </Container>

      <Container className="pb-16">
        <ol className="border-t border-rule">
          {STAGES.map((stage) => (
            <li
              key={stage.n}
              className="grid gap-4 border-b border-rule py-8 md:grid-cols-[4rem_1fr_18rem] md:gap-10"
            >
              <span className="font-mono text-sm text-terracotta tabular">{stage.n}</span>
              <div>
                <h2 className="font-display text-2xl leading-snug">{stage.title}</h2>
                <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">{stage.body}</p>
              </div>
              <p className="self-start text-sm leading-relaxed text-ink-faint md:pt-1">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </Container>

      {/* What we deliberately do not do. Stating this plainly is part of the
          trust proposition, not a disclaimer we hide in the footer. */}
      <section className="border-y border-rule bg-forest text-paper">
        <Container className="py-14 sm:py-20">
          <h2 className="font-display text-3xl text-paper sm:text-4xl">What we do not do</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "We do not hold your money",
                body: "No wallets, no escrow, no transfers. If a platform asks you to send money through it to receive support, that is not us and you should not do it.",
              },
              {
                title: "We do not guarantee support",
                body: "Registering, being verified and being selected are all real steps, and none of them is a promise. Support depends on the campaign and the final decision.",
              },
              {
                title: "We do not charge to be considered",
                body: "Applying is free. Nobody from Ajo Mercy will ever ask you for a fee, a processing charge or a token payment.",
              },
            ].map((item) => (
              <li key={item.title} className="border-t border-paper/15 pt-5">
                <h3 className="font-display text-lg text-paper">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">{item.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16">
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink href="/become-an-alajo" size="lg">
            Apply as a business
          </ButtonLink>
          <ButtonLink href="/support" variant="secondary" size="lg">
            Register to support
          </ButtonLink>
          <Link href="/alajos" className="link-rule text-sm text-ink-soft hover:text-ink">
            Or just read the stories
          </Link>
        </div>
      </Container>
    </>
  );
}
