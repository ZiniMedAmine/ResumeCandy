import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { requireUser } from "@/lib/auth/dal";

/**
 * Dashboard shell. The editor lives outside this group so it keeps the full
 * viewport for the content column and the paper preview.
 *
 * The user is resolved here only to render the sidebar chip — every page and
 * action underneath does its own check, because a layout does not re-run on
 * client-side navigation and so cannot be relied on as the gate.
 */
export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-1 bg-canvas">
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
