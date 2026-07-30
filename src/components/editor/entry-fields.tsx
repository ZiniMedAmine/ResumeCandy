"use client";

import { PlusIcon, XIcon } from "@/components/ui/icons";
import { describeDateValue } from "@/lib/date-value";
import type { ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { DateField } from "./date-field";
import { HiddenGhost, LocalBadge, NodeControls } from "./node-controls";
import { ProvenanceField } from "./provenance-field";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * The one-line description shown for a collapsed entry: a bold title plus a
 * muted qualifier, so a list of entries stays scannable.
 */
export function entrySummary(node: ResolvedNode): { title: string; subtitle: string } {
  const d = node.data;
  switch (node.kind) {
    case "experience":
      return { title: s(d.title) || "Untitled role", subtitle: s(d.company) };
    case "education":
      return {
        title: [s(d.degree), s(d.field)].filter(Boolean).join(", ") || "Untitled degree",
        subtitle: s(d.school),
      };
    case "project":
      return { title: s(d.name) || "Untitled project", subtitle: s(d.url) || s(d.description) };
    case "skillGroup": {
      const count = node.children.filter((c) => c.kind === "skill" && !c.hidden).length;
      return { title: s(d.name) || "Untitled group", subtitle: `${count} skill${count === 1 ? "" : "s"}` };
    }
    case "certification":
      return {
        title: s(d.name) || "Untitled certification",
        subtitle: [s(d.issuer), describeDateValue(d.date)].filter(Boolean).join(" · "),
      };
    case "reference":
      return {
        title: s(d.name) || "Untitled reference",
        subtitle: [s(d.title), s(d.company)].filter(Boolean).join(", "),
      };
    default:
      return { title: "Entry", subtitle: "" };
  }
}

/** Human name for an entry kind, used as context in the editor header. */
export function entryKindLabel(node: ResolvedNode): string {
  switch (node.kind) {
    case "experience":
      return "Experience";
    case "education":
      return "Education";
    case "project":
      return "Project";
    case "skillGroup":
      return "Skill group";
    case "certification":
      return "Certification";
    case "reference":
      return "Reference";
    default:
      return "Entry";
  }
}

function BulletList({ parent, label }: { parent: ResolvedNode; label: string }) {
  const addNode = useResumeStore((s) => s.addNode);
  const bullets = parent.children.filter((c) => c.kind === "bullet");
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">{label}</p>
      <div className="space-y-2">
        {bullets.map((b) =>
          b.hidden ? (
            <HiddenGhost key={b.id} node={b} />
          ) : (
            <div key={b.id} className="group/bullet flex items-start gap-1.5">
              <ProvenanceField
                node={b}
                field="text"
                multiline
                rows={2}
                placeholder="Achievement or responsibility…"
                className="flex-1"
              />
              <div className="mt-1 flex items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/bullet:opacity-100">
                {b.status === "local" && <LocalBadge />}
                <NodeControls node={b} compact />
              </div>
            </div>
          ),
        )}
        <button
          type="button"
          onClick={() => addNode(parent.id, "bullet")}
          className="pressable flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-rose-500"
        >
          <PlusIcon className="size-3.5" />
          Add bullet
        </button>
      </div>
    </div>
  );
}

/** Skill chips for a group: inline-editable, per-version hideable. */
function SkillChips({ node }: { node: ResolvedNode }) {
  const addNode = useResumeStore((s) => s.addNode);
  const editField = useResumeStore((s) => s.editField);
  const setHidden = useResumeStore((s) => s.setHidden);
  const deleteNodeHard = useResumeStore((s) => s.deleteNodeHard);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;

  const skills = node.children.filter((c) => c.kind === "skill");

  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">Skills</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((skill) => {
          const customized = skill.status === "customized" && skill.customizedFields.includes("name");
          if (skill.hidden) {
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setHidden(skill.id, false)}
                className="pressable rounded-full border border-dashed border-hairline-strong px-2.5 py-1 text-[12px] text-ink-faint line-through transition-colors duration-150 hover:border-rose-300 hover:text-rose-500"
                title="Hidden in this version — click to show"
              >
                {String(skill.data.name ?? "")}
              </button>
            );
          }
          return (
            <span
              key={skill.id}
              className={`group/skill flex items-center gap-1 rounded-full border py-1 pl-3 pr-1.5 text-[12px] transition-colors duration-150 ${
                customized
                  ? "border-amber-200/90 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/[0.07]"
                  : skill.status === "local"
                    ? "border-violet-200/70 bg-violet-50/40 dark:border-violet-500/25 dark:bg-violet-500/[0.07]"
                    : "border-hairline bg-surface"
              }`}
            >
              <input
                value={String(skill.data.name ?? "")}
                placeholder="Skill"
                size={Math.max(3, String(skill.data.name ?? "").length)}
                onChange={(e) => editField(skill.id, "name", e.target.value)}
                className="bg-transparent text-ink outline-none placeholder:text-ink-faint/60"
              />
              <button
                type="button"
                title={skill.status === "local" || onBase ? "Remove skill" : "Hide skill in this version"}
                onClick={() => {
                  if (skill.status === "local" || onBase) deleteNodeHard(skill.id);
                  else setHidden(skill.id, true);
                }}
                className="pressable rounded-full p-0.5 text-ink-faint opacity-0 transition-opacity duration-150 hover:bg-sunken hover:text-ink group-hover/skill:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => addNode(node.id, "skill")}
          className="pressable flex items-center gap-1 rounded-full border border-dashed border-hairline-strong px-2.5 py-1 text-[12px] text-ink-faint transition-colors duration-150 hover:border-rose-300 hover:text-rose-500"
        >
          <PlusIcon className="size-3" />
          Skill
        </button>
      </div>
    </div>
  );
}

/** The fields for one entry, laid out per kind. */
export function EntryFields({ node }: { node: ResolvedNode }) {
  switch (node.kind) {
    case "experience":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="title" label="Title" placeholder="Senior Engineer" />
          <ProvenanceField node={node} field="company" label="Company" placeholder="Acme Corp" />
          <div className="grid grid-cols-3 gap-3.5">
            <DateField node={node} field="startDate" label="Start date" placeholder="Pick a date" />
            <DateField node={node} field="endDate" label="End date" placeholder="Pick a date" allowPresent />
            <ProvenanceField node={node} field="location" label="Location" placeholder="Remote" />
          </div>
          <BulletList parent={node} label="Highlights" />
        </div>
      );

    case "education":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="degree" label="Degree" placeholder="B.Sc." />
          <ProvenanceField node={node} field="school" label="School" placeholder="University…" />
          <ProvenanceField node={node} field="field" label="Field of study" placeholder="Computer Science" />
          <div className="grid grid-cols-3 gap-3.5">
            <DateField node={node} field="startDate" label="Start date" placeholder="Pick a date" />
            <DateField node={node} field="endDate" label="End date" placeholder="Pick a date" allowPresent />
            <ProvenanceField node={node} field="location" label="Location" placeholder="City" />
          </div>
          <BulletList parent={node} label="Details" />
        </div>
      );

    case "project":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="name" label="Project name" placeholder="OpenMetrics" />
          <ProvenanceField node={node} field="url" label="URL" placeholder="github.com/…" />
          <div className="grid grid-cols-2 gap-3.5">
            <DateField node={node} field="startDate" label="Start date" placeholder="Pick a date" />
            <DateField node={node} field="endDate" label="End date" placeholder="Pick a date" allowPresent />
          </div>
          <ProvenanceField
            node={node}
            field="description"
            label="Description"
            multiline
            rows={3}
            placeholder="One-liner about the project…"
          />
          <BulletList parent={node} label="Highlights" />
        </div>
      );

    case "skillGroup":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="name" label="Group name" placeholder="Languages" />
          <SkillChips node={node} />
        </div>
      );

    case "certification":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="name" label="Certification" placeholder="AWS SAA" />
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField node={node} field="issuer" label="Issuer" placeholder="Amazon Web Services" />
            <DateField node={node} field="date" label="Date" placeholder="Pick a date" />
          </div>
        </div>
      );

    case "reference":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="name" label="Name" placeholder="Jane Doe" />
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField node={node} field="title" label="Title" placeholder="Engineering Manager" />
            <ProvenanceField node={node} field="company" label="Company" placeholder="Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField node={node} field="email" label="Email" placeholder="jane@acme.com" />
            <ProvenanceField node={node} field="phone" label="Phone" placeholder="+1 555 000 0000" />
          </div>
        </div>
      );

    default:
      return null;
  }
}
