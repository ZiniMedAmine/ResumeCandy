import { AppSidebar } from "@/components/dashboard/app-sidebar";

/**
 * Dashboard shell. The editor lives outside this group so it keeps the full
 * viewport for the content column and the paper preview.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 bg-canvas">
      <AppSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
