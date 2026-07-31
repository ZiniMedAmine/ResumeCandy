"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { FileIcon, LayersIcon, SignOutIcon, UserIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
  { href: "/", label: "Resumes", icon: FileIcon },
  { href: "/account", label: "My account", icon: UserIcon },
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Persistent navigation for the dashboard (the editor runs full-bleed). */
export function AppSidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 p-5 md:block">
      <div className="flex h-full flex-col rounded-2xl bg-sunken p-4">
        <Link
          href="/"
          className="pressable group mb-7 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-surface/60"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-card transition-transform duration-150 group-hover:scale-105">
            <LayersIcon className="size-5.5" />
          </span>
          <span className="text-[19px] font-bold tracking-tight text-ink">ResumeCandy</span>
        </Link>

        <nav className="space-y-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`pressable flex items-center gap-3 rounded-xl px-4 py-3 text-[17px] transition-colors duration-150 ${
                  active
                    ? "bg-surface font-semibold text-ink shadow-card"
                    : "font-medium text-ink-muted hover:bg-surface/60 hover:text-ink"
                }`}
              >
                <Icon className={`size-5 ${active ? "text-rose-500" : "text-ink-faint"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="mb-1 flex items-center gap-2.5 rounded-xl bg-surface/60 p-2.5">
          <Link
            href="/account"
            className="pressable flex min-w-0 flex-1 items-center gap-2.5"
            title={user.email}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-[12.5px] font-bold text-white">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[12px] text-ink-faint">{user.email}</span>
            </span>
          </Link>
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="pressable rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <SignOutIcon className="size-5" />
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <p className="px-2 text-[13px] leading-relaxed text-ink-faint">
            Stored on this machine.
          </p>
          <ThemeToggle className="shrink-0 [&>svg]:size-5" />
        </div>
      </div>
    </aside>
  );
}
