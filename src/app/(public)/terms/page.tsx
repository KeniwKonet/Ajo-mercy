import type { Metadata } from "next";
import { Container, Display } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that apply to using Ajo Mercy.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: Array<{ heading: string; paragraphs: string[] }> = [
  {
    heading: "What Ajo Mercy is",
    paragraphs: [
      "Ajo Mercy is a discovery, verification, selection, coordination and communication platform. It connects verified Nigerian business owners with individuals and organisations who want to support them.",
      "Ajo Mercy does not process, hold, custody, escrow or transfer support funds at any point. Support arrangements are made directly between the supporter and the business. Our role is to verify, coordinate and follow up.",
    ],
  },
  {
    heading: "Registration does not guarantee support",
    paragraphs: [
      "Creating an account, submitting an application, being verified, and being selected are each separate steps. None of them, individually or together, guarantees that you will receive support.",
      "Support depends on the relevant support campaign, our verification process, and final approval by the Ajo Mercy team. We may decline any application without giving detailed reasons.",
    ],
  },
  {
    heading: "Fees",
    paragraphs: [
      "Applying is free. Ajo Mercy will never ask a business owner, supporter or brand for a fee, a processing charge, a token payment or bank credentials, at any stage, for any reason.",
      "If anyone claiming to represent Ajo Mercy asks you for money, it is not us. Report it through the contact page immediately.",
    ],
  },
  {
    heading: "Accuracy of what you submit",
    paragraphs: [
      "You must only submit information, photographs, documents and stories that are true and that belong to you or to your business.",
      "Applications found to contain another person's business, story or documents will be removed, and the account may be suspended. Where a business has already received support on the basis of false information, we will take reasonable steps to inform the supporter.",
    ],
  },
  {
    heading: "Verification and moderation",
    paragraphs: [
      "Every application is reviewed by a member of the Ajo Mercy team. We may approve, request further information, or decline. We may also suspend or archive a profile that is already live.",
      "We may contact you by phone, email or through the details you provide in order to verify what you have submitted.",
    ],
  },
  {
    heading: "Selection and confirmation",
    paragraphs: [
      "A selection by a supporter or brand is a statement of intent, not a commitment. When your business is selected we will tell you it is under consideration.",
      "Support is only confirmed when the Ajo Mercy team records a confirmation. Until you receive an email that explicitly confirms support, nothing has been settled.",
    ],
  },
  {
    heading: "Your account",
    paragraphs: [
      "You are responsible for keeping your password secure and for activity on your account. Tell us straight away if you think someone else has access to it.",
      "We may suspend accounts that abuse the platform, including creating multiple accounts to influence selections, submitting false information, or harassing other users.",
    ],
  },
  {
    heading: "Content you publish",
    paragraphs: [
      "When your application is approved, the story, photographs and business information you submitted become part of your public profile and may be shown on this site and in Ajo Mercy communications about the platform.",
      "Your identity documents, address, date of birth and personal phone number are never published. They are visible only to the Ajo Mercy review team.",
    ],
  },
  {
    heading: "Liability",
    paragraphs: [
      "Ajo Mercy is not a party to any support arrangement between a supporter and a business, and is not liable for support that is promised and not delivered, or for how support is used once delivered.",
      "We verify to the standard described on the How it works page. That is a meaningful check, not a guarantee, and we do not accept liability for losses arising from relying on it as one.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "We may update these terms as the platform develops. Where a change materially affects applicants, supporters or brands, we will say so on the site and by email.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Container width="editorial" className="py-14 sm:py-20">
      <Display size="md">Terms</Display>
      <p className="mt-4 text-sm text-ink-faint">Last updated 23 August 2026</p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
