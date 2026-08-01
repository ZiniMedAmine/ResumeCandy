"use client";

import { GripIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { describeDateValue } from "@/lib/date-value";
import { useI18n, useT, type I18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n";
import type { ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { DateField } from "./date-field";
import { HiddenGhost, LocalBadge, NodeControls } from "./node-controls";
import { ProvenanceField } from "./provenance-field";
import { dragClasses, useDragReorder } from "./use-drag-reorder";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * The one-line description shown for a collapsed entry: a bold title plus a
 * muted qualifier, so a list of entries stays scannable.
 *
 * The dictionary is passed in rather than read from a hook because this is a
 * plain function two components share; it only ever supplies the wording for
 * an entry that is still empty, since real content always wins.
 */
export function entrySummary(
  node: ResolvedNode,
  { t, fmt }: I18n,
): { title: string; subtitle: string } {
  const d = node.data;
  switch (node.kind) {
    case "experience":
      return { title: s(d.title) || t.summary.untitledRole, subtitle: s(d.company) };
    case "education":
      return {
        title: [s(d.degree), s(d.field)].filter(Boolean).join(", ") || t.summary.untitledDegree,
        subtitle: s(d.school),
      };
    case "project":
      return {
        title: s(d.name) || t.summary.untitledProject,
        subtitle: s(d.url) || s(d.description),
      };
    case "skillGroup": {
      const count = node.children.filter((c) => c.kind === "skill" && !c.hidden).length;
      return {
        title: s(d.name) || t.summary.untitledGroup,
        subtitle: fmt(t.summary.skillCount, { n: count }),
      };
    }
    case "certification":
      return {
        title: s(d.name) || t.summary.untitledCertification,
        subtitle: [s(d.issuer), describeDateValue(d.date)].filter(Boolean).join(" · "),
      };
    case "reference":
      return {
        title: s(d.name) || t.summary.untitledReference,
        subtitle: [s(d.title), s(d.company)].filter(Boolean).join(", "),
      };
    case "language":
      return { title: s(d.name) || t.summary.untitledLanguage, subtitle: s(d.level) };
    case "text": {
      const body = s(d.text);
      return {
        title: body ? (body.length > 60 ? `${body.slice(0, 60)}…` : body) : t.summary.emptyParagraph,
        subtitle: "",
      };
    }
    default:
      return { title: t.kind.entry, subtitle: "" };
  }
}

/** Human name for an entry kind, used as context in the editor header. */
export function entryKindLabel(node: ResolvedNode, t: Dictionary): string {
  // A free paragraph reads better as "Paragraph" than as the node kind "Text".
  if (node.kind === "text") return t.kind.paragraph;
  return t.kind[node.kind] ?? t.kind.entry;
}

function BulletList({ parent, label }: { parent: ResolvedNode; label: string }) {
  const addNode = useResumeStore((s) => s.addNode);
  const moveNodeTo = useResumeStore((s) => s.moveNodeTo);
  const t = useT();
  const bullets = parent.children.filter((c) => c.kind === "bullet");
  const firstBulletIndex = Math.max(0, parent.children.findIndex((c) => c.kind === "bullet"));
  // Handle-gated: the row is mostly textarea, which has to stay selectable.
  const drag = useDragReorder((id, to) => moveNodeTo(id, to + firstBulletIndex), {
    requireHandle: true,
  });

  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">{label}</p>
      <div className="space-y-2">
        {bullets.map((b, i) =>
          b.hidden ? (
            <HiddenGhost key={b.id} node={b} />
          ) : (
            <div
              key={b.id}
              {...drag.itemProps(b.id, i)}
              className={`group/bullet flex items-start gap-1.5 rounded-xl ${dragClasses(
                drag.draggingId === b.id,
                drag.dropEdge(i, bullets.length),
              )}`}
            >
              <span
                {...drag.handleProps(b.id)}
                className="mt-2.5 flex size-5 shrink-0 cursor-grab items-center justify-center text-ink-faint/30 transition-colors duration-150 select-none group-hover/bullet:text-ink-faint active:cursor-grabbing"
                title={t.fields.dragToReorder}
              >
                <GripIcon className="size-3.5" />
              </span>
              <ProvenanceField
                node={b}
                field="text"
                multiline
                rows={2}
                placeholder={t.fields.placeholder.bullet}
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
          {t.fields.addBullet}
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
  const t = useT();

  const skills = node.children.filter((c) => c.kind === "skill");

  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
        {t.fields.skills}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((skill) => {
          const customized = skill.status === "customized" && skill.customizedFields.includes("name");
          if (skill.hidden) {
            return (
              <button
                key={skill.id}
                type="button"
                dir="auto"
                onClick={() => setHidden(skill.id, false)}
                className="pressable rounded-full border border-dashed border-hairline-strong px-2.5 py-1 text-[12px] text-ink-faint line-through transition-colors duration-150 hover:border-rose-300 hover:text-rose-500"
                title={t.fields.hiddenSkill}
              >
                {String(skill.data.name ?? "")}
              </button>
            );
          }
          return (
            <span
              key={skill.id}
              className={`group/skill flex items-center gap-1 rounded-full border py-1 ps-3 pe-1.5 text-[12px] transition-colors duration-150 ${
                customized
                  ? "border-amber-200/90 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/[0.07]"
                  : skill.status === "local"
                    ? "border-violet-200/70 bg-violet-50/40 dark:border-violet-500/25 dark:bg-violet-500/[0.07]"
                    : "border-hairline bg-surface"
              }`}
            >
              <input
                value={String(skill.data.name ?? "")}
                placeholder={t.fields.placeholder.skill}
                dir="auto"
                size={Math.max(3, String(skill.data.name ?? "").length)}
                onChange={(e) => editField(skill.id, "name", e.target.value)}
                className="bg-transparent text-ink outline-none placeholder:text-ink-faint/60"
              />
              <button
                type="button"
                title={
                  skill.status === "local" || onBase ? t.fields.removeSkill : t.fields.hideSkill
                }
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
          {t.fields.addSkill}
        </button>
      </div>
    </div>
  );
}

/** The fields for one entry, laid out per kind. */
export function EntryFields({ node }: { node: ResolvedNode }) {
  const { t } = useI18n();
  const ph = t.fields.placeholder;

  switch (node.kind) {
    case "experience":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="title" label={t.field.title} placeholder={ph.title} />
          <ProvenanceField
            node={node}
            field="company"
            label={t.field.company}
            placeholder={ph.company}
          />
          <div className="grid grid-cols-3 gap-3.5">
            <DateField node={node} field="startDate" label={t.field.startDate} />
            <DateField node={node} field="endDate" label={t.field.endDate} allowPresent />
            <ProvenanceField
              node={node}
              field="location"
              label={t.field.location}
              placeholder={ph.location}
            />
          </div>
          <BulletList parent={node} label={t.fields.highlights} />
        </div>
      );

    case "education":
      return (
        <div className="space-y-4">
          <ProvenanceField node={node} field="degree" label={t.field.degree} placeholder={ph.degree} />
          <ProvenanceField node={node} field="school" label={t.field.school} placeholder={ph.school} />
          <ProvenanceField node={node} field="field" label={t.field.field} placeholder={ph.field} />
          <div className="grid grid-cols-3 gap-3.5">
            <DateField node={node} field="startDate" label={t.field.startDate} />
            <DateField node={node} field="endDate" label={t.field.endDate} allowPresent />
            <ProvenanceField
              node={node}
              field="location"
              label={t.field.location}
              placeholder={ph.city}
            />
          </div>
          <BulletList parent={node} label={t.fields.details} />
        </div>
      );

    case "project":
      return (
        <div className="space-y-4">
          <ProvenanceField
            node={node}
            field="name"
            label={t.fields.projectName}
            placeholder={ph.projectName}
          />
          <ProvenanceField node={node} field="url" label={t.field.url} placeholder={ph.url} />
          <div className="grid grid-cols-2 gap-3.5">
            <DateField node={node} field="startDate" label={t.field.startDate} />
            <DateField node={node} field="endDate" label={t.field.endDate} allowPresent />
          </div>
          <ProvenanceField
            node={node}
            field="description"
            label={t.field.description}
            multiline
            rows={3}
            placeholder={ph.projectDescription}
          />
          <BulletList parent={node} label={t.fields.highlights} />
        </div>
      );

    case "skillGroup":
      return (
        <div className="space-y-4">
          <ProvenanceField
            node={node}
            field="name"
            label={t.fields.groupName}
            placeholder={ph.groupName}
          />
          <SkillChips node={node} />
        </div>
      );

    case "certification":
      return (
        <div className="space-y-4">
          <ProvenanceField
            node={node}
            field="name"
            label={t.fields.certification}
            placeholder={ph.certification}
          />
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField
              node={node}
              field="issuer"
              label={t.field.issuer}
              placeholder={ph.issuer}
            />
            <DateField node={node} field="date" label={t.field.date} />
          </div>
        </div>
      );

    case "reference":
      return (
        <div className="space-y-4">
          <ProvenanceField
            node={node}
            field="name"
            label={t.field.name}
            placeholder={ph.referenceName}
          />
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField
              node={node}
              field="title"
              label={t.field.title}
              placeholder={ph.referenceTitle}
            />
            <ProvenanceField
              node={node}
              field="company"
              label={t.field.company}
              placeholder={ph.company}
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <ProvenanceField
              node={node}
              field="email"
              label={t.field.email}
              placeholder={ph.referenceEmail}
            />
            <ProvenanceField node={node} field="phone" label={t.field.phone} placeholder={ph.phone} />
          </div>
        </div>
      );

    case "language":
      return (
        <div className="grid grid-cols-2 gap-3.5">
          <ProvenanceField
            node={node}
            field="name"
            label={t.fields.language}
            placeholder={ph.languageName}
          />
          <ProvenanceField node={node} field="level" label={t.field.level} placeholder={ph.level} />
        </div>
      );

    case "text":
      return (
        <ProvenanceField
          node={node}
          field="text"
          label={t.field.text}
          multiline
          rows={4}
          placeholder={ph.paragraph}
        />
      );

    default:
      return null;
  }
}
