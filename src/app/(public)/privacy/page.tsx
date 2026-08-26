import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Ajo Mercy collects, why, who sees it and how long it is kept.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: Array<{ heading: string; body: React.ReactNode }> = [
  {
    heading: "What we collect",
    body: (
      <ul className="mt-3 space-y-2 text-ink-soft">
        <li>
          <strong className="text-ink">From everyone:</strong> name, email address and password (stored
          hashed, never in readable form).
        </li>
        <li>
          <strong className="text-ink">From business owners:</strong> date of birth, phone number,
          address, business details, photographs, an identity document, and the story you write.
        </li>
        <li>
          <strong className="text-ink">From supporters:</strong> phone number, location, occupation and
          why you want to support a business.
        </li>
        <li>
          <strong className="text-ink">From brands:</strong> organisation details, a named contact and
          their contact details.
        </li>
        <li>
          <strong className="text-ink">Automatically:</strong> a hashed form of your IP address and
          browser signature when you make a selection. We store the hash, not the address itself.
        </li>
      </ul>
    ),
  },
  {
    heading: "Why we collect it",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        To verify that the businesses on this platform are real, to verify that the people supporting
        them are real, to coordinate support, and to detect abuse. We do not sell data, and we do not
        share it with advertisers.
      </p>
    ),
  },
  {
    heading: "What becomes public",
    body: (
      <>
        <p className="mt-3 leading-relaxed text-ink-soft">
          When a business application is approved, these become publicly visible: business name,
          founder name, category, state and town, year started, your story, the challenge you
          described, what support would enable, the amount you are asking for, your business social
          links, and the photographs and video you uploaded of yourself and the business.
        </p>
        <p className="mt-3 leading-relaxed text-ink-soft">
          These are never public: your identity document, date of birth, home address, personal phone
          number, email address, and anything you wrote in a note to the review team.
        </p>
      </>
    ),
  },
  {
    heading: "What we deliberately do not publish",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        We do not publish how many people have selected a business. Publishing that would turn support
        into a popularity contest, which is the opposite of what this platform is for.
      </p>
    ),
  },
  {
    heading: "Who can see your information",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        The Ajo Mercy review team, which includes Woli Arole as Super Admin. Access is limited by role:
        a reviewer sees what they need to review, and administrative actions are recorded on an audit
        log. Our email provider processes the messages we send you. Our hosting and database provider
        stores the data.
      </p>
    ),
  },
  {
    heading: "Abuse detection",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        When you make a selection we store a salted hash of your IP address and a coarse hash of your
        browser characteristics. This lets us notice one person operating many accounts without
        holding identifying information. It is deliberately not precise enough to track an individual
        across the internet.
      </p>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        Account and application data is kept while your account exists. Identity documents are kept for
        as long as your profile is live, so we can re-verify if a question is raised, and are deleted
        when an account is deleted. Audit logs are retained because a record of who approved what is
        the point of having them.
      </p>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        You can withdraw an application at any time from your dashboard. You can ask us to correct
        anything we hold, or to delete your account and its data, through the{" "}
        <Link href="/contact" className="link-rule text-ink">
          contact page
        </Link>
        . Deleting your account removes your public profile.
      </p>
    ),
  },
  {
    heading: "Security",
    body: (
      <p className="mt-3 leading-relaxed text-ink-soft">
        Access to data is enforced at the database level, not only in the application, so a bug in one
        screen cannot expose another person&rsquo;s records. Identity documents are stored in a private
        bucket that is not publicly reachable, and are only ever served to reviewers through short-lived
        links.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <Container width="editorial" className="py-14 sm:py-20">
      <Display size="md">Privacy</Display>
      <p className="mt-4 text-sm text-ink-faint">Last updated 23 August 2026</p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl">{section.heading}</h2>
            {section.body}
          </section>
        ))}
      </div>
    </Container>
  );
}
