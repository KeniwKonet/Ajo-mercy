import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  // Only same-site paths survive; an absolute URL here would be an open redirect.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return <LoginForm next={safeNext} linkError={error} />;
}
