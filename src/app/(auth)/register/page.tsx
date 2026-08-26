import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Register as a business owner, a supporter or a brand.",
  robots: { index: false, follow: true },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const defaultRole =
    role === "alajo" || role === "brand" || role === "supporter" ? role : "supporter";
  return <RegisterForm defaultRole={defaultRole} />;
}
