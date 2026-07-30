"use client";

import type { ResolvedNode, SectionType } from "@/lib/resume/types";
import { PagedPaper, blockProps, useBlockMargins } from "../paged-paper";
import {
  contactEntries,
  dateRange,
  Marked,
  s,
  titleBlockId,
  visibleBullets,
  type TemplateProps,
} from "../shared";

const SIDEBAR_TYPES: SectionType[] = ["skills", "certifications", "references"];

/**
 * Modern — sans-serif with an accent header band and a two-column body:
 * experience/projects/education in the main column, skills/certifications/
 * references in a sidebar. Falls back to one column when no sidebar content.
 *
 * The columns are marked as separate pagination flows, so a break in the
 * main column never shifts the sidebar and vice versa.
 */
export function ModernTemplate({ tree, design, markCustomized }: TemplateProps) {
  const header = tree.roots.find((n) => n.kind === "header");
  const sections = tree.roots.filter((n) => n.kind === "section");
  const fontClass = design.fontFamily === "serif" ? "font-serif" : "font-sans";

  const side = sections.filter(
    (n) => SIDEBAR_TYPES.includes(n.data.sectionType as SectionType) && n.children.length > 0,
  );
  const main = sections.filter((n) => !side.includes(n));

  return (
    <PagedPaper design={design} fontClass={fontClass}>
      {header && <Header node={header} markCustomized={markCustomized} />}
      {side.length > 0 ? (
        <div className="grid grid-cols-[1.9fr_1fr] gap-x-[2.2em]">
          <div data-flow="main">
            {main.map((n) => (
              <Section key={n.id} node={n} markCustomized={markCustomized} />
            ))}
          </div>
          <div data-flow="side" className="border-l border-zinc-200 pl-[1.6em]">
            {side.map((n) => (
              <Section key={n.id} node={n} markCustomized={markCustomized} sidebar />
            ))}
          </div>
        </div>
      ) : (
        main.map((n) => <Section key={n.id} node={n} markCustomized={markCustomized} />)
      )}
    </PagedPaper>
  );
}

function Header({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const d = node.data;
  const contacts = contactEntries(d);
  return (
    <Marked
      node={node}
      markCustomized={markCustomized}
      blockId={node.id}
      className="mb-[var(--sec-gap)]"
    >
      <h1 className="text-[1.9em] font-extrabold leading-tight tracking-tight text-zinc-900">
        {s(d.fullName) || "Your Name"}
      </h1>
      {s(d.headline) && (
        <p className="mt-[0.05em] text-[1.05em] font-semibold" style={{ color: "var(--accent)" }}>
          {s(d.headline)}
        </p>
      )}
      {contacts.length > 0 && (
        <p className="mt-[0.55em] flex flex-wrap items-center gap-x-[1.3em] gap-y-[0.25em] text-[0.85em] text-zinc-600">
          {contacts.map(({ key, icon: Icon, value }) => (
            <span key={key} className="inline-flex items-center gap-[0.35em]">
              <Icon className="size-[1em]" style={{ color: "var(--accent)" }} />
              {value}
            </span>
          ))}
        </p>
      )}
      {s(d.summary) && <p className="mt-[0.7em] text-[0.95em] text-zinc-700">{s(d.summary)}</p>}
      <div className="mt-[0.9em] h-[3px] w-[3.2em] rounded-full" style={{ background: "var(--accent)" }} />
    </Marked>
  );
}

function Section({
  node,
  markCustomized,
  sidebar = false,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  sidebar?: boolean;
}) {
  const margins = useBlockMargins();
  if (node.children.length === 0) return null;
  return (
    <Marked node={node} markCustomized={markCustomized} className="mb-[var(--sec-gap)]">
      <h2
        className="mb-[0.55em] flex items-center gap-[0.5em] text-[0.88em] font-bold uppercase tracking-[0.12em] text-zinc-900"
        {...blockProps(margins, titleBlockId(node.id), true)}
      >
        <span className="h-[0.85em] w-[3px] rounded-full" style={{ background: "var(--accent)" }} />
        {s(node.data.title)}
      </h2>
      <div className={sidebar ? "space-y-[0.8em]" : "space-y-[var(--item-gap)]"}>
        {node.children.map((child) => (
          <Item key={child.id} node={child} markCustomized={markCustomized} />
        ))}
      </div>
    </Marked>
  );
}

function Bullets({ nodes, markCustomized }: { nodes: ResolvedNode[]; markCustomized: boolean }) {
  const margins = useBlockMargins();
  const bullets = visibleBullets(nodes);
  if (bullets.length === 0) return null;
  return (
    <ul className="mt-[0.3em] space-y-[0.18em]">
      {bullets.map((b) => (
        <li key={b.id} className="flex gap-[0.55em]" {...blockProps(margins, b.id)}>
          <span
            className="mt-[0.6em] size-[0.26em] shrink-0 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          <Marked node={b} markCustomized={markCustomized} className="flex-1 text-[0.95em] text-zinc-700">
            {s(b.data.text)}
          </Marked>
        </li>
      ))}
    </ul>
  );
}

function ItemHead({
  title,
  subtitle,
  meta,
  paging,
}: {
  title: string;
  subtitle: string;
  meta: string;
  paging: ReturnType<typeof blockProps>;
}) {
  return (
    <div {...paging}>
      <div className="flex items-baseline justify-between gap-[1em]">
        <p className="min-w-0 font-bold text-zinc-900">{title}</p>
        {meta && <p className="shrink-0 text-[0.82em] tabular-nums text-zinc-500">{meta}</p>}
      </div>
      {subtitle && (
        <p className="text-[0.92em] font-semibold" style={{ color: "var(--accent)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Item({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const margins = useBlockMargins();
  const d = node.data;
  const head = blockProps(margins, node.id, true);

  switch (node.kind) {
    case "experience":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <ItemHead
            title={s(d.title) || "Role"}
            subtitle={[s(d.company), s(d.location)].filter(Boolean).join(" · ")}
            meta={dateRange(d)}
            paging={head}
          />
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "education":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <ItemHead
            title={[s(d.degree), s(d.field)].filter(Boolean).join(", ") || "Degree"}
            subtitle={[s(d.school), s(d.location)].filter(Boolean).join(" · ")}
            meta={dateRange(d)}
            paging={head}
          />
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "project":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <ItemHead title={s(d.name) || "Project"} subtitle={s(d.url)} meta={dateRange(d)} paging={head} />
          {s(d.description) && <p className="text-[0.95em] text-zinc-700">{s(d.description)}</p>}
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "skillGroup": {
      const skills = node.children.filter((c) => c.kind === "skill" && s(c.data.name));
      if (!s(d.name) && skills.length === 0) return null;
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          {s(d.name) && (
            <p className="mb-[0.35em] text-[0.85em] font-bold text-zinc-900">{s(d.name)}</p>
          )}
          <div className="flex flex-wrap gap-[0.35em]">
            {skills.map((sk) => (
              <Marked key={sk.id} node={sk} markCustomized={markCustomized} className="inline-block">
                <span className="inline-block rounded-[0.35em] border border-zinc-200 bg-zinc-50 px-[0.55em] py-[0.12em] text-[0.82em] text-zinc-700">
                  {s(sk.data.name)}
                </span>
              </Marked>
            ))}
          </div>
        </Marked>
      );
    }

    case "certification":
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          <p className="text-[0.92em] font-bold leading-snug text-zinc-900">{s(d.name)}</p>
          <p className="text-[0.82em] text-zinc-500">
            {[s(d.issuer), s(d.date)].filter(Boolean).join(" · ")}
          </p>
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

    case "bullet":
      return <Bullets nodes={[node]} markCustomized={markCustomized} />;

    default:
      return null;
  }
}
