"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { homeFor } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

/**
 * Client island so the public pages stay statically cacheable. The session is
 * resolved in the browser rather than by reading cookies during render, which
 * would make every marketing page dynamic.
 *
 * This only decides which link to show. Nothing here grants access: the
 * dashboard and admin routes re-check the role server-side.
 */
export function AccountNav({ className }: { className?: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "out" } | { status: "in"; href: string }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function resolve() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setState({ status: "out" });
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!active) return;
      const role = (data as { role: UserRole } | null)?.role ?? null;
      setState({ status: "in", href: homeFor(role ? { role } : null) });
    }

    void resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void resolve());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") {
    // Reserve the space so the header does not shift when this resolves.
    return <span className={className} aria-hidden="true" style={{ minWidth: "4.5rem" }} />;
  }

  if (state.status === "out") {
    return (
      <Link href="/login" className={className}>
        Sign in
      </Link>
    );
  }

  return (
    <Link href={state.href} className={className}>
      Dashboard
    </Link>
  );
}
