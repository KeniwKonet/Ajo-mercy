"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraftAction,
  saveStepAction,
  submitApplicationAction,
} from "@/app/dashboard/alajo/actions";
import { MediaUploader } from "./media-uploader";
import { Alert, Button, cn, StatusChip } from "@/components/ui/primitives";
import {
  Checkbox,
  Field,
  FormErrorSummary,
  Input,
  Select,
  SelectField,
  SelectField,
  Textarea,
  WordCount,
} from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DraftNotice } from "@/components/ui/draft-notice";
import { useFormDraft } from "@/lib/use-form-draft";
import * as v from "@/lib/validation/live";
import { nigerianPhone, url as urlSchema, socialHandle } from "@/lib/validation/shared";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS, NIGERIAN_STATES } from "@/lib/types";
import type { AlajoApplication, AlajoMedia, VerificationRequest } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/shared";

const STEPS = [
  { key: "personal", label: "About you" },
  { key: "business", label: "The business" },
  { key: "story", label: "Your story" },
  { key: "documents", label: "Photos & documents" },
  { key: "review", label: "Review & submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function ApplicationForm({
  application,
  media,
  openRequests,
  editable,
  completeness,
  missing,
}: {
  application: AlajoApplication;
  media: AlajoMedia[];
  openRequests: VerificationRequest[];
  editable: boolean;
  completeness: number;
  missing: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>(
    application.founder_name ? (application.business_name ? "story" : "business") : "personal",
  );

  return (
    <div className="space-y-8">
      {!editable && (
        <Alert tone="progress" title="This application is locked while we review it">
          You will be able to edit again if we ask for more information.
        </Alert>
      )}

      {openRequests.length > 0 && (
        <Alert tone="attention" title="What we need from you">
          <ul className="mt-2 space-y-2">
            {openRequests.map((request) => (
              <li key={request.id} className="border-l border-terracotta/40 pl-3 text-sm text-ink">
                {request.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Step navigation doubles as a progress indicator. */}
      <nav aria-label="Application steps" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1 border-b border-rule">
          {STEPS.map((item, index) => {
            const active = step === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setStep(item.key)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-baseline gap-2 border-b-2 px-4 py-3 text-sm transition-colors",
                    active
                      ? "border-forest font-medium text-ink"
                      : "border-transparent text-ink-soft hover:text-ink",
                  )}
                >
                  <span className="font-mono text-2xs text-ink-faint tabular">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden bg-paper-deep">
          <div
            className="h-full bg-forest transition-[width] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span className="text-xs text-ink-faint tabular">{completeness}% complete</span>
      </div>

      {step === "personal" && (
        <PersonalStep application={application} editable={editable} onDone={() => setStep("business")} />
      )}
      {step === "business" && (
        <BusinessStep application={application} editable={editable} onDone={() => setStep("story")} />
      )}
      {step === "story" && (
        <StoryStep application={application} editable={editable} onDone={() => setStep("documents")} />
      )}
      {step === "documents" && (
        <DocumentsStep
          media={media}
          editable={editable}
          onDone={() => setStep("review")}
          onChange={() => router.refresh()}
        />
      )}
      {step === "review" && (
        <ReviewStep application={application} missing={missing} editable={editable} />
      )}
    </div>
  );
}

/** Shared wrapper: one server action per step, with an error summary on top. */
function StepForm({
  step,
  state,
  formAction,
  pending,
  children,
  submitLabel = "Save and continue",
  editable,
  formRef,
}: {
  step: StepKey;
  state: ActionResult;
  formAction: (formData: FormData) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  pending: boolean;
  children: React.ReactNode;
  submitLabel?: string;
  editable: boolean;
}) {
  return (
    <form ref={formRef} action={formAction} className="max-w-2xl space-y-6" noValidate>
      <input type="hidden" name="step" value={step} />
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}
      {state.ok && state.message && <Alert tone="positive">{state.message}</Alert>}
      <fieldset disabled={!editable} className="space-y-6">
        {children}
      </fieldset>
      {editable && (
        <div className="flex items-center gap-3 border-t border-rule pt-5">
          <Button type="submit" loading={pending}>
            {submitLabel}
          </Button>
          <span className="text-xs text-ink-faint">Your answers are saved as you go.</span>
        </div>
      )}
    </form>
  );
}

/** Autosaves the current fieldset when the user pauses. */
function useAutosave(formRef: React.RefObject<HTMLFormElement | null>, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const form = formRef.current;
    if (!form) return;

    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const data = new FormData(form!);
        const values: Record<string, string> = {};
        for (const [key, value] of data.entries()) {
          if (key === "step" || key === "turnstileToken") continue;
          if (typeof value === "string") values[key] = value;
        }
        const result = await saveDraftAction(values);
        if (result.ok) setSaved(new Date().toLocaleTimeString("en-NG", { timeStyle: "short" }));
      }, 1400);
    }

    form.addEventListener("input", schedule);
    return () => {
      form.removeEventListener("input", schedule);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [formRef, enabled]);

  return saved;
}

function PersonalStep({
  application,
  editable,
  onDone,
}: {
  application: AlajoApplication;
  editable: boolean;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveStepAction, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);
  const savedAt = useAutosave(formRef, editable);
  const draft = useFormDraft(formRef, "application.personal", { enabled: editable });

  useEffect(() => {
    // The step reached the server, so the local copy has done its job.
    if (state.ok && state.message) {
      draft.clear();
      onDone();
    }
  }, [state, onDone, draft]);

  return (
    <StepForm formRef={formRef} step="personal" state={state} formAction={formAction} pending={pending} editable={editable}>
        <Field label="Your full name" required error={state.fieldErrors?.founderName} validate={v.all(v.required("Your name"), (x) => (x.trim().split(/s+/).length < 2 ? "Please give your first and last name." : null))}>
          <Input name="founderName" defaultValue={application.founder_name ?? ""} autoComplete="name" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Date of birth"
            required
            description="You need to be 18 or older."
            error={state.fieldErrors?.dateOfBirth}
          >
            <Input name="dateOfBirth" type="date" defaultValue={application.date_of_birth ?? ""} />
          </Field>

          <Field label="Gender" optional error={state.fieldErrors?.gender}>
            <SelectField
              name="gender"
              defaultValue={application.gender ?? ""}
              placeholder="Prefer not to say"
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "prefer_not_to_say", label: "Prefer not to say" },
              ]}
            />
          </Field>
        </div>

        <Field
          label="Your phone number"
          required
          description="We use this to reach you about your application."
          error={state.fieldErrors?.personalPhone}
        >
          <Input
            name="personalPhone"
            type="tel"
            inputMode="tel"
            placeholder="0803 000 0000"
            defaultValue={application.personal_phone ?? ""}
          />
        </Field>

        <Field label="Your address" required error={state.fieldErrors?.personalAddress} validate={v.required("Your address")}>
          <Textarea name="personalAddress" rows={3} defaultValue={application.personal_address ?? ""} />
        </Field>

        <div className="space-y-1">
          {savedAt && <p className="text-xs text-ink-faint">Saved to your application at {savedAt}</p>}
          <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
        </div>
      </StepForm>
  );
}

function BusinessStep({
  application,
  editable,
  onDone,
}: {
  application: AlajoApplication;
  editable: boolean;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveStepAction, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);
  const savedAt = useAutosave(formRef, editable);
  const draft = useFormDraft(formRef, "application.business", { enabled: editable });

  useEffect(() => {
    // The step reached the server, so the local copy has done its job.
    if (state.ok && state.message) {
      draft.clear();
      onDone();
    }
  }, [state, onDone, draft]);

  return (
    <StepForm formRef={formRef} step="business" state={state} formAction={formAction} pending={pending} editable={editable}>
        <Field label="Business name" required error={state.fieldErrors?.businessName} validate={v.required("The business name")}>
          <Input name="businessName" defaultValue={application.business_name ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" required error={state.fieldErrors?.businessCategory}>
            <SelectField
              name="businessCategory"
              defaultValue={application.business_category ?? ""}
              placeholder="Choose one"
              options={BUSINESS_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))}
            />
          </Field>

          <Field label="Year you started" required error={state.fieldErrors?.yearStarted} validate={v.all(v.required("The year you started"), v.range(1900, new Date().getFullYear(), "That year"))}>
            <Input
              name="yearStarted"
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear()}
              defaultValue={application.year_started ?? ""}
            />
          </Field>
        </div>

        <Field
          label="What does the business do?"
          required
          description="A few sentences. Plain language is better than a pitch."
          error={state.fieldErrors?.businessDescription}
        >
          <Textarea name="businessDescription" rows={4} defaultValue={application.business_description ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="How many people work here?" required error={state.fieldErrors?.employeeCount} validate={v.range(0, 100000, "That number")}>
            <Input
              name="employeeCount"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={application.employee_count ?? 0}
            />
          </Field>

          <Field label="State" required error={state.fieldErrors?.state}>
            <SelectField
              name="state"
              defaultValue={application.state ?? ""}
              placeholder="Choose a state"
              options={NIGERIAN_STATES.map((state) => ({ value: state, label: state }))}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Town or city" required error={state.fieldErrors?.city} validate={v.required("Town or city")}>
            <Input name="city" defaultValue={application.city ?? ""} />
          </Field>

          <Field label="Business phone" required error={state.fieldErrors?.businessPhone} validate={v.all(v.required("A phone number"), v.fromSchema(nigerianPhone))}>
            <Input
              name="businessPhone"
              type="tel"
              inputMode="tel"
              defaultValue={application.business_phone ?? ""}
            />
          </Field>
        </div>

        <Field label="Business address" required error={state.fieldErrors?.businessAddress} validate={v.required("The business address")}>
          <Textarea name="businessAddress" rows={3} defaultValue={application.business_address ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website" optional error={state.fieldErrors?.websiteUrl} validate={v.optional(v.fromSchema(urlSchema))}>
            <Input name="websiteUrl" type="url" placeholder="https://" defaultValue={application.website_url ?? ""} />
          </Field>
          <Field label="Instagram" optional error={state.fieldErrors?.instagramHandle} validate={v.optional(v.fromSchema(socialHandle))}>
            <Input name="instagramHandle" placeholder="yourbusiness" defaultValue={application.instagram_handle ?? ""} />
          </Field>
          <Field label="TikTok" optional error={state.fieldErrors?.tiktokHandle} validate={v.optional(v.fromSchema(socialHandle))}>
            <Input name="tiktokHandle" placeholder="yourbusiness" defaultValue={application.tiktok_handle ?? ""} />
          </Field>
          <Field label="X" optional error={state.fieldErrors?.xHandle} validate={v.optional(v.fromSchema(socialHandle))}>
            <Input name="xHandle" placeholder="yourbusiness" defaultValue={application.x_handle ?? ""} />
          </Field>
        </div>

        <div className="space-y-1">
          {savedAt && <p className="text-xs text-ink-faint">Saved to your application at {savedAt}</p>}
          <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
        </div>
      </StepForm>
  );
}

function StoryStep({
  application,
  editable,
  onDone,
}: {
  application: AlajoApplication;
  editable: boolean;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveStepAction, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);
  const savedAt = useAutosave(formRef, editable);
  const draft = useFormDraft(formRef, "application.story", { enabled: editable });
  const [story, setStory] = useState(application.story ?? "");
  const [challenge, setChallenge] = useState(application.current_challenge ?? "");
  const [enable, setEnable] = useState(application.support_would_enable ?? "");

  useEffect(() => {
    // The step reached the server, so the local copy has done its job.
    if (state.ok && state.message) {
      draft.clear();
      onDone();
    }
  }, [state, onDone, draft]);

  return (
    <StepForm formRef={formRef} step="story" state={state} formAction={formAction} pending={pending} editable={editable}>
        <Alert tone="neutral">
          This is the part supporters actually read. Write it the way you would tell a friend, not the
          way you would write a proposal.
        </Alert>

        <Field
          label="Your story"
          required
          description="How the business started, what it has been through, where it is now."
          error={state.fieldErrors?.story}
          validate={v.words(60, "Your story")}
          validateOn="input"
        >
          <Textarea name="story" rows={9} value={story} onChange={(e) => setStory(e.target.value)} />
        </Field>
        <WordCount value={story} min={60} />

        <Field
          label="What is the challenge right now?"
          required
          description="Be specific. 'The generator packed up in March' says more than 'we need funding'."
          error={state.fieldErrors?.currentChallenge}
          validate={v.words(20, "The challenge")}
          validateOn="input"
        >
          <Textarea
            name="currentChallenge"
            rows={5}
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
          />
        </Field>
        <WordCount value={challenge} min={20} />

        <Field
          label="What would support let you do?"
          required
          description="What changes for the business, and for the people who depend on it."
          error={state.fieldErrors?.supportWouldEnable}
          validate={v.words(20, "This answer")}
          validateOn="input"
        >
          <Textarea
            name="supportWouldEnable"
            rows={5}
            value={enable}
            onChange={(e) => setEnable(e.target.value)}
          />
        </Field>
        <WordCount value={enable} min={20} />

        <Field
          label="How much are you asking for?"
          required
          description="In naira. An honest, specific number reads better than a round one."
          error={state.fieldErrors?.requestedAmountNgn}
        >
          <Input
            name="requestedAmountNgn"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            defaultValue={application.requested_amount_ngn ?? ""}
          />
        </Field>

        <div className="space-y-1">
          {savedAt && <p className="text-xs text-ink-faint">Saved to your application at {savedAt}</p>}
          <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
        </div>
      </StepForm>
  );
}

function DocumentsStep({
  media,
  editable,
  onDone,
  onChange,
}: {
  media: AlajoMedia[];
  editable: boolean;
  onDone: () => void;
  onChange: () => void;
}) {
  const byKind = (kind: AlajoMedia["kind"]) => media.filter((m) => m.kind === kind);

  return (
    <div className="max-w-2xl space-y-8">
      <Alert tone="neutral">
        Photographs matter more than you would expect. A real picture of the place and the person
        running it is the difference between a profile people read and one they scroll past.
      </Alert>

      <MediaUploader
        kind="profile_photo"
        label="A photograph of you"
        description="Clear, recent, face visible. This appears on your profile."
        existing={byKind("profile_photo")}
        disabled={!editable}
        onChange={onChange}
      />

      <MediaUploader
        kind="business_photo"
        label="Photographs of the business"
        description="Up to six. The shop, the workshop, the stock, the work itself."
        existing={byKind("business_photo")}
        multiple
        disabled={!editable}
        onChange={onChange}
      />

      <MediaUploader
        kind="video"
        label="A short video"
        description="Optional. Under a minute, filmed on your phone is fine."
        existing={byKind("video")}
        disabled={!editable}
        onChange={onChange}
      />

      <div className="border-t border-rule pt-8">
        <MediaUploader
          kind="document"
          documentType="government_id"
          label="Identity document"
          description="NIN slip, driver's licence, voter's card or international passport. Only the review team sees this; it never appears on your public profile."
          existing={byKind("document")}
          multiple
          disabled={!editable}
          onChange={onChange}
        />
      </div>

      <div className="border-t border-rule pt-5">
        <Button type="button" onClick={onDone}>
          Continue to review
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  application,
  missing,
  editable,
}: {
  application: AlajoApplication;
  missing: string[];
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(submitApplicationAction, {
    ok: true,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const ready = missing.length === 0;

  const isResubmission = application.status === "more_information_required";

  return (
    <div className="max-w-2xl space-y-6">
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}
      {state.ok && state.message && (
        <Alert tone="positive" title="Submitted">
          {state.message}
        </Alert>
      )}

      {!ready && (
        <Alert tone="attention" title="Not ready to submit yet">
          <ul className="mt-2 list-inside list-disc space-y-1">
            {missing.map((item) => (
              <li key={item} className="text-sm">
                {item}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <section className="border border-rule bg-card">
        <h2 className="border-b border-rule px-5 py-3 font-display text-lg">What you are submitting</h2>
        <dl className="divide-y divide-rule">
          {[
            ["Business", application.business_name],
            ["Founder", application.founder_name],
            ["Category", application.business_category],
            ["Location", [application.city, application.state].filter(Boolean).join(", ")],
            ["Started", application.year_started],
            [
              "Asking for",
              application.requested_amount_ngn
                ? `₦${application.requested_amount_ngn.toLocaleString("en-NG")}`
                : null,
            ],
          ].map(([label, value]) => (
            <div key={String(label)} className="grid grid-cols-[10rem_1fr] gap-3 px-5 py-3">
              <dt className="text-sm text-ink-faint">{label}</dt>
              <dd className="text-sm text-ink">{value ? String(value) : <span className="text-ink-faint">Not filled in</span>}</dd>
            </div>
          ))}
        </dl>
      </section>

      {editable ? (
        <form ref={formRef} action={formAction} className="space-y-5" noValidate>
          <Checkbox
            name="confirmAccurate"
            required
            label="Everything here is true and belongs to me."
            description="Applications that turn out to be someone else's business or story are removed."
          />
          <Checkbox
            name="confirmNoGuarantee"
            required
            label="I understand that registering does not guarantee selection or support."
            description="Support depends on the campaign, our review and final approval."
          />

          <Turnstile />

          <Button
            type="button"
            size="lg"
            disabled={!ready}
            loading={pending}
            onClick={() => setConfirmOpen(true)}
          >
            {isResubmission ? "Resubmit for review" : "Submit application"}
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title={isResubmission ? "Resubmit your application?" : "Submit your application?"}
            description={
              isResubmission
                ? "Your updates go back to the review team and your application is locked again while they read it."
                : "Your application goes to the review team and is locked while they read it. We will email you when there is a decision."
            }
            confirmLabel={isResubmission ? "Resubmit" : "Submit"}
            pending={pending}
            onConfirm={() => {
              setConfirmOpen(false);
              startTransition(() => formRef.current?.requestSubmit());
            }}
          />
        </form>
      ) : (
        <StatusChip tone="progress">Already submitted</StatusChip>
      )}
    </div>
  );
}
