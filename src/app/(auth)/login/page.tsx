import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/dal";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.metaSignIn };
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // The proxy already redirects signed-in visitors; this covers the case where
  // the cookie exists but no longer resolves to a user.
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="signin" action={signIn} />;
}
