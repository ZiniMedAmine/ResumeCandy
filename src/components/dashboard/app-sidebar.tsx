"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileIcon, LayersIcon, UserIcon } from "@/components/ui/icons";

const NAV = [
  { href: "/", label: "Resumes", icon: FileIcon },
  { href: "/account", label: "My account", icon: UserIcon },
];

/** Persistent navigation for the dashboard (the editor runs full-bleed). */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 p-4 md:block">
      <div className="flex h-full flex-col rounded-2xl bg-sunken p-3">
        <Link
          href="/"
          className="pressable group mb-6 flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-surface/60"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-card transition-transform duration-150 group-hover:scale-105">
            <LayersIcon className="size-4.5" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink">VibeCV</span>
        </Link>

        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`pressable flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors duration-150 ${
                  active
                    ? "bg-surface font-semibold text-ink shadow-card"
                    : "font-medium text-ink-muted hover:bg-surface/60 hover:text-ink"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-rose-500" : "text-ink-faint"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <p className="px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
          Local build — your resumes are stored on this machine.
        </p>
      </div>
    </aside>
  );
}
