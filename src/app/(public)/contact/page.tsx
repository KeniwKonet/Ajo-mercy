import type { Metadata } from "next";
import { Container, Display } from "@/components/ui/primitives";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Ajo Mercy team, or report something that looks wrong.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;

  return (
    <Container className="py-14 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-20">
        <div>
          <Display size="md">Get in touch</Display>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
            Questions about an application, a partnership, or something that does not look right.
          </p>
          <div className="mt-9 max-w-lg">
            <ContactForm defaultTopic={topic} />
          </div>
        </div>

        <aside className="lg:pt-3">
          <div className="border-l-2 border-orange bg-panel-white px-4 py-4">
            <p className="text-sm font-semibold text-orange">Seen a scam?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Nobody from Ajo Mercy will ever ask a business to pay a fee, a processing charge or a
              token payment to be considered or to receive support. If someone claiming to be us
              does, choose &ldquo;Report a concern&rdquo; and tell us exactly what happened.
            </p>
          </div>

          <div className="mt-8 border-t border-rule pt-5">
            <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
              Before you write
            </p>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-soft">
              <li>
                Applications are read in the order they arrive. Asking us to look at yours sooner
                will not move it up.
              </li>
              <li>
                If we asked you for more information, the fastest route is your dashboard, not this
                form.
              </li>
              <li>We do not give feedback on why an application was not taken forward.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
