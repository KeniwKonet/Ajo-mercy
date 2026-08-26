"use client";

import { useActionState, useState } from "react";
import { submitContactAction } from "./actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, FormErrorSummary, Input, Select, Textarea, WordCount } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import type { ActionResult } from "@/lib/validation/shared";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "application_help", label: "Help with an application" },
  { value: "brand_partnership", label: "Brand partnership" },
  { value: "report_concern", label: "Report a concern" },
  { value: "press", label: "Press" },
] as const;

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(submitContactAction, {
    ok: true,
  });
  const [message, setMessage] = useState("");

  const topic = TOPICS.some((t) => t.value === defaultTopic) ? defaultTopic : "general";

  if (state.ok && state.message) {
    return (
      <Alert tone="positive" title="Sent">
        {state.message}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      <Field label="What is this about?" required error={state.fieldErrors?.topic}>
        <Select name="topic" defaultValue={topic}>
          {TOPICS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Your name" required error={state.fieldErrors?.name}>
        <Input name="name" autoComplete="name" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" required error={state.fieldErrors?.email}>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label="Phone" optional error={state.fieldErrors?.phone}>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field label="Message" required error={state.fieldErrors?.message}>
        <Textarea name="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <WordCount value={message} min={10} />

      <Turnstile />

      <Button type="submit" size="lg" loading={pending}>
        Send message
      </Button>
    </form>
  );
}
