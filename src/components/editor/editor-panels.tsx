"use client";

import { useState } from "react";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { ChevronDownIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import type { ResolvedTree, SectionType } from "@/lib/resume/types";
import { kindDefaults, useResumeStore } from "@/store/resume-store";
import { ProvenanceField } from "./provenance-field";
import { SECTION_ICONS, SectionCard } from "./section-card";

const SECTION_PRESETS: { type: SectionType; title: string }[] = [
  { type: "experience", title: "Work Experience" },
  { type: "education", title: "Education" },
  { type: "projects", title: "Projects" },
  { type: "skills", title: "Skills" },
  { type: "certifications", title: "Certifications" },
  { type: "references", title: "References" },
];

function PersonalDetailsCard({ tree }: { tree: ResolvedTree }) {
  const [expanded, setExpanded] = useState(true);
  const header = tree.roots.find((n) => n.kind === "header");
  if (!header) return null;
  const name = typeof header.data.fullName === "string" ? header.data.fullName : "";

  return (
    <section className="rounded-2xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="pressable flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-muted">
          <UserIcon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">Personal details</span>
          {!expanded && (
            <span className="block truncate text-[11.5px] text-ink-faint">
              {name || "Name, contact, summary"}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`size-4.5 shrink-0 text-ink-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-hairline px-5 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField node={header} field="fullName" label="Full name" placeholder="Ada Lovelace" />
            <ProvenanceField node={header} field="headline" label="Headline" placeholder="Software Engineer" />
            <ProvenanceField node={header} field="email" label="Email" placeholder="you@example.com" />
            <ProvenanceField node={header} field="phone" label="Phone" placeholder="+1 555 000 0000" />
            <ProvenanceField node={header} field="location" label="Location" placeholder="City, Country" />
            <ProvenanceField node={header} field="website" label="Website" placeholder="yoursite.dev" />
          </div>
          <div className="mt-3.5">
            <ProvenanceField
              node={header}
              field="summary"
              label="Summary"
              multiline
              rows={3}
              placeholder="Two or three sentences that frame your profile…"
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function EditorPanels({ tree }: { tree: ResolvedTree }) {
  const addNode = useResumeStore((s) => s.addNode);
  const sections = tree.roots.filter((n) => n.kind === "section");

  return (
    <div className="space-y-3.5 pb-24">
      <PersonalDetailsCard tree={tree} />
      {sections.map((section) => (
        <SectionCard key={section.id} node={section} />
      ))}
      <div className="flex justify-center pt-4">
        <Menu
          align="start"
          trigger={
            <button
              type="button"
              className="pressable flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-7 py-3 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
            >
              <PlusIcon className="size-4.5" />
              Add Content
            </button>
          }
        >
          <MenuLabel>Add a section</MenuLabel>
          {SECTION_PRESETS.map((preset) => {
            const Icon = SECTION_ICONS[preset.type];
            return (
              <MenuItem
                key={preset.type}
                icon={<Icon />}
                onSelect={() =>
                  addNode(null, "section", {
                    ...kindDefaults("section"),
                    title: preset.title,
                    sectionType: preset.type,
                  })
                }
              >
                {preset.title}
              </MenuItem>
            );
          })}
        </Menu>
      </div>
    </div>
  );
}
