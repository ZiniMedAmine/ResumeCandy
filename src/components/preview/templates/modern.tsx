"use client";

import { urlHref } from "@/lib/contacts";
import type { ResolvedNode } from "@/lib/resume/types";
import { PagedPaper, blockProps, useBlockMargins } from "../paged-paper";
import {
  BulletList,
  DesignProvider,
  EntryHead,
  Marked,
  PaperAnchor,
  ResumeHeader,
  ResumeLink,
  SectionColumns,
  SectionHeading,
  SkillGroupView,
  dateRange,
  s,
  titleBlockId,
  useDesignSettings,
  type TemplateProps,
} from "../shared";

/**
 * Modern — sans-serif, an accent rule under the header, and skill chips rather
 * than a comma list. It ships with the sidebar column switched on; like every
 * other choice here that is a setting, not a property of the template.
 *
 * The columns are marked as separate pagination flows, so a break in the
 * main column never shifts the sidebar and vice versa.
 */
export function ModernTemplate({ tree, design, markCustomized }: TemplateProps) {
  const header = tree.roots.find((n) => n.kind === "header");
  const sections = tree.roots.filter((n) => n.kind === "section");

  return (
    <DesignProvider design={design}>
      <PagedPaper
        design={design}
        footer={{ name: s(header?.data.fullName), email: s(header?.data.email) }}
      >
        {header && <ResumeHeader node={header} markCustomized={markCustomized} variant="modern" />}
        <SectionColumns
          sections={sections}
          renderSection={(node, { sidebar }) => (
            <Section key={node.id} node={node} markCustomized={markCustomized} sidebar={sidebar} />
          )}
        />
      </PagedPaper>
    </DesignProvider>
  );
}

function Section({
  node,
  markCustomized,
  sidebar,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  sidebar: boolean;
}) {
  if (node.children.length === 0) return null;
  return (
    <Marked node={node} markCustomized={markCustomized} className="mb-[var(--sec-gap)]">
      <SectionHeading node={node} blockId={titleBlockId(node.id)} />
      <div className={sidebar ? "space-y-[0.8em]" : "space-y-[var(--item-gap)]"}>
        {node.children.map((child) => (
          <Item key={child.id} node={child} markCustomized={markCustomized} />
        ))}
      </div>
    </Marked>
  );
}

function Item({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const design = useDesignSettings();
  const margins = useBlockMargins();
  const d = node.data;
  const head = blockProps(margins, node.id, true);

  switch (node.kind) {
    case "experience":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <EntryHead
            title={s(d.title) || "Role"}
            subtitle={s(d.company)}
            subtitleHref={urlHref(d.url)}
            date={dateRange(d, design)}
            location={s(d.location)}
            paging={head}
          />
          <BulletList nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "education":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <EntryHead
            title={[s(d.degree), s(d.field)].filter(Boolean).join(", ") || "Degree"}
            subtitle={s(d.school)}
            subtitleHref={urlHref(d.url)}
            date={dateRange(d, design)}
            location={s(d.location)}
            paging={head}
          />
          <BulletList nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "project":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <EntryHead titleHref={urlHref(d.url)} title={s(d.name) || "Project"} date={dateRange(d, design)} paging={head} />
          {s(d.url) && design.linkText === "url" && (
            <p className="text-[0.85em] text-zinc-500">
              <ResumeLink href={s(d.url)} />
            </p>
          )}
          {s(d.description) && <p className="text-[0.95em] text-zinc-700">{s(d.description)}</p>}
          <BulletList nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "skillGroup":
      return <SkillGroupView node={node} markCustomized={markCustomized} />;

    case "certification":
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          <p dir="auto" className="text-[0.92em] font-bold leading-snug text-zinc-900">
            <PaperAnchor href={urlHref(d.url)}>{s(d.name)}</PaperAnchor>
          </p>
          <p
            className="text-[0.82em]"
            style={{ color: design.accentDates ? "var(--accent)" : "#71717a" }}
          >
            {[s(d.issuer), dateRange({ startDate: d.date }, design)].filter(Boolean).join(" · ")}
          </p>
          {s(d.url) && design.linkText === "url" && (
            <p className="text-[0.8em] text-zinc-500">
              <ResumeLink href={s(d.url)} />
            </p>
          )}
        </Marked>
      );

    case "reference":
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          <p className="text-[0.92em] font-bold leading-snug text-zinc-900">{s(d.name)}</p>
          {(s(d.title) || s(d.company)) && (
            <p className="text-[0.85em] text-zinc-600">
              {[s(d.title), s(d.company)].filter(Boolean).join(", ")}
            </p>
          )}
          {(s(d.email) || s(d.phone)) && (
            <p className="text-[0.8em] text-zinc-500">
              {[s(d.email), s(d.phone)].filter(Boolean).join(" · ")}
            </p>
          )}
        </Marked>
      );

    case "language":
      return (
        <Marked
          node={node}
          markCustomized={markCustomized}
          blockId={node.id}
          className="flex items-baseline justify-between gap-[1em] text-[0.92em]"
        >
          <span className="font-bold text-zinc-900">{s(d.name)}</span>
          {s(d.level) && (
            <span
              className="shrink-0 text-[0.9em]"
              style={{ color: design.accentSubtitle ? "var(--accent)" : "#71717a" }}
            >
              {s(d.level)}
            </span>
          )}
        </Marked>
      );

    case "text":
      if (!s(d.text)) return null;
      return (
        <Marked
          node={node}
          markCustomized={markCustomized}
          blockId={node.id}
          dir="auto"
          className="text-[0.95em] leading-[inherit] text-zinc-700"
        >
          {s(d.text)}
        </Marked>
      );

    case "bullet":
      return <BulletList nodes={[node]} markCustomized={markCustomized} />;

    default:
      return null;
  }
}
