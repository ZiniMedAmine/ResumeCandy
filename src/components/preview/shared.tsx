"use client";

import { createContext, useContext } from "react";
import {
  DESIGN_DEFAULTS,
  formatResumeDate,
  type DesignSettings,
  type SectionColumn,
} from "@/lib/design";
import type { ResolvedNode, ResolvedTree, SectionType } from "@/lib/resume/types";
import { GlobeIcon, LinkIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icons";
import { sectionIcon } from "@/components/ui/section-icons";
import { blockProps, useBlockMargins } from "./paged-paper";

/**
 * Templates only ever walk the tree's roots. Asking for just that keeps them
 * renderable from a server component, where a resolved tree's `byId` Map
 * cannot cross the boundary.
 */
export type PreviewTree = Pick<ResolvedTree, "roots">;

export interface TemplateProps {
  tree: PreviewTree;
  design: DesignSettings;
  /** Show amber provenance dots on customized/local nodes (editor preview). */
  markCustomized: boolean;
}

export function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/* ------------------------------ design context ----------------------------- */

const DesignContext = createContext<DesignSettings>(DESIGN_DEFAULTS);

export function DesignProvider({
  design,
  children,
}: {
  design: DesignSettings;
  children: React.ReactNode;
}) {
  return <DesignContext.Provider value={design}>{children}</DesignContext.Provider>;
}

/**
 * The effective settings for the paper being rendered. Reading them from
 * context rather than threading a prop through every entry type is what lets
 * one set of primitives serve both templates.
 */
export function useDesignSettings(): DesignSettings {
  return useContext(DesignContext);
}

/** `em` size for an element whose offset is expressed in px off the base. */
export function emFor(design: DesignSettings, offsetPx: number): string {
  return `${(design.fontSize + offsetPx) / design.fontSize}em`;
}

/** The accent colour when this target is switched on, otherwise `undefined`. */
export function accentIf(on: boolean): string | undefined {
  return on ? "var(--accent)" : undefined;
}

/* --------------------------------- content --------------------------------- */

/**
 * Wraps a rendered node: carries data-node-id and the provenance dot for
 * customized/version-local content, and optionally acts as a pagination
 * block. Shared by every template.
 */
export function Marked({
  node,
  markCustomized,
  blockId,
  keepWithNext,
  children,
  className = "",
  style,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  /** Set to make this element atomic for page breaks. */
  blockId?: string;
  keepWithNext?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const margins = useBlockMargins();
  const customized = markCustomized && (node.status === "customized" || node.status === "local");
  const paging = blockId ? blockProps(margins, blockId, keepWithNext) : undefined;
  // The paginator's push has to survive being merged with a caller's style.
  const { style: pagingStyle, ...pagingAttrs } = paging ?? {};
  return (
    <div
      data-node-id={node.id}
      className={`relative ${className}`}
      {...pagingAttrs}
      style={style || pagingStyle ? { ...style, ...pagingStyle } : undefined}
    >
      {customized && (
        <span
          className="absolute -left-[0.9em] top-[0.45em] size-[0.42em] rounded-full bg-amber-400"
          title={node.status === "local" ? "Only in this version" : "Customized in this version"}
        />
      )}
      {children}
    </div>
  );
}

/** Contact entries with their icons, in display order. */
export function contactEntries(data: Record<string, unknown>) {
  return [
    { key: "email", icon: MailIcon, value: s(data.email), link: false },
    { key: "phone", icon: PhoneIcon, value: s(data.phone), link: false },
    { key: "location", icon: PinIcon, value: s(data.location), link: false },
    { key: "website", icon: GlobeIcon, value: s(data.website), link: true },
  ].filter((e) => e.value);
}

/** Date range "Mar 2022 – Jun 2024", in the version's chosen date format. */
export function dateRange(data: Record<string, unknown>, design: DesignSettings): string {
  const start = formatResumeDate(s(data.startDate), design.dateFormat);
  const end = formatResumeDate(s(data.endDate), design.dateFormat);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function visibleBullets(nodes: ResolvedNode[]): ResolvedNode[] {
  return nodes.filter((n) => n.kind === "bullet" && s(n.data.text));
}

/** Block id for a section's heading (the node id itself belongs to its body). */
export function titleBlockId(nodeId: string): string {
  return `${nodeId}:title`;
}

/* -------------------------------- columns ---------------------------------- */

const DEFAULT_SIDE_TYPES: SectionType[] = ["skills", "certifications", "references"];

/**
 * Which column a section belongs to. The choice lives on the section node, so
 * it layers per version through the same override system as every other field;
 * sections that have never been assigned fall back to a sensible default for
 * their type.
 */
export function sectionColumn(node: ResolvedNode): SectionColumn {
  const stored = node.data.column;
  if (stored === "main" || stored === "side" || stored === "full") return stored;
  return DEFAULT_SIDE_TYPES.includes(node.data.sectionType as SectionType) ? "side" : "main";
}

/* ------------------------------- primitives -------------------------------- */

/**
 * A section heading in whichever style the version asks for. All six styles
 * are one element with different borders/padding, so switching between them
 * never changes the block structure the paginator measured.
 */
export function SectionHeading({ node, blockId }: { node: ResolvedNode; blockId: string }) {
  const design = useDesignSettings();
  const margins = useBlockMargins();
  const { headingStyle, headingCase, headingIcons } = design;

  const accent = "var(--accent)";
  const textColor = design.accentHeadings ? accent : "#18181b";
  const ruleColor = design.accentHeadingLine ? accent : "#27272a";

  const style: React.CSSProperties = {
    fontSize: emFor(design, design.headingSize),
    color: textColor,
    textTransform: headingCase === "uppercase" ? "uppercase" : "capitalize",
    letterSpacing: headingCase === "uppercase" ? "0.06em" : "0.01em",
  };

  switch (headingStyle) {
    case "underline":
      style.borderBottom = `1.5px solid ${ruleColor}`;
      style.paddingBottom = "0.15em";
      break;
    case "double":
      style.borderTop = `1px solid ${ruleColor}`;
      style.borderBottom = `1px solid ${ruleColor}`;
      style.padding = "0.12em 0";
      break;
    case "box":
      style.border = `1.2px solid ${ruleColor}`;
      style.padding = "0.15em 0.5em";
      break;
    case "bar":
      style.borderLeft = `3px solid ${ruleColor}`;
      style.paddingLeft = "0.5em";
      break;
    case "background":
      style.background = design.accentHeadingLine ? accent : "#f4f4f5";
      style.color = design.accentHeadingLine ? "#ffffff" : textColor;
      style.padding = "0.18em 0.55em";
      style.borderRadius = "0.2em";
      break;
    default:
      break;
  }

  const Icon = sectionIcon(node.data.sectionType as SectionType);
  // The paginator's push arrives as a style too, so it has to be merged in
  // rather than spread over the styling this heading just computed.
  const { style: pagingStyle, ...paging } = blockProps(margins, blockId, true);

  return (
    <h2
      className="mb-[0.5em] flex items-center gap-[0.45em] font-bold"
      {...paging}
      style={{ ...style, ...pagingStyle }}
    >
      {headingIcons !== "none" && Icon && (
        <span
          className="inline-flex shrink-0 items-center justify-center"
          style={
            headingIcons === "filled"
              ? {
                  background: design.accentHeadings ? accent : "#27272a",
                  color: "#ffffff",
                  borderRadius: "0.25em",
                  padding: "0.18em",
                }
              : undefined
          }
        >
          <Icon className="size-[1em]" />
        </span>
      )}
      {s(node.data.title)}
    </h2>
  );
}

/**
 * The title line of an entry: title, subtitle and the date/location meta, laid
 * out per the Entries settings.
 *
 * `full` stacks everything at full width; `columns` keeps the meta in its own
 * column, on the right, on the left, or split with the date opposite the title
 * and the location opposite the subtitle.
 */
export function EntryHead({
  title,
  subtitle,
  date,
  location,
  paging,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  paging: ReturnType<typeof blockProps>;
}) {
  const design = useDesignSettings();
  const { datePosition, subtitlePlacement, entryStructure } = design;

  const titleStyle: React.CSSProperties = { fontSize: emFor(design, design.entryHeaderSize) };
  const metaColor = design.accentDates ? "var(--accent)" : "#52525b";
  const subtitleColor = design.accentSubtitle ? "var(--accent)" : "#3f3f46";

  const titleEl = (
    <span className="font-bold text-zinc-900" style={titleStyle}>
      {title}
    </span>
  );
  const subtitleEl = subtitle ? (
    <span className="text-[0.95em] italic" style={{ color: subtitleColor }}>
      {subtitle}
    </span>
  ) : null;
  const dateEl = date ? (
    <span className="tabular-nums" style={{ color: metaColor }}>
      {date}
    </span>
  ) : null;
  const locationEl = location ? <span style={{ color: metaColor }}>{location}</span> : null;

  // Full width: everything runs down the left edge, meta on its own line.
  if (entryStructure === "full") {
    return (
      <div {...paging}>
        <p>{titleEl}</p>
        {subtitleEl && <p>{subtitleEl}</p>}
        {(dateEl || locationEl) && (
          <p className="text-[0.88em]">
            {dateEl}
            {dateEl && locationEl && <span style={{ color: metaColor }}> · </span>}
            {locationEl}
          </p>
        )}
      </div>
    );
  }

  const meta = (
    <div
      className={`shrink-0 text-[0.88em] leading-snug ${datePosition === "left" ? "text-left" : "text-right"}`}
    >
      {dateEl && <p>{dateEl}</p>}
      {locationEl && <p>{locationEl}</p>}
    </div>
  );

  // Split: date sits opposite the title, location opposite the subtitle.
  if (datePosition === "split") {
    return (
      <div {...paging}>
        <div className="flex items-baseline justify-between gap-[1em]">
          <p className="min-w-0">
            {titleEl}
            {subtitlePlacement === "sameLine" && subtitleEl && (
              <>
                <span className="text-zinc-400">{" · "}</span>
                {subtitleEl}
              </>
            )}
          </p>
          {dateEl && <p className="shrink-0 text-[0.88em]">{dateEl}</p>}
        </div>
        {(subtitlePlacement === "below" && subtitleEl) || locationEl ? (
          <div className="flex items-baseline justify-between gap-[1em]">
            <p className="min-w-0">{subtitlePlacement === "below" ? subtitleEl : null}</p>
            {locationEl && <p className="shrink-0 text-[0.88em]">{locationEl}</p>}
          </div>
        ) : null}
      </div>
    );
  }

  const body = (
    <div className="min-w-0">
      <p>
        {titleEl}
        {subtitlePlacement === "sameLine" && subtitleEl && (
          <>
            <span className="text-zinc-400">{" · "}</span>
            {subtitleEl}
          </>
        )}
      </p>
      {subtitlePlacement === "below" && subtitleEl && <p>{subtitleEl}</p>}
    </div>
  );

  return (
    <div className="flex items-start justify-between gap-[1em]" {...paging}>
      {datePosition === "left" ? (
        <>
          {(dateEl || locationEl) && <div className="w-[7.5em]">{meta}</div>}
          {body}
        </>
      ) : (
        <>
          {body}
          {(dateEl || locationEl) && meta}
        </>
      )}
    </div>
  );
}

/** A bulleted list, honouring the accent-bullets toggle. */
export function BulletList({
  nodes,
  markCustomized,
}: {
  nodes: ResolvedNode[];
  markCustomized: boolean;
}) {
  const design = useDesignSettings();
  const margins = useBlockMargins();
  const bullets = visibleBullets(nodes);
  if (bullets.length === 0) return null;
  return (
    <ul className="mt-[0.25em] space-y-[0.15em]">
      {bullets.map((b) => (
        <li key={b.id} className="flex gap-[0.55em]" {...blockProps(margins, b.id)}>
          <span
            className="mt-[0.62em] size-[0.24em] shrink-0 rounded-full"
            style={{ background: design.accentBullets ? "var(--accent)" : "#3f3f46" }}
          />
          <Marked node={b} markCustomized={markCustomized} className="flex-1 text-[0.95em] text-zinc-700">
            {s(b.data.text)}
          </Marked>
        </li>
      ))}
    </ul>
  );
}

/** A URL rendered per the Link Styling settings. */
export function ResumeLink({ href, className = "" }: { href: string; className?: string }) {
  const design = useDesignSettings();
  if (!href) return null;
  return (
    <span
      className={`inline-flex items-baseline gap-[0.25em] ${className}`}
      style={{
        color: design.linkAccent ? "var(--accent)" : undefined,
        textDecoration: design.linkUnderline ? "underline" : undefined,
        textUnderlineOffset: "0.15em",
      }}
    >
      {design.linkIcon && <LinkIcon className="size-[0.85em] shrink-0 translate-y-[0.1em]" />}
      {href}
    </span>
  );
}

/**
 * The contact line under the name. `inline` wraps the details onto as few
 * lines as possible; `stacked` gives each its own line, which suits a narrow
 * left-aligned header.
 */
export function ContactLine({ data }: { data: Record<string, unknown> }) {
  const design = useDesignSettings();
  const contacts = contactEntries(data);
  if (contacts.length === 0) return null;

  const center = design.headerAlign === "center";
  const stacked = design.headerDetails === "stacked";
  const sep = design.headerSeparator;

  return (
    <p
      className={`mt-[0.5em] flex text-[0.85em] text-zinc-600 ${
        stacked
          ? `flex-col gap-y-[0.15em] ${center ? "items-center" : "items-start"}`
          : `flex-wrap items-center gap-y-[0.2em] ${center ? "justify-center" : ""} ${
              sep === "icon" ? "gap-x-[1.2em]" : "gap-x-[0.55em]"
            }`
      }`}
    >
      {contacts.map(({ key, icon: Icon, value, link }, i) => (
        <span key={key} className="inline-flex items-center gap-[0.35em]">
          {!stacked && i > 0 && sep !== "icon" && (
            <span className="text-zinc-400">{sep === "bullet" ? "·" : "|"}</span>
          )}
          {sep === "icon" && <Icon className="size-[1em] text-zinc-500" />}
          {link ? <ResumeLink href={value} /> : value}
        </span>
      ))}
    </p>
  );
}

/**
 * Lays the sections out in one or two columns.
 *
 * The two columns are separate pagination flows, so a break in one never
 * shifts the other. In `mix`, sections assigned `full` are rendered above the
 * column pair rather than interleaved with it: the paginator models a page as
 * a root flow followed by parallel sub-flows, and alternating bands would need
 * flows that resume where the previous band ended, which it cannot express.
 */
export function SectionColumns({
  sections,
  renderSection,
}: {
  sections: ResolvedNode[];
  renderSection: (node: ResolvedNode, opts: { sidebar: boolean }) => React.ReactNode;
}) {
  const design = useDesignSettings();

  if (design.columns === "one") {
    return <>{sections.map((n) => renderSection(n, { sidebar: false }))}</>;
  }

  const full = design.columns === "mix" ? sections.filter((n) => sectionColumn(n) === "full") : [];
  const rest = sections.filter((n) => !full.includes(n));
  const side = rest.filter((n) => sectionColumn(n) === "side");
  const main = rest.filter((n) => !side.includes(n));

  // With nothing in the sidebar there is no second column to draw.
  if (side.length === 0) {
    return (
      <>
        {full.map((n) => renderSection(n, { sidebar: false }))}
        {main.map((n) => renderSection(n, { sidebar: false }))}
      </>
    );
  }

  const sideFr = Math.min(0.45, Math.max(0.25, design.sidebarWidth));

  return (
    <>
      {full.map((n) => renderSection(n, { sidebar: false }))}
      <div
        className="grid gap-x-[2.2em]"
        style={{ gridTemplateColumns: `${1 - sideFr}fr ${sideFr}fr` }}
      >
        <div data-flow="main">{main.map((n) => renderSection(n, { sidebar: false }))}</div>
        <div data-flow="side" className="border-l border-zinc-200 pl-[1.6em]">
          {side.map((n) => renderSection(n, { sidebar: true }))}
        </div>
      </div>
    </>
  );
}

/** Optional circular photo in the header. Placeholder until uploads exist. */
export function HeaderPhoto({ data }: { data: Record<string, unknown> }) {
  const design = useDesignSettings();
  if (!design.showPhoto) return null;
  const url = s(data.photoUrl);
  return (
    <div
      className="size-[5.2em] shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100"
      style={url ? { backgroundImage: `url(${url})`, backgroundSize: "cover" } : undefined}
    >
      {!url && (
        <span className="flex h-full w-full items-center justify-center text-[0.7em] text-zinc-400">
          Photo
        </span>
      )}
    </div>
  );
}
