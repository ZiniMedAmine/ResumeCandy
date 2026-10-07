"use client";

import { createContext, useContext } from "react";
import {
  DESIGN_DEFAULTS,
  fontStack,
  formatResumeDate,
  type DesignSettings,
  type SectionColumn,
} from "@/lib/design";
import { displayUrl, headerContacts, urlHref, type HeaderContactKind } from "@/lib/contacts";
import { localeOf } from "@/lib/locale";
import type { ResolvedNode, ResolvedTree, SectionType } from "@/lib/resume/types";
import { GlobeIcon, LinkIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icons";
import { ContactIcon } from "@/components/ui/contact-icons";
import { SectionIcon } from "@/components/ui/section-icons";
import { blockProps, useBlockMargins } from "./paged-paper";
import { usePreviewMode } from "./resume-preview";

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
  dir,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  /** Set to make this element atomic for page breaks. */
  blockId?: string;
  keepWithNext?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** "auto" lets this node's own text decide which way it reads. */
  dir?: "auto";
}) {
  const margins = useBlockMargins();
  const customized = markCustomized && (node.status === "customized" || node.status === "local");
  const paging = blockId ? blockProps(margins, blockId, keepWithNext) : undefined;
  // The paginator's push has to survive being merged with a caller's style.
  const { style: pagingStyle, ...pagingAttrs } = paging ?? {};
  return (
    <div
      data-node-id={node.id}
      dir={dir}
      className={`relative ${className}`}
      {...pagingAttrs}
      style={style || pagingStyle ? { ...style, ...pagingStyle } : undefined}
    >
      {customized && (
        <span
          className="absolute -start-[0.9em] top-[0.45em] size-[0.42em] rounded-full bg-amber-400"
          title={node.status === "local" ? "Only in this version" : "Customized in this version"}
        />
      )}
      {children}
    </div>
  );
}

/** Date range "Mar 2022 – Jun 2024", in the version's date format and language. */
export function dateRange(data: Record<string, unknown>, design: DesignSettings): string {
  const start = formatResumeDate(s(data.startDate), design);
  const end = formatResumeDate(s(data.endDate), design);
  if (start && end) return `${start} ${localeOf(design.language).rangeSeparator} ${end}`;
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
      // Inline-start, not left: the bar has to sit on the reading edge, which
      // is the right-hand one in Arabic.
      style.borderInlineStart = `3px solid ${ruleColor}`;
      style.paddingInlineStart = "0.5em";
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

  // The paginator's push arrives as a style too, so it has to be merged in
  // rather than spread over the styling this heading just computed.
  const { style: pagingStyle, ...paging } = blockProps(margins, blockId, true);

  return (
    <h2
      dir="auto"
      className="mb-[0.5em] flex items-center gap-[0.45em] font-bold"
      {...paging}
      style={{ ...style, ...pagingStyle }}
    >
      {headingIcons !== "none" && (
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
          <SectionIcon type={node.data.sectionType as SectionType} className="size-[1em]" />
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
  titleHref,
  subtitleHref,
  paging,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  /** Makes the title a link (a project's or certificate's own URL). */
  titleHref?: string | null;
  /** Makes the subtitle a link (the company's or school's website). */
  subtitleHref?: string | null;
  paging: ReturnType<typeof blockProps>;
}) {
  const design = useDesignSettings();
  const { datePosition, subtitlePlacement, entryStructure } = design;

  const titleStyle: React.CSSProperties = { fontSize: emFor(design, design.entryHeaderSize) };
  const metaColor = design.accentDates ? "var(--accent)" : "#52525b";
  const subtitleColor = design.accentSubtitle ? "var(--accent)" : "#3f3f46";

  // Each run follows its own text, not the paper's language. Translating a CV
  // happens field by field, so a half-translated version is the normal state
  // rather than an edge case: an English role title still has to read left to
  // right while it sits on an Arabic page waiting to be rewritten.
  const titleEl = (
    <span dir="auto" className="font-bold text-zinc-900" style={titleStyle}>
      <PaperAnchor href={titleHref}>{title}</PaperAnchor>
    </span>
  );
  const subtitleEl = subtitle ? (
    <span dir="auto" className="text-[0.95em] italic" style={{ color: subtitleColor }}>
      <PaperAnchor href={subtitleHref}>{subtitle}</PaperAnchor>
    </span>
  ) : null;
  // `auto` per element: a range of Arabic month names should read right to
  // left, but "03/2022 – 01/2024" has no strong character and must not be
  // flipped into "01/2024 – 03/2022" by the surrounding paragraph.
  const dateEl = date ? (
    <span dir="auto" className="tabular-nums" style={{ color: metaColor }}>
      {date}
    </span>
  ) : null;
  const locationEl = location ? (
    <span dir="auto" style={{ color: metaColor }}>
      {location}
    </span>
  ) : null;

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
      className={`shrink-0 text-[0.88em] leading-snug ${datePosition === "left" ? "text-start" : "text-end"}`}
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

/** A bulleted list, in the version's bullet style and colour. */
export function BulletList({
  nodes,
  markCustomized,
}: {
  nodes: ResolvedNode[];
  markCustomized: boolean;
}) {
  const margins = useBlockMargins();
  const bullets = visibleBullets(nodes);
  if (bullets.length === 0) return null;
  return (
    <ul className="mt-[0.25em] space-y-[0.15em]">
      {bullets.map((b) => (
        <li key={b.id} className="flex gap-[0.55em]" {...blockProps(margins, b.id)}>
          <BulletMarker />
          <Marked
            node={b}
            markCustomized={markCustomized}
            dir="auto"
            className="flex-1 text-[0.95em] text-zinc-700"
          >
            {s(b.data.text)}
          </Marked>
        </li>
      ))}
    </ul>
  );
}

/**
 * The marker in front of a bullet, drawn as a shape rather than typed as a
 * character: a "•" or "›" in the text layer is exactly the stray glyph a
 * parser glues onto the start of every achievement.
 */
export function BulletMarker() {
  const design = useDesignSettings();
  const color = design.accentBullets ? "var(--accent)" : "#3f3f46";
  switch (design.bulletStyle) {
    case "dash":
      return <span className="mt-[0.78em] h-[0.09em] w-[0.55em] shrink-0" style={{ background: color }} />;
    case "square":
      return <span className="mt-[0.6em] size-[0.26em] shrink-0" style={{ background: color }} />;
    case "arrow":
      return (
        <span className="mt-[0.5em] flex size-[0.42em] shrink-0 items-center justify-center rtl:-scale-x-100">
          <span
            className="size-[0.3em] rotate-45 border-e-[0.09em] border-t-[0.09em]"
            style={{ borderColor: color }}
          />
        </span>
      );
    default:
      return <span className="mt-[0.62em] size-[0.24em] shrink-0 rounded-full" style={{ background: color }} />;
  }
}

/**
 * A real anchor around printed text, so a browser-printed PDF keeps the link
 * clickable. Without an href it renders its children untouched.
 */
export function PaperAnchor({
  href,
  children,
  styled = false,
}: {
  href: string | null | undefined;
  children: React.ReactNode;
  /** Apply the Link Styling settings (accent colour, underline). */
  styled?: boolean;
}) {
  const design = useDesignSettings();
  const { thumbnail } = usePreviewMode();
  if (!href) return <>{children}</>;
  const style: React.CSSProperties = {
    color: styled && design.linkAccent ? "var(--accent)" : "inherit",
    textDecoration: design.linkUnderline ? "underline" : "none",
    textUnderlineOffset: "0.15em",
  };
  // A thumbnail is a picture of the page sitting inside a card link or a
  // picker button; an <a> in there would nest interactive content, which
  // HTML forbids and the browser "repairs" into a hydration mismatch. It
  // keeps the link's look without being one.
  if (thumbnail) return <span style={style}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
      {children}
    </a>
  );
}

/** A URL rendered per the Link Styling settings. Always LTR — URLs are. */
export function ResumeLink({ href, className = "" }: { href: string; className?: string }) {
  const design = useDesignSettings();
  if (!href) return null;
  const target = urlHref(href);
  return (
    <span dir="ltr" className={`inline-flex items-baseline gap-[0.25em] ${className}`}>
      {design.linkIcon && <LinkIcon className="size-[0.85em] shrink-0 translate-y-[0.1em]" />}
      <PaperAnchor href={target} styled>
        {target ? displayUrl(target) : href}
      </PaperAnchor>
    </span>
  );
}

/** The icon for one contact-line item: a header field's own, or the contact type's. */
function ContactLineIcon({ kind }: { kind: HeaderContactKind }) {
  const cls = "size-[1em] shrink-0";
  switch (kind) {
    case "email":
      return <MailIcon className={cls} />;
    case "phone":
      return <PhoneIcon className={cls} />;
    case "location":
      return <PinIcon className={cls} />;
    case "website":
      return <GlobeIcon className={cls} />;
    default:
      return <ContactIcon type={kind} className={cls} />;
  }
}

/**
 * The contact line under the name: email, phone, location, website, then the
 * header's links and details in the order the version arranged them.
 *
 * `inline` wraps the details onto as few lines as possible; `stacked` gives
 * each its own line, which suits a narrow left-aligned or split header. Every
 * item prints its text — the icons are decoration, so the line parses the
 * same with or without them.
 */
export function ContactLine({
  header,
  align,
  stacked,
  inverse = false,
}: {
  header: ResolvedNode;
  align: "start" | "center" | "end";
  stacked: boolean;
  /** White-on-accent, for the banner header. */
  inverse?: boolean;
}) {
  const design = useDesignSettings();
  const contacts = headerContacts(header, { locale: design.language, linkText: design.linkText });
  if (contacts.length === 0) return null;

  const sep = design.headerSeparator;
  const textColor = inverse ? "rgba(255,255,255,0.92)" : "#52525b";
  const iconColor = inverse ? "rgba(255,255,255,0.85)" : design.accentIcons ? "var(--accent)" : "#71717a";
  const justify = align === "center" ? "justify-center" : align === "end" ? "justify-end" : "";
  const items = align === "center" ? "items-center" : align === "end" ? "items-end" : "items-start";

  return (
    <p
      className={`mt-[0.5em] flex text-[0.85em] ${
        stacked
          ? `flex-col gap-y-[0.15em] ${items}`
          : `flex-wrap items-center gap-y-[0.2em] ${justify} ${sep === "icon" ? "gap-x-[1.2em]" : "gap-x-[0.55em]"}`
      }`}
      style={{ color: textColor }}
    >
      {contacts.map((c, i) => {
        return (
          <span key={c.key} className="inline-flex items-center gap-[0.35em]">
            {!stacked && i > 0 && sep !== "icon" && (
              <span style={{ color: inverse ? "rgba(255,255,255,0.6)" : "#a1a1aa" }}>
                {sep === "bullet" ? "·" : "|"}
              </span>
            )}
            {sep === "icon" && (
              <span className="inline-flex" style={{ color: iconColor }}>
                <ContactLineIcon kind={c.kind} />
              </span>
            )}
            <span dir={c.dir}>
              {c.prefix && <span className="font-semibold">{c.prefix}: </span>}
              {c.href && c.kind !== "email" && c.kind !== "phone" ? (
                <PaperAnchor href={c.href} styled={!inverse}>
                  {c.text}
                </PaperAnchor>
              ) : c.href ? (
                <PaperAnchor href={c.href}>{c.text}</PaperAnchor>
              ) : (
                c.text
              )}
            </span>
          </span>
        );
      })}
    </p>
  );
}

/**
 * The header: name, title, contact line and summary, in one of three
 * arrangements. Each template brings its own typographic voice (`variant`),
 * the version brings the arrangement.
 *
 * Whatever the arrangement, the DOM order is name → title → contacts →
 * summary, which is the order text extraction reads it in.
 */
export function ResumeHeader({
  node,
  markCustomized,
  variant,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  variant: "classic" | "modern";
}) {
  const design = useDesignSettings();
  const d = node.data;
  const layout = design.headerLayout;
  const banner = layout === "banner";
  const split = layout === "split";
  const center = !split && design.headerAlign === "center";
  const modern = variant === "modern";

  const name = (
    <h1
      dir="auto"
      className={`leading-tight tracking-tight ${modern ? "font-extrabold" : "font-bold"}`}
      style={{
        fontSize: emFor(design, design.nameSize),
        fontFamily: design.nameFont ? fontStack(design.nameFont) : undefined,
        color: banner ? "#ffffff" : design.accentName ? "var(--accent)" : "#18181b",
        textTransform: design.nameCase === "uppercase" ? "uppercase" : undefined,
        letterSpacing: design.nameCase === "uppercase" ? "0.04em" : undefined,
      }}
    >
      {s(d.fullName) || "Your Name"}
    </h1>
  );
  const headline = s(d.headline) ? (
    <p
      dir="auto"
      className={modern ? "mt-[0.05em] font-semibold" : "mt-[0.1em] italic"}
      style={{
        fontSize: emFor(design, design.titleSize),
        color: banner ? "rgba(255,255,255,0.88)" : design.accentSubtitle ? "var(--accent)" : "#3f3f46",
      }}
    >
      {s(d.headline)}
    </p>
  ) : null;
  const summary = s(d.summary) ? (
    <p dir="auto" className="mt-[0.8em] text-start text-[0.95em] leading-[inherit] text-zinc-700">
      {s(d.summary)}
    </p>
  ) : null;
  const rule = modern && !banner && (
    <div
      className={`mt-[0.9em] h-[3px] w-[3.2em] rounded-full ${center ? "mx-auto" : ""}`}
      style={{ background: "var(--accent)" }}
    />
  );

  if (split) {
    return (
      <Marked node={node} markCustomized={markCustomized} blockId={node.id} className="mb-[var(--sec-gap)]">
        <div className="flex items-center justify-between gap-[1.5em]">
          <div className="flex min-w-0 items-center gap-[1.2em]">
            <HeaderPhoto data={d} />
            <div className="min-w-0">
              {name}
              {headline}
            </div>
          </div>
          <div className="shrink-0 text-end">
            <ContactLine header={node} align="end" stacked />
          </div>
        </div>
        {summary}
        {rule}
      </Marked>
    );
  }

  const body = (
    <div className={`flex items-center gap-[1.2em] ${center ? "justify-center text-center" : "text-start"}`}>
      <HeaderPhoto data={d} />
      <div className="min-w-0">
        {name}
        {headline}
        <ContactLine
          header={node}
          align={center ? "center" : "start"}
          stacked={design.headerDetails === "stacked"}
          inverse={banner}
        />
      </div>
    </div>
  );

  return (
    <Marked node={node} markCustomized={markCustomized} blockId={node.id} className="mb-[var(--sec-gap)]">
      {banner ? (
        <div className="rounded-[0.35em] px-[1.4em] py-[1.2em]" style={{ background: "var(--accent)" }}>
          {body}
        </div>
      ) : (
        body
      )}
      {summary}
      {rule}
    </Marked>
  );
}

/**
 * A skill group as a sentence ("Languages: Go, Rust"), as chips, or as a
 * list. However it is drawn, the skills are separate text runs in order, so a
 * parser reads the same words either way.
 */
export function SkillGroupView({
  node,
  markCustomized,
}: {
  node: ResolvedNode;
  markCustomized: boolean;
}) {
  const design = useDesignSettings();
  const skills = node.children.filter((c) => c.kind === "skill" && s(c.data.name));
  const name = s(node.data.name);
  if (!name && skills.length === 0) return null;

  if (design.skillStyle === "inline") {
    return (
      <Marked node={node} markCustomized={markCustomized} blockId={node.id} className="text-[0.95em]">
        {name && <span dir="auto" className="font-bold text-zinc-900">{name}: </span>}
        <span className="text-zinc-700">
          {skills.map((sk, i) => (
            <span key={sk.id}>
              {i > 0 && ", "}
              <Marked node={sk} markCustomized={markCustomized} dir="auto" className="inline-block">
                {s(sk.data.name)}
              </Marked>
            </span>
          ))}
        </span>
      </Marked>
    );
  }

  const label = name ? (
    <p dir="auto" className="mb-[0.35em] text-[0.85em] font-bold text-zinc-900">
      {name}
    </p>
  ) : null;

  if (design.skillStyle === "list") {
    return (
      <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
        {label}
        <ul
          className="grid gap-x-[1em] gap-y-[0.1em] text-[0.92em] text-zinc-700"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(9em, 1fr))" }}
        >
          {skills.map((sk) => (
            <li key={sk.id} className="flex gap-[0.5em]">
              <BulletMarker />
              <Marked node={sk} markCustomized={markCustomized} dir="auto" className="min-w-0 flex-1">
                {s(sk.data.name)}
              </Marked>
            </li>
          ))}
        </ul>
      </Marked>
    );
  }

  return (
    <Marked node={node} markCustomized={markCustomized} blockId={node.id}>
      {label}
      <div className="flex flex-wrap gap-[0.35em]">
        {skills.map((sk) => (
          <Marked key={sk.id} node={sk} markCustomized={markCustomized} className="inline-block">
            <span
              dir="auto"
              className="inline-block rounded-[0.35em] border px-[0.55em] py-[0.12em] text-[0.82em]"
              style={
                design.accentBullets
                  ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
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
        <div data-flow="side" className="border-s border-zinc-200 ps-[1.6em]">
          {side.map((n) => renderSection(n, { sidebar: true }))}
        </div>
      </div>
    </>
  );
}

/**
 * The header photo, in the chosen shape and size. Uploaded photos are stored
 * on the header node as a small data URL, so they layer per version like any
 * other field; with none uploaded, a placeholder shows where it will sit.
 */
export function HeaderPhoto({ data }: { data: Record<string, unknown> }) {
  const design = useDesignSettings();
  const { print } = usePreviewMode();
  if (!design.showPhoto) return null;
  const url = s(data.photo) || s(data.photoUrl);
  // The placeholder is a hint for the editor, never something to print.
  if (!url && print) return null;
  const radius = design.photoShape === "circle" ? "9999px" : design.photoShape === "rounded" ? "0.6em" : "0";
  const size = `${design.photoSize}px`;
  return (
    <div
      className="shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL on the printed page, not a network image
        <img src={url} alt="" className="block h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[0.7em] text-zinc-400">
          Photo
        </span>
      )}
    </div>
  );
}
