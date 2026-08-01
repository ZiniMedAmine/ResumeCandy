"use client";

import { useState } from "react";
import { ChevronDownIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import { useT } from "@/lib/i18n/provider";
import { sectionTitle } from "@/lib/locale";
import { enterDelay } from "@/lib/motion";
import type { ResolvedTree } from "@/lib/resume/types";
import { kindDefaults, useDesign, useResumeStore } from "@/store/resume-store";
import { AddContentDialog } from "./add-content-dialog";
import { ProvenanceField } from "./provenance-field";
import { SectionCard } from "./section-card";
import { useDragReorder } from "./use-drag-reorder";

function PersonalDetailsCard({ tree }: { tree: ResolvedTree }) {
  const [expanded, setExpanded] = useState(true);
  const t = useT();
  const header = tree.roots.find((n) => n.kind === "header");
  if (!header) return null;
  const name = typeof header.data.fullName === "string" ? header.data.fullName : "";

  return (
    <section className="rounded-2xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="pressable flex w-full items-center gap-3 px-5 py-4 text-start"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-muted">
          <UserIcon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            {t.content.personalDetails}
          </span>
          {!expanded && (
            <span className="block truncate text-[11.5px] text-ink-faint">
              {name || t.content.personalDetailsHint}
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
            <ProvenanceField
              node={header}
              field="fullName"
              label={t.content.fullName}
              placeholder={t.content.fullNamePlaceholder}
            />
            <ProvenanceField
              node={header}
              field="headline"
              label={t.content.headline}
              placeholder={t.content.headlinePlaceholder}
            />
            <ProvenanceField
              node={header}
              field="email"
              label={t.content.email}
              placeholder={t.content.emailPlaceholder}
            />
            <ProvenanceField
              node={header}
              field="phone"
              label={t.content.phone}
              placeholder={t.content.phonePlaceholder}
            />
            <ProvenanceField
              node={header}
              field="location"
              label={t.content.location}
              placeholder={t.content.locationPlaceholder}
            />
            <ProvenanceField
              node={header}
              field="website"
              label={t.content.website}
              placeholder={t.content.websitePlaceholder}
            />
          </div>
          <div className="mt-3.5">
            <ProvenanceField
              node={header}
              field="summary"
              label={t.content.summary}
              multiline
              rows={3}
              placeholder={t.content.summaryPlaceholder}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function EditorPanels({ tree }: { tree: ResolvedTree }) {
  const addNode = useResumeStore((s) => s.addNode);
  const moveNodeTo = useResumeStore((s) => s.moveNodeTo);
  const [picking, setPicking] = useState(false);
  const { design } = useDesign();
  const t = useT();
  const sections = tree.roots.filter((n) => n.kind === "section");

  // Sections are only part of the root list — the personal-details header sits
  // ahead of them — so a drop at visible position i lands that many places
  // after wherever the sections begin.
  const firstSectionIndex = Math.max(0, tree.roots.findIndex((n) => n.kind === "section"));
  const drag = useDragReorder(
    (id, to) => moveNodeTo(id, to + firstSectionIndex),
    { requireHandle: true },
  );

  return (
    <div className="space-y-3.5 pb-24">
      <div className="anim-rise" style={enterDelay(0)}>
        <PersonalDetailsCard tree={tree} />
      </div>
      {sections.map((section, i) => (
        <div key={section.id} className="anim-rise" style={enterDelay(i + 1)}>
          <SectionCard
            node={section}
            dragProps={drag.itemProps(section.id, i)}
            handleProps={drag.handleProps(section.id)}
            dragging={drag.draggingId === section.id}
            edge={drag.dropEdge(i, sections.length)}
          />
        </div>
      ))}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="pressable flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-7 py-3 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
        >
          <PlusIcon className="size-4.5" />
          {t.content.addContent}
        </button>
      </div>

      <AddContentDialog
        open={picking}
        onClose={() => setPicking(false)}
        locale={design.language}
        onPick={(preset) =>
          addNode(null, "section", {
            ...kindDefaults("section"),
            // Born in the CV's language, so an Arabic resume never gets an
            // English heading that then has to be translated by hand.
            title: sectionTitle(preset.type, design.language),
            sectionType: preset.type,
          })
        }
      />
    </div>
  );
}
