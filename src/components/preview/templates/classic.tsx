"use client";

import type { ResolvedNode } from "@/lib/resume/types";
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

/**
 * Classic — the timeless serif layout: centered header, small-caps ruled
 * section titles, dates in a right-hand column. Reads like a printed CV.
 *
 * Pagination blocks: the header, each section heading (kept with the entry
 * that follows), each entry's title line (kept with its first bullet), and
 * each bullet — so pages break between bullets, never through one.
 */
export function ClassicTemplate({ tree, design, markCustomized }: TemplateProps) {
  const header = tree.roots.find((n) => n.kind === "header");
  const sections = tree.roots.filter((n) => n.kind === "section");
  const fontClass = design.fontFamily === "serif" ? "font-serif" : "font-sans";

  return (
    <PagedPaper design={design} fontClass={fontClass}>
      {header && <Header node={header} markCustomized={markCustomized} />}
      {sections.map((section) => (
        <Section key={section.id} node={section} markCustomized={markCustomized} />
      ))}
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
      className="mb-[var(--sec-gap)] text-center"
    >
      <h1 className="text-[2em] font-bold leading-tight tracking-tight text-zinc-900">
        {s(d.fullName) || "Your Name"}
      </h1>
      {s(d.headline) && (
        <p className="mt-[0.1em] text-[1.08em] italic" style={{ color: "var(--accent)" }}>
          {s(d.headline)}
        </p>
      )}
      {contacts.length > 0 && (
        <p className="mx-auto mt-[0.5em] flex flex-wrap items-center justify-center gap-x-[1.2em] gap-y-[0.2em] text-[0.85em] text-zinc-600">
          {contacts.map(({ key, icon: Icon, value }) => (
            <span key={key} className="inline-flex items-center gap-[0.35em]">
              <Icon className="size-[1em] text-zinc-500" />
              {value}
            </span>
          ))}
        </p>
      )}
      {s(d.summary) && (
        <p className="mt-[0.8em] text-left text-[0.95em] leading-[inherit] text-zinc-700">
          {s(d.summary)}
        </p>
      )}
    </Marked>
  );
}

function Section({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const margins = useBlockMargins();
  if (node.children.length === 0) return null;
  return (
    <Marked node={node} markCustomized={markCustomized} className="mb-[var(--sec-gap)]">
      <h2
        className="mb-[0.5em] border-b-[1.5px] border-zinc-800 pb-[0.15em] text-[1em] font-bold uppercase tracking-[0.06em] text-zinc-900"
        {...blockProps(margins, titleBlockId(node.id), true)}
      >
        {s(node.data.title)}
      </h2>
      <div className="space-y-[var(--item-gap)]">
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
    <ul className="mt-[0.25em] space-y-[0.15em]">
      {bullets.map((b) => (
        <li key={b.id} className="flex gap-[0.55em]" {...blockProps(margins, b.id)}>
          <span className="mt-[0.62em] size-[0.22em] shrink-0 rounded-full bg-zinc-700" />
          <Marked node={b} markCustomized={markCustomized} className="flex-1 text-[0.95em] text-zinc-700">
            {s(b.data.text)}
          </Marked>
        </li>
      ))}
    </ul>
  );
}

/** Right-hand meta column: dates on top, location under. */
function Meta({ date, location }: { date: string; location: string }) {
  if (!date && !location) return null;
  return (
    <div className="shrink-0 text-right text-[0.88em] leading-snug text-zinc-600">
      {date && <p className="tabular-nums">{date}</p>}
      {location && <p>{location}</p>}
    </div>
  );
}

function Item({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const margins = useBlockMargins();
  const d = node.data;
  // The entry's title line is the block; it travels with its first bullet.
  const head = blockProps(margins, node.id, true);

  switch (node.kind) {
    case "experience":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <div className="flex items-start justify-between gap-[1em]" {...head}>
            <div className="min-w-0">
              <p className="font-bold text-zinc-900">{s(d.title) || "Role"}</p>
              {s(d.company) && (
                <p className="text-[0.95em] italic" style={{ color: "var(--accent)" }}>
                  {s(d.company)}
                </p>
              )}
            </div>
            <Meta date={dateRange(d)} location={s(d.location)} />
          </div>
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "education":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <div className="flex items-start justify-between gap-[1em]" {...head}>
            <div className="min-w-0">
              <p className="font-bold text-zinc-900">
                {[s(d.degree), s(d.field)].filter(Boolean).join(" — ") || "Degree"}
              </p>
              {s(d.school) && (
                <p className="text-[0.95em] italic" style={{ color: "var(--accent)" }}>
                  {s(d.school)}
                </p>
              )}
            </div>
            <Meta date={dateRange(d)} location={s(d.location)} />
          </div>
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "project":
      return (
        <Marked node={node} markCustomized={markCustomized}>
          <div className="flex items-start justify-between gap-[1em]" {...head}>
            <div className="min-w-0">
              <p>
                <span className="font-bold text-zinc-900">{s(d.name) || "Project"}</span>
                {s(d.url) && (
                  <span className="ml-[0.5em] text-[0.85em] text-zinc-500">{s(d.url)}</span>
                )}
              </p>
              {s(d.description) && <p className="text-[0.95em] text-zinc-700">{s(d.description)}</p>}
            </div>
            <Meta date={dateRange(d)} location="" />
          </div>
          <Bullets nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "skillGroup": {
      const skills = node.children.filter((c) => c.kind === "skill" && s(c.data.name));
      if (!s(node.data.name) && skills.length === 0) return null;
      return (
        <Marked
          node={node}
          markCustomized={markCustomized}
          blockId={node.id}
          className="text-[0.95em]"
        >
          {s(d.name) && <span className="font-bold text-zinc-900">{s(d.name)}: </span>}
          <span className="text-zinc-700">
            {skills.map((sk, i) => (
              <span key={sk.id}>
                {i > 0 && ", "}
                <Marked node={sk} markCustomized={markCustomized} className="inline-block">
                  {s(sk.data.name)}
                </Marked>
              </span>
            ))}
          </span>
        </Marked>
      );
    }

    case "certification":
      return (
        <Marked
          node={node}
          markCustomized={markCustomized}
          blockId={node.id}
          className="flex items-baseline justify-between gap-[1em]"
        >
          <p className="min-w-0">
            <span className="font-bold text-zinc-900">{s(d.name)}</span>
            {s(d.issuer) && <span className="text-[0.95em] text-zinc-600"> · {s(d.issuer)}</span>}
          </p>
          {s(d.date) && <p className="shrink-0 text-[0.88em] tabular-nums text-zinc-600">{s(d.date)}</p>}
        </Marked>
      );

    case "reference":
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          <p>
            <span className="font-bold text-zinc-900">{s(d.name)}</span>
            {(s(d.title) || s(d.company)) && (
              <span className="text-[0.95em] text-zinc-600">
                {" "}
                · {[s(d.title), s(d.company)].filter(Boolean).join(", ")}
              </span>
            )}
          </p>
          {(s(d.email) || s(d.phone)) && (
            <p className="text-[0.85em] text-zinc-500">
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
