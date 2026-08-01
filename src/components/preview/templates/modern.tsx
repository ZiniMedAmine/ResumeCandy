"use client";

import { fontStack } from "@/lib/design";
import type { ResolvedNode } from "@/lib/resume/types";
import { PagedPaper, blockProps, useBlockMargins } from "../paged-paper";
import {
  BulletList,
  ContactLine,
  DesignProvider,
  EntryHead,
  HeaderPhoto,
  Marked,
  ResumeLink,
  SectionColumns,
  SectionHeading,
  dateRange,
  emFor,
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
        {header && <Header node={header} markCustomized={markCustomized} />}
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

function Header({ node, markCustomized }: { node: ResolvedNode; markCustomized: boolean }) {
  const design = useDesignSettings();
  const d = node.data;
  const center = design.headerAlign === "center";

  return (
    <Marked
      node={node}
      markCustomized={markCustomized}
      blockId={node.id}
      className={`mb-[var(--sec-gap)] ${center ? "text-center" : "text-start"}`}
    >
      <div className={`flex items-center gap-[1.2em] ${center ? "justify-center" : ""}`}>
        <HeaderPhoto data={d} />
        <div className="min-w-0">
          <h1
            className="font-extrabold leading-tight tracking-tight"
            style={{
              fontSize: emFor(design, design.nameSize),
              fontFamily: design.nameFont ? fontStack(design.nameFont) : undefined,
              color: design.accentName ? "var(--accent)" : "#18181b",
            }}
          >
            {s(d.fullName) || "Your Name"}
          </h1>
          {s(d.headline) && (
            <p
              className="mt-[0.05em] font-semibold"
              style={{
                fontSize: emFor(design, design.titleSize),
                color: design.accentSubtitle ? "var(--accent)" : "#3f3f46",
              }}
            >
              {s(d.headline)}
            </p>
          )}
          <ContactLine data={d} />
        </div>
      </div>
      {s(d.summary) && <p dir="auto" className="mt-[0.7em] text-[0.95em] text-zinc-700">{s(d.summary)}</p>}
      <div
        className={`mt-[0.9em] h-[3px] w-[3.2em] rounded-full ${center ? "mx-auto" : ""}`}
        style={{ background: "var(--accent)" }}
      />
    </Marked>
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
          <EntryHead title={s(d.name) || "Project"} date={dateRange(d, design)} paging={head} />
          {s(d.url) && (
            <p className="text-[0.85em] text-zinc-500">
              <ResumeLink href={s(d.url)} />
            </p>
          )}
          {s(d.description) && <p className="text-[0.95em] text-zinc-700">{s(d.description)}</p>}
          <BulletList nodes={node.children} markCustomized={markCustomized} />
        </Marked>
      );

    case "skillGroup": {
      const skills = node.children.filter((c) => c.kind === "skill" && s(c.data.name));
      if (!s(d.name) && skills.length === 0) return null;
      return (
        <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
          {s(d.name) && <p className="mb-[0.35em] text-[0.85em] font-bold text-zinc-900">{s(d.name)}</p>}
          <div className="flex flex-wrap gap-[0.35em]">
            {skills.map((sk) => (
              <Marked key={sk.id} node={sk} markCustomized={markCustomized} className="inline-block">
                <span
                  className="inline-block rounded-[0.35em] border px-[0.55em] py-[0.12em] text-[0.82em]"
                  style={
                    design.accentBullets
                      ? {
                          borderColor: "var(--accent)",
                          color: "var(--accent)",
                          background: "transparent",
                        }
                      : { borderColor: "#e4e4e7", background: "#fafafa", color: "#3f3f46" }
                  }
                >
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
          <p
            className="text-[0.82em]"
            style={{ color: design.accentDates ? "var(--accent)" : "#71717a" }}
          >
            {[s(d.issuer), dateRange({ startDate: d.date }, design)].filter(Boolean).join(" · ")}
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
