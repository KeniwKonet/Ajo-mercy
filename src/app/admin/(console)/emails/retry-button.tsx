"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryEmailAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/primitives";

export function RetryEmailButton({ emailEventId }: { emailEventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="whitespace-nowrap">
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await retryEmailAction(emailEventId);
            setMessage(result.ok ? null : (result.message ?? "Still failing."));
            if (result.ok) router.refresh();
          })
        }
      >
        Retry
      </Button>
      {message && <p className="mt-1 text-2xs text-danger">{message}</p>}
    </div>
  );
}
