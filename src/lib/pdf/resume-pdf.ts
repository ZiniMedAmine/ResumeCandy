"use client";

import type { jsPDF } from "jspdf";
import { displayUrl, headerContacts, urlHref, type HeaderContact } from "@/lib/contacts";
import { PAGE_FORMATS, formatResumeDate, isRtl, type DesignSettings, type FontId } from "@/lib/design";
import { localeOf } from "@/lib/locale";
import type { ResolvedNode } from "@/lib/resume/types";
import { hasRichText, parseRichText, type TextRun } from "@/lib/rich-text";

type PdfDocument = jsPDF;
type PdfFormat = "a4" | "letter" | "legal";
type PdfFont = string;

export interface ResumePdfInput {
  tree: { roots: ResolvedNode[] };
  design: DesignSettings;
  resumeName: string;
  versionName: string;
  isBaseVersion: boolean;
}

const MM_PER_CSS_PIXEL = 25.4 / 96;
const PAGE_FORMAT_BY_DESIGN: Record<DesignSettings["pageFormat"], PdfFormat> = {
  a4: "a4",
  letter: "letter",
  legal: "legal",
};

interface PdfFontRegistration {
  family: string;
  fallback: "times" | "helvetica";
  /** Absent for families PDF readers already have — nothing to embed. */
  files?: Record<"normal" | "bold" | "italic", string>;
}

/**
 * Only the two bundled families ship as embedded TTFs. The rest are the
 * fonts every PDF reader already carries, so they map onto a base-14 face
 * rather than adding a megabyte of glyphs to a two-page resume.
 */
const PDF_FONT_REGISTRY: Record<FontId, PdfFontRegistration> = {
  serif: {
    family: "ResumeCandySourceSerif",
    fallback: "times",
    files: {
      normal: "/pdf-fonts/SourceSerif4-Regular.ttf",
      bold: "/pdf-fonts/SourceSerif4-Bold.ttf",
      italic: "/pdf-fonts/SourceSerif4-Italic.ttf",
    },
  },
  sans: {
    family: "ResumeCandyGeist",
    fallback: "helvetica",
    files: {
      normal: "/pdf-fonts/Geist-Regular.ttf",
      bold: "/pdf-fonts/Geist-Bold.ttf",
      italic: "/pdf-fonts/Geist-Italic.ttf",
    },
  },
  // Arabic script has no italic tradition, so the upright face is registered
  // for the italic style too: a real Naskh is the correct rendering of an
  // "italic" subtitle, and a synthetic oblique would just look broken.
  //
  // Both families carry a full Latin set as well as Arabic, which is a hard
  // requirement rather than a nicety: jsPDF binds one font per run with no
  // fallback, so an Arabic-only face would silently drop every email address,
  // URL and Latin company name from the exported PDF.
  naskh: {
    family: "ResumeCandyAmiri",
    fallback: "times",
    files: {
      normal: "/pdf-fonts/Amiri-Regular.ttf",
      bold: "/pdf-fonts/Amiri-Bold.ttf",
      italic: "/pdf-fonts/Amiri-Regular.ttf",
    },
  },
  arabicSans: {
    family: "ResumeCandyIBMPlexSansArabic",
    fallback: "helvetica",
    files: {
      normal: "/pdf-fonts/IBMPlexSansArabic-Regular.ttf",
      bold: "/pdf-fonts/IBMPlexSansArabic-Bold.ttf",
      italic: "/pdf-fonts/IBMPlexSansArabic-Regular.ttf",
    },
  },
  georgia: { family: "times", fallback: "times" },
  times: { family: "times", fallback: "times" },
  garamond: { family: "times", fallback: "times" },
  arial: { family: "helvetica", fallback: "helvetica" },
  helvetica: { family: "helvetica", fallback: "helvetica" },
  verdana: { family: "helvetica", fallback: "helvetica" },
  tahoma: { family: "helvetica", fallback: "helvetica" },
  trebuchet: { family: "helvetica", fallback: "helvetica" },
};

/**
 * The PDF renderer deliberately works from the resolved version tree instead
 * of the preview DOM. Every glyph is written as PDF text, making the result
 * selectable and searchable instead of a canvas snapshot — and every link is
 * a real link annotation laid over text that also prints the address, so a
 * reader can click it and a parser can read it.
 */
export async function downloadResumePdf(input: ResumePdfInput): Promise<void> {
  const document = await createResumePdf(input);
  const name = documentName(input.resumeName, input.versionName, input.isBaseVersion);
  await document.save(`${safeFileName(name)}.pdf`, { returnPromise: true });
}

/** Build a semantic PDF without triggering a browser download. */
export async function createResumePdf(input: ResumePdfInput): Promise<PdfDocument> {
  const { document, writer } = await openDocument(input, "Resume");
  writer.render(input.tree.roots);
  return document;
}

/**
 * The cover letter as its own PDF, set in the résumé's fonts, colours and
 * margins so the two read as one application.
 */
export async function downloadCoverLetterPdf(input: ResumePdfInput & { letter: string }): Promise<void> {
  const { document, writer } = await openDocument(input, "Cover letter");
  writer.renderLetter(headerOf(input.tree.roots), input.letter);
  const name = documentName(input.resumeName, input.versionName, input.isBaseVersion);
  await document.save(`${safeFileName(`${name} cover letter`)}.pdf`, { returnPromise: true });
}

async function openDocument(input: ResumePdfInput, subject: string) {
  const { jsPDF } = await import("jspdf");
  const page = PAGE_FORMATS[input.design.pageFormat];
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: PAGE_FORMAT_BY_DESIGN[input.design.pageFormat],
    compress: true,
  });
  const name = documentName(input.resumeName, input.versionName, input.isBaseVersion);
  const header = headerOf(input.tree.roots);

  document.setProperties({
    title: name,
    subject,
    author: header ? text(header.data.fullName) || undefined : undefined,
    keywords: "resume,curriculum vitae,CV",
  });

  // Tells readers to page right-to-left and put the scrollbar on the left.
  if (isRtl(input.design)) document.viewerPreferences({ Direction: "R2L" });

  const font = await registerPdfFont(document, input.design.fontFamily);
  const nameFont =
    input.design.nameFont && input.design.nameFont !== input.design.fontFamily
      ? await registerPdfFont(document, input.design.nameFont)
      : font;
  const writer = new PdfWriter(document, input.design, page.width * MM_PER_CSS_PIXEL, page.height * MM_PER_CSS_PIXEL, {
    body: font,
    name: nameFont,
  });
  return { document, writer };
}

async function registerPdfFont(document: PdfDocument, id: FontId | null): Promise<PdfFont> {
  const registration = PDF_FONT_REGISTRY[id ?? "serif"] ?? PDF_FONT_REGISTRY.serif;
  // Node-based unit tests have no public asset origin. Browser exports always
  // embed the assets; the fallback keeps the semantic renderer testable.
  if (typeof window === "undefined" || !registration.files) return registration.fallback;
  if (document.getFontList()[registration.family]) return registration.family;

  const assets = await Promise.all(
    Object.entries(registration.files).map(async ([style, path]) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Could not load PDF font: ${path}`);
      return { style: style as "normal" | "bold" | "italic", path, data: await response.arrayBuffer() };
    }),
  );
  for (const asset of assets) {
    const fileName = asset.path.split("/").pop()!;
    document.addFileToVFS(fileName, arrayBufferToBase64(asset.data));
    document.addFont(fileName, registration.family, asset.style);
  }
  return registration.family;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/* --------------------------------- writer --------------------------------- */

type FontStyle = "normal" | "bold" | "italic";

/**
 * A vertical run of content with its own cursor. One column is one flow; two
 * columns are two flows that each break onto new pages on their own, which is
 * the same model the on-screen paginator uses — so a break in the main column
 * never shifts the sidebar.
 */
interface Flow {
  x: number;
  width: number;
  page: number;
  y: number;
}

interface TextStyle {
  scale: number;
  style: FontStyle;
  color: string;
  font?: PdfFont;
}

/** One wrapped line of text whose words may switch between weights. */
type RichLine = TextRun[];

/** Text colours, matching the preview's zinc palette. */
const INK = "#18181b";
const BODY = "#3f3f46";
const MUTED = "#52525b";
const FAINT = "#71717a";
const RULE = "#27272a";

class PdfWriter {
  private readonly doc: PdfDocument;
  private readonly d: DesignSettings;
  private readonly width: number;
  private readonly height: number;
  private readonly marginX: number;
  private readonly top: number;
  private readonly bottom: number;
  private readonly fonts: { body: PdfFont; name: PdfFont };
  /** Base font size in points. */
  private readonly basePt: number;
  /** One line of body text, in mm. */
  private readonly baseLh: number;
  private readonly rtl: boolean;
  private readonly accent: string;

  constructor(
    doc: PdfDocument,
    design: DesignSettings,
    width: number,
    height: number,
    fonts: { body: PdfFont; name: PdfFont },
  ) {
    this.doc = doc;
    this.d = design;
    this.width = width;
    this.height = height;
    this.marginX = design.marginX * MM_PER_CSS_PIXEL;
    this.top = design.marginY * MM_PER_CSS_PIXEL;
    this.bottom = height - this.top;
    this.fonts = fonts;
    this.basePt = design.fontSize * 0.75;
    this.baseLh = this.basePt * PT_TO_MM * design.lineHeight;
    this.rtl = isRtl(design);
    this.accent = design.accentColor;
  }

  /* ------------------------------- document -------------------------------- */

  render(roots: ResolvedNode[]) {
    const header = headerOf(roots);
    const sections = sectionsOf(roots).filter((s) => s.children.length > 0);
    const full: Flow = { x: this.marginX, width: this.width - this.marginX * 2, page: 1, y: this.top };

    if (header) this.header(full, header);

    if (this.d.columns === "one") {
      for (const section of sections) this.section(full, section);
    } else {
      const spanning = this.d.columns === "mix" ? sections.filter((s) => sectionColumn(s) === "full") : [];
      const rest = sections.filter((s) => !spanning.includes(s));
      const side = rest.filter((s) => sectionColumn(s) === "side");
      const main = rest.filter((s) => !side.includes(s));
      for (const section of spanning) this.section(full, section);

      if (side.length === 0) {
        for (const section of main) this.section(full, section);
      } else {
        const gap = 2.2 * this.em();
        const sideFr = Math.min(0.45, Math.max(0.25, this.d.sidebarWidth));
        const mainWidth = (full.width - gap) * (1 - sideFr);
        const sideX = full.x + mainWidth + gap;
        const mainFlow: Flow = { x: full.x, width: mainWidth, page: full.page, y: full.y };
        // The sidebar's divider and inset, as on screen.
        const inset = 1.6 * this.em();
        const sideFlow: Flow = { x: sideX + inset, width: full.width - mainWidth - gap - inset, page: full.page, y: full.y };
        const startPage = full.page;
        const startY = full.y;
        for (const section of main) this.section(mainFlow, section);
        for (const section of side) this.section(sideFlow, section);
        this.sideRule(sideX, startPage, startY, sideFlow);
      }
    }

    this.footer(header);
  }

  /** A letter: the sender's name and details, a rule, then the paragraphs. */
  renderLetter(header: ResolvedNode | undefined, letter: string) {
    const flow: Flow = { x: this.marginX, width: this.width - this.marginX * 2, page: 1, y: this.top };
    if (header) {
      const d = header.data;
      const nameStyle: TextStyle = { scale: 1.6, style: "bold", color: INK, font: this.fonts.name };
      this.lines(flow, this.wrap(text(d.fullName), flow.width, nameStyle), nameStyle);
      const details = [text(d.email), text(d.phone), text(d.location)].filter(Boolean).join("  ·  ");
      const detailStyle: TextStyle = { scale: 0.9, style: "normal", color: MUTED };
      this.lines(flow, this.wrap(details, flow.width, detailStyle), detailStyle);
      flow.y += 0.9 * this.em();
      this.on(flow);
      this.doc.setDrawColor(this.accent);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.mx(flow.x), flow.y, this.mx(flow.x + flow.width), flow.y);
      flow.y += 1.6 * this.em();
    }
    const body: TextStyle = { scale: 1, style: "normal", color: BODY };
    for (const paragraph of letter.split(/\n\s*\n/)) {
      if (!paragraph.trim()) continue;
      this.lines(flow, this.wrap(paragraph.trim(), flow.width, body), body);
      flow.y += 0.8 * this.em();
    }
  }

  /** The thin divider down the sidebar's reading-start edge, on every page it spans. */
  private sideRule(x: number, startPage: number, startY: number, side: Flow) {
    this.doc.setDrawColor("#e4e4e7");
    this.doc.setLineWidth(0.25);
    for (let page = startPage; page <= side.page; page++) {
      this.doc.setPage(page);
      const y1 = page === startPage ? startY : this.top;
      const y2 = page === side.page ? side.y : this.bottom;
      if (y2 > y1) this.doc.line(this.mx(x), y1, this.mx(x), y2);
    }
  }

  private footer(header: ResolvedNode | undefined) {
    const parts = [
      this.d.footerName ? text(header?.data.fullName) : "",
      this.d.footerEmail ? text(header?.data.email) : "",
    ].filter(Boolean);
    if (parts.length === 0 && !this.d.footerPageNumbers) return;
    const pages = this.doc.getNumberOfPages();
    const baseline = this.height - Math.min(14, this.d.marginY / 2) * MM_PER_CSS_PIXEL;
    const scale = 10 / this.d.fontSize;
    for (let page = 1; page <= pages; page++) {
      this.doc.setPage(page);
      this.setText({ scale, style: "normal", color: "#a1a1aa" });
      if (parts.length) this.put(parts.join(" · "), this.marginX, baseline);
      if (this.d.footerPageNumbers) this.putEnd(`${page} / ${pages}`, this.width - this.marginX, baseline);
    }
  }

  /* ------------------------------- direction ------------------------------- */

  /**
   * Mirrors an absolute x about the page centre when the CV reads right to
   * left.
   *
   * Because the content box is symmetric — the same marginX on both edges —
   * the mirror of x is simply `width - x`. Every measurement stays in one
   * left-to-right coordinate system and only the moment of drawing flips,
   * which is why flows, columns and indents need no RTL branches of their
   * own: the main column starting at marginX lands on the right-hand side of
   * the sheet by itself.
   */
  private mx(x: number): number {
    return this.rtl ? this.width - x : x;
  }

  /** Top-left corner for a rectangle whose reading start is at `x`. */
  private rectX(x: number, w: number): number {
    return this.rtl ? this.width - x - w : x;
  }

  /**
   * jsPDF's bidi engine is a pass-through by default (`isInputVisual: true`).
   * Stored text is in logical order, so RTL output needs a real reorder into
   * the visual order a PDF draws glyphs in.
   *
   * `isOutputRtl` has to be pinned false: left undefined, jsPDF infers it from
   * the string itself and an Arabic line would be flipped straight back into
   * logical order. `isInputRtl` is deliberately left undefined so each line
   * takes its base direction from its own first strong character — a Latin
   * company name or URL inside an Arabic résumé still reads left to right.
   */
  private opts(align: "left" | "right" | "center") {
    return this.rtl
      ? { align, isInputVisual: false, isOutputVisual: true, isOutputRtl: false }
      : { align };
  }

  /** Draws text whose reading start sits at `x`. */
  private put(value: string, x: number, baseline: number) {
    this.doc.text(value, this.mx(x), baseline, this.opts(this.rtl ? "right" : "left"));
  }

  /** Draws text whose reading end sits at `x`. */
  private putEnd(value: string, x: number, baseline: number) {
    this.doc.text(value, this.mx(x), baseline, this.opts(this.rtl ? "left" : "right"));
  }

  private putCenter(value: string, cx: number, baseline: number) {
    this.doc.text(value, this.mx(cx), baseline, this.opts("center"));
  }

  /* -------------------------------- metrics -------------------------------- */

  /** One em of the base font, in mm. */
  private em(): number {
    return this.basePt * PT_TO_MM;
  }

  /** Scale for an element whose size is a px offset off the base size. */
  private scaleFor(offsetPx: number): number {
    return (this.d.fontSize + offsetPx) / this.d.fontSize;
  }

  private lh(scale: number): number {
    return this.baseLh * scale;
  }

  /** Baseline of a line whose box starts at `top`. */
  private baseline(top: number, scale: number): number {
    const lh = this.lh(scale);
    return top + lh / 2 + this.basePt * scale * PT_TO_MM * 0.34;
  }

  private setText(t: TextStyle) {
    this.doc.setFont(t.font ?? this.fonts.body, t.style);
    this.doc.setFontSize(this.basePt * t.scale);
    this.doc.setTextColor(t.color);
  }

  private wrap(value: string, width: number, t: TextStyle): string[] {
    if (!value) return [];
    this.setText(t);
    return this.doc.splitTextToSize(value, Math.max(1, width)) as string[];
  }

  private measure(value: string, t: TextStyle): number {
    this.setText(t);
    return this.doc.getTextWidth(value);
  }

  /* ------------------------------- flow paging ----------------------------- */

  /** Moves the flow to a new page unless `height` still fits on this one. */
  private ensure(flow: Flow, height: number) {
    if (flow.y + height <= this.bottom || flow.y <= this.top + 0.01) return;
    flow.page += 1;
    while (this.doc.getNumberOfPages() < flow.page) this.doc.addPage();
    flow.y = this.top;
  }

  private on(flow: Flow) {
    this.doc.setPage(flow.page);
  }

  /** Writes wrapped lines down the flow, breaking pages between lines. */
  private lines(
    flow: Flow,
    lines: string[],
    t: TextStyle,
    opts: { x?: number; align?: "start" | "end" | "center"; width?: number; href?: string | null } = {},
  ) {
    const x = opts.x ?? flow.x;
    const width = opts.width ?? flow.width - (x - flow.x);
    const lh = this.lh(t.scale);
    for (const line of lines) {
      this.ensure(flow, lh);
      this.on(flow);
      this.setText(t);
      const base = this.baseline(flow.y, t.scale);
      const w = this.doc.getTextWidth(line);
      let start = x;
      if (opts.align === "end") {
        this.putEnd(line, x + width, base);
        start = x + width - w;
      } else if (opts.align === "center") {
        this.putCenter(line, x + width / 2, base);
        start = x + width / 2 - w / 2;
      } else {
        this.put(line, x, base);
      }
      if (opts.href) this.linkRect(start, flow.y, w, lh, opts.href, base);
      flow.y += lh;
    }
  }

  /**
   * Wraps text that carries `**bold**` runs. Each word is measured in the
   * weight it prints at, so a bold keyword takes its real width and a line
   * never overflows because its widest words happened to be the bold ones.
   */
  private wrapRich(value: string, width: number, t: TextStyle): RichLine[] {
    const max = Math.max(1, width);
    const bold: TextStyle = { ...t, style: "bold" };
    const lines: RichLine[] = [];
    let line: RichLine = [];
    let lineWidth = 0;
    const append = (text: string, isBold: boolean) => {
      const last = line[line.length - 1];
      if (last && last.bold === isBold) last.text += text;
      else line.push({ text, bold: isBold });
    };
    const flush = () => {
      const last = line[line.length - 1];
      if (last) last.text = last.text.replace(/\s+$/, "");
      lines.push(line.filter((r) => r.text));
      line = [];
      lineWidth = 0;
    };
    for (const run of parseRichText(value)) {
      for (const token of run.text.split(/(\n|[^\S\n]+)/)) {
        if (!token) continue;
        if (token === "\n") {
          flush();
          continue;
        }
        const space = /^\s+$/.test(token);
        if (space && line.length === 0) continue;
        const w = this.measure(token, run.bold ? bold : t);
        if (!space && lineWidth + w > max && line.length > 0) flush();
        append(token, run.bold);
        lineWidth += w;
      }
    }
    if (line.length) flush();
    return lines;
  }

  /** Writes rich lines down the flow, each run in its own weight. */
  private richLines(flow: Flow, lines: RichLine[], t: TextStyle, opts: { x?: number } = {}) {
    const x = opts.x ?? flow.x;
    const lh = this.lh(t.scale);
    for (const line of lines) {
      this.ensure(flow, lh);
      this.on(flow);
      const base = this.baseline(flow.y, t.scale);
      let cursor = x;
      for (const run of line) {
        const style: TextStyle = run.bold ? { ...t, style: "bold", color: INK } : t;
        this.setText(style);
        this.put(run.text, cursor, base);
        cursor += this.doc.getTextWidth(run.text);
      }
      flow.y += lh;
    }
  }

  /**
   * Body text that may carry `**bold**` keywords. Unmarked text keeps the
   * plain path, so nothing about an ordinary résumé's output changes.
   */
  private body(flow: Flow, value: string, t: TextStyle, opts: { x?: number; width?: number } = {}) {
    const width = opts.width ?? flow.width - ((opts.x ?? flow.x) - flow.x);
    if (hasRichText(value)) this.richLines(flow, this.wrapRich(value, width, t), t, opts);
    else this.lines(flow, this.wrap(value, width, t), t, opts);
  }

  /**
   * A clickable area over text that has already been drawn. Underlined when
   * the Link Styling settings ask for it; the colour is the caller's.
   */
  private linkRect(x: number, top: number, w: number, h: number, href: string, baseline?: number) {
    this.doc.link(this.rectX(x, w), top, w, h, { url: href });
    if (this.d.linkUnderline && baseline != null) {
      this.doc.setDrawColor(this.doc.getTextColor());
      this.doc.setLineWidth(0.15);
      this.doc.line(this.mx(x), baseline + 0.45, this.mx(x + w), baseline + 0.45);
    }
  }

  private linkColor(fallback: string): string {
    return this.d.linkAccent ? this.accent : fallback;
  }

  /* --------------------------------- header -------------------------------- */

  private header(flow: Flow, node: ResolvedNode) {
    const d = node.data;
    const layout = this.d.headerLayout;
    const banner = layout === "banner";
    const modern = this.d.template === "modern";
    const nameScale = this.scaleFor(this.d.nameSize);
    const titleScale = this.scaleFor(this.d.titleSize);
    const nameText = text(d.fullName) || "Your Name";
    const name = this.d.nameCase === "uppercase" ? nameText.toLocaleUpperCase() : nameText;
    const headline = text(d.headline);
    const contacts = headerContacts(node, { locale: this.d.language, linkText: this.d.linkText });
    const photo = this.d.showPhoto ? text(d.photo) : "";
    const photoSize = photo ? this.d.photoSize * MM_PER_CSS_PIXEL : 0;
    const photoGap = photo ? 1.2 * this.em() : 0;

    const nameStyle: TextStyle = {
      scale: nameScale,
      style: "bold",
      color: banner ? "#ffffff" : this.d.accentName ? this.accent : INK,
      font: this.fonts.name,
    };
    const titleStyle: TextStyle = {
      scale: titleScale,
      style: modern ? "bold" : "italic",
      color: banner ? "#ffffff" : this.d.accentSubtitle ? this.accent : BODY,
    };
    const contactStyle: TextStyle = { scale: 0.85, style: "normal", color: banner ? "#ffffff" : MUTED };

    const pad = banner ? 1.3 * this.em() : 0;
    const inner: Flow = { x: flow.x + pad, width: flow.width - pad * 2, page: flow.page, y: flow.y + pad };

    if (layout === "split") {
      const contactWidth = Math.min(
        inner.width * 0.42,
        Math.max(0, ...contacts.map((c) => this.measure(contactLabel(c), contactStyle))) + 1,
      );
      const leftWidth = inner.width - contactWidth - 1.5 * this.em() - photoSize - photoGap;
      const nameLines = this.wrap(name, leftWidth, nameStyle);
      const titleLines = this.wrap(headline, leftWidth, titleStyle);
      const textHeight = nameLines.length * this.lh(nameScale) + titleLines.length * this.lh(titleScale);
      const contactHeight = contacts.length * this.lh(0.85);
      const height = Math.max(textHeight, contactHeight, photoSize);
      this.ensure(flow, height);
      inner.page = flow.page;
      inner.y = flow.y;

      const textTop = inner.y + (height - textHeight) / 2;
      if (photo) this.photo(photo, inner.x, inner.y + (height - photoSize) / 2, photoSize, inner.page);
      const left: Flow = { x: inner.x + photoSize + photoGap, width: leftWidth, page: inner.page, y: textTop };
      this.lines(left, nameLines, nameStyle);
      this.lines(left, titleLines, titleStyle);

      const right: Flow = { x: inner.x + inner.width - contactWidth, width: contactWidth, page: inner.page, y: inner.y + (height - contactHeight) / 2 };
      this.contactLines(right, contacts, contactStyle, "end", true);
      flow.y = inner.y + height;
    } else {
      const center = this.d.headerAlign === "center";
      const stacked = this.d.headerDetails === "stacked";
      const textWidth = inner.width - photoSize - photoGap;
      const nameLines = this.wrap(name, textWidth, nameStyle);
      const titleLines = this.wrap(headline, textWidth, titleStyle);
      const contactRows = this.contactRows(contacts, textWidth, contactStyle, stacked);
      const contactHeight = contactRows.length ? 0.5 * this.em() + contactRows.length * this.lh(0.85) : 0;
      const textHeight =
        nameLines.length * this.lh(nameScale) + titleLines.length * this.lh(titleScale) + contactHeight;
      const height = Math.max(textHeight, photoSize);
      this.ensure(flow, height + pad * 2);
      inner.page = flow.page;
      inner.y = flow.y + pad;

      if (banner) {
        this.on(flow);
        this.doc.setFillColor(this.accent);
        const r = 0.35 * this.em();
        this.doc.roundedRect(this.rectX(flow.x, flow.width), flow.y, flow.width, height + pad * 2, r, r, "F");
      }

      // A centred header centres the photo and the text as one group.
      const widest = Math.max(
        0,
        ...nameLines.map((l) => this.measure(l, nameStyle)),
        ...titleLines.map((l) => this.measure(l, titleStyle)),
        ...contactRows.map((row) => this.rowWidth(row, contactStyle)),
      );
      const groupWidth = photo ? photoSize + photoGap + widest : inner.width;
      const groupX = center && photo ? inner.x + (inner.width - groupWidth) / 2 : inner.x;
      const blockX = groupX + photoSize + photoGap;
      const blockWidth = photo ? (center ? widest : textWidth) : inner.width;
      if (photo) this.photo(photo, groupX, inner.y + (height - photoSize) / 2, photoSize, inner.page);

      const block: Flow = { x: blockX, width: blockWidth, page: inner.page, y: inner.y + (height - textHeight) / 2 };
      const align = center ? "center" : "start";
      this.lines(block, nameLines, nameStyle, { align });
      this.lines(block, titleLines, titleStyle, { align });
      if (contactRows.length) {
        block.y += 0.5 * this.em();
        this.drawContactRows(block, contactRows, contactStyle, align);
      }
      flow.y = inner.y + height + pad;
    }

    const summary = text(d.summary);
    if (summary) {
      flow.y += 0.8 * this.em();
      this.body(flow, summary, { scale: 0.95, style: "normal", color: BODY });
    }

    // Modern's short accent rule under the header.
    if (modern && !banner) {
      flow.y += 0.9 * this.em();
      const w = 3.2 * this.em();
      const center = layout !== "split" && this.d.headerAlign === "center";
      const x = center ? flow.x + (flow.width - w) / 2 : flow.x;
      this.on(flow);
      this.doc.setFillColor(this.accent);
      this.doc.roundedRect(this.rectX(x, w), flow.y, w, 0.8, 0.4, 0.4, "F");
      flow.y += 0.8;
    }
    flow.y += this.sectionGap();
  }

  /** The photo, clipped to its shape. */
  private photo(dataUrl: string, x: number, y: number, size: number, page: number) {
    const format = /^data:image\/png/i.test(dataUrl) ? "PNG" : "JPEG";
    this.doc.setPage(page);
    const left = this.rectX(x, size);
    try {
      this.doc.saveGraphicsState();
      if (this.d.photoShape === "circle") {
        this.doc.circle(left + size / 2, y + size / 2, size / 2, null);
        this.doc.clip();
        this.doc.discardPath();
      } else if (this.d.photoShape === "rounded") {
        const r = size * 0.12;
        this.doc.roundedRect(left, y, size, size, r, r, null);
        this.doc.clip();
        this.doc.discardPath();
      }
      this.doc.addImage(dataUrl, format, left, y, size, size);
    } catch {
      // A photo that cannot be decoded must never cost the whole export.
    } finally {
      this.doc.restoreGraphicsState();
    }
  }

  /** The gap between contact items: a separator glyph, or open space when icons separate them on screen. */
  private separator(): string {
    return this.d.headerSeparator === "bullet" ? "·" : this.d.headerSeparator === "bar" ? "|" : "";
  }

  private sepWidth(t: TextStyle): number {
    const sep = this.separator();
    return sep ? this.measure(` ${sep} `, t) + 0.6 * this.em() * t.scale : 1.2 * this.em() * t.scale;
  }

  /** Greedy wrap of contact items into rows that fit `width`. */
  private contactRows(items: HeaderContact[], width: number, t: TextStyle, stacked: boolean): HeaderContact[][] {
    if (stacked) return items.map((i) => [i]);
    const rows: HeaderContact[][] = [];
    let row: HeaderContact[] = [];
    let used = 0;
    for (const item of items) {
      const w = this.itemWidth(item, t);
      const add = row.length ? this.sepWidth(t) + w : w;
      if (row.length && used + add > width) {
        rows.push(row);
        row = [item];
        used = w;
      } else {
        row.push(item);
        used += add;
      }
    }
    if (row.length) rows.push(row);
    return rows;
  }

  private itemWidth(item: HeaderContact, t: TextStyle): number {
    const prefix = item.prefix ? this.measure(`${item.prefix}: `, { ...t, style: "bold" }) : 0;
    return prefix + this.measure(item.text, t);
  }

  private rowWidth(row: HeaderContact[], t: TextStyle): number {
    return row.reduce((sum, item, i) => sum + this.itemWidth(item, t) + (i ? this.sepWidth(t) : 0), 0);
  }

  private drawContactRows(flow: Flow, rows: HeaderContact[][], t: TextStyle, align: "start" | "end" | "center") {
    const lh = this.lh(t.scale);
    const sep = this.separator();
    for (const row of rows) {
      this.ensure(flow, lh);
      this.on(flow);
      const total = this.rowWidth(row, t);
      let x = align === "center" ? flow.x + (flow.width - total) / 2 : align === "end" ? flow.x + flow.width - total : flow.x;
      const base = this.baseline(flow.y, t.scale);
      row.forEach((item, i) => {
        if (i > 0) {
          const gap = this.sepWidth(t);
          if (sep) {
            this.setText({ ...t, color: t.color === "#ffffff" ? "#ffffff" : "#a1a1aa" });
            this.putCenter(sep, x + gap / 2, base);
          }
          x += gap;
        }
        if (item.prefix) {
          const label = `${item.prefix}: `;
          this.setText({ ...t, style: "bold" });
          this.put(label, x, base);
          x += this.doc.getTextWidth(label);
        }
        const isWebLink = item.href && item.kind !== "email" && item.kind !== "phone";
        const color = isWebLink && t.color !== "#ffffff" ? this.linkColor(t.color) : t.color;
        this.setText({ ...t, color });
        this.put(item.text, x, base);
        const w = this.doc.getTextWidth(item.text);
        if (item.href) this.linkRect(x, flow.y, w, lh, item.href, base);
        x += w;
      });
      flow.y += lh;
    }
  }

  private contactLines(flow: Flow, items: HeaderContact[], t: TextStyle, align: "start" | "end", stacked: boolean) {
    this.drawContactRows(flow, this.contactRows(items, flow.width, t, stacked), t, align);
  }

  /* -------------------------------- sections ------------------------------- */

  private section(flow: Flow, section: ResolvedNode) {
    const headingScale = this.scaleFor(this.d.headingSize);
    const raw = text(section.data.title);
    const title = this.d.headingCase === "uppercase" ? raw.toLocaleUpperCase() : capitalizeWords(raw);
    const style = this.d.headingStyle;
    const padX = style === "box" || style === "background" ? 0.5 * this.em() * headingScale : style === "bar" ? 0.5 * this.em() + 0.8 : 0;
    const padY = style === "plain" || style === "bar" ? 0 : 0.15 * this.em() * headingScale;
    const headingText: TextStyle = {
      scale: headingScale,
      style: "bold",
      color:
        style === "background" && this.d.accentHeadingLine
          ? "#ffffff"
          : this.d.accentHeadings
            ? this.accent
            : INK,
    };
    const lines = this.wrap(title, flow.width - padX * 2, headingText);
    const height = lines.length * this.lh(headingScale) + padY * 2;

    // Keep the heading with the start of the first entry beneath it.
    this.ensure(flow, height + 0.5 * this.em() + this.lh(1) * 2);
    this.on(flow);
    const top = flow.y;
    const ruleColor = this.d.accentHeadingLine ? this.accent : RULE;
    const x = this.rectX(flow.x, flow.width);

    if (style === "background") {
      this.doc.setFillColor(this.d.accentHeadingLine ? this.accent : "#f4f4f5");
      const r = 0.2 * this.em();
      this.doc.roundedRect(x, top, flow.width, height, r, r, "F");
    } else if (style === "bar") {
      this.doc.setFillColor(ruleColor);
      this.doc.rect(this.rectX(flow.x, 0.8), top, 0.8, height, "F");
    }

    flow.y += padY;
    this.lines(flow, lines, headingText, { x: flow.x + padX, width: flow.width - padX * 2 });
    flow.y += padY;

    this.doc.setDrawColor(ruleColor);
    if (style === "underline") {
      this.doc.setLineWidth(0.4);
      this.doc.line(this.marginLeft(flow), flow.y, this.marginRight(flow), flow.y);
    } else if (style === "double") {
      this.doc.setLineWidth(0.26);
      this.doc.line(this.marginLeft(flow), top, this.marginRight(flow), top);
      this.doc.line(this.marginLeft(flow), flow.y, this.marginRight(flow), flow.y);
    } else if (style === "box") {
      this.doc.setLineWidth(0.32);
      this.doc.rect(x, top, flow.width, flow.y - top, "S");
    }
    flow.y += 0.5 * this.em() * headingScale;

    section.children.forEach((child, i) => {
      if (i > 0) flow.y += this.itemGap();
      this.item(flow, child);
    });
    flow.y += this.sectionGap();
  }

  /**
   * Left/right page coordinates of a flow, already mirrored. Rounded so a
   * full-width rule comes out byte-identical in both directions instead of
   * differing in the fifteenth decimal.
   */
  private marginLeft(flow: Flow) {
    return round4(Math.min(this.mx(flow.x), this.mx(flow.x + flow.width)));
  }

  private marginRight(flow: Flow) {
    return round4(Math.max(this.mx(flow.x), this.mx(flow.x + flow.width)));
  }

  /* --------------------------------- items --------------------------------- */

  private item(flow: Flow, node: ResolvedNode) {
    const d = node.data;
    switch (node.kind) {
      case "experience":
        this.entryHead(flow, {
          title: text(d.title) || "Role",
          subtitle: text(d.company),
          subtitleHref: urlHref(d.url),
          date: this.dates(d),
          location: text(d.location),
        });
        this.bullets(flow, node.children);
        break;
      case "education":
        this.entryHead(flow, {
          title:
            [text(d.degree), text(d.field)].filter(Boolean).join(this.d.template === "modern" ? ", " : " — ") ||
            "Degree",
          subtitle: text(d.school),
          subtitleHref: urlHref(d.url),
          date: this.dates(d),
          location: text(d.location),
        });
        this.bullets(flow, node.children);
        break;
      case "project": {
        const href = urlHref(d.url);
        this.entryHead(flow, { title: text(d.name) || "Project", titleHref: href, date: this.dates(d) });
        if (text(d.url) && this.d.linkText === "url") this.urlLine(flow, text(d.url));
        this.paragraph(flow, text(d.description), 0.95);
        this.bullets(flow, node.children);
        break;
      }
      case "skillGroup":
        this.skillGroup(flow, node);
        break;
      case "certification": {
        const date = formatResumeDate(text(d.date), this.d);
        this.nameLine(flow, text(d.name), text(d.issuer), date, urlHref(d.url));
        if (text(d.url) && this.d.linkText === "url") this.urlLine(flow, text(d.url));
        break;
      }
      case "reference":
        this.nameLine(flow, text(d.name), [text(d.title), text(d.company)].filter(Boolean).join(", "), "", null);
        this.paragraph(flow, [text(d.email), text(d.phone)].filter(Boolean).join(" · "), 0.85, MUTED);
        break;
      case "language":
        this.nameLine(flow, text(d.name), "", text(d.level), null, true);
        break;
      case "text":
        this.paragraph(flow, text(d.text), 0.95);
        break;
      case "bullet":
        this.bullets(flow, [node]);
        break;
    }
  }

  /** A date range in the CV's language and chosen format. */
  private dates(data: Record<string, unknown>): string {
    const start = formatResumeDate(text(data.startDate), this.d);
    const end = formatResumeDate(text(data.endDate), this.d);
    const sep = localeOf(this.d.language).rangeSeparator;
    return start && end ? `${start} ${sep} ${end}` : start || end;
  }

  private metaColor() {
    return this.d.accentDates ? this.accent : MUTED;
  }

  private subtitleColor() {
    return this.d.accentSubtitle ? this.accent : BODY;
  }

  /**
   * The title line of an entry: title, subtitle and date/location, laid out
   * per the Entries settings — the same three structures as the preview.
   */
  private entryHead(
    flow: Flow,
    e: {
      title: string;
      subtitle?: string;
      date?: string;
      location?: string;
      titleHref?: string | null;
      subtitleHref?: string | null;
    },
  ) {
    const titleStyle: TextStyle = { scale: this.scaleFor(this.d.entryHeaderSize), style: "bold", color: INK };
    const subStyle: TextStyle = { scale: 0.95, style: "italic", color: this.subtitleColor() };
    const metaStyle: TextStyle = { scale: 0.88, style: "normal", color: this.metaColor() };
    const subtitle = e.subtitle ?? "";
    const date = e.date ?? "";
    const location = e.location ?? "";
    const sameLine = this.d.subtitlePlacement === "sameLine";

    // Keep the head together with the first bullet line below it.
    const roughHeight = this.lh(titleStyle.scale) + (subtitle ? this.lh(0.95) : 0) + this.lh(0.95);
    this.ensure(flow, roughHeight);

    if (this.d.entryStructure === "full") {
      this.titleAndSubtitle(flow, flow.x, flow.width, e.title, subtitle, titleStyle, subStyle, sameLine, e);
      const meta = [date, location].filter(Boolean).join(" · ");
      if (meta) this.lines(flow, this.wrap(meta, flow.width, metaStyle), metaStyle);
      return;
    }

    if (this.d.datePosition === "split") {
      // Date opposite the title line, location opposite the subtitle line.
      const metaW = (v: string) => (v ? Math.min(flow.width * 0.35, this.measure(v, metaStyle) + 0.5) : 0);
      const gap = this.em();
      const dateW = metaW(date);
      const locW = metaW(location);
      const startPage = flow.page;
      const startY = flow.y;
      const titleWidth = flow.width - Math.max(dateW, sameLine ? locW : 0) - (dateW || locW ? gap : 0);

      const body: Flow = { ...flow };
      const below = !sameLine && subtitle;
      this.titleAndSubtitle(body, flow.x, titleWidth, e.title, sameLine ? subtitle : "", titleStyle, subStyle, sameLine, e);
      const titleEnd = body.y;
      if (below) {
        this.lines(body, this.wrap(subtitle, flow.width - locW - (locW ? gap : 0), subStyle), subStyle, {
          href: e.subtitleHref,
        });
      }

      const meta: Flow = { ...flow, page: startPage, y: startY + (this.lh(titleStyle.scale) - this.lh(0.88)) / 2 };
      if (date) this.lines(meta, [date], metaStyle, { align: "end" });
      if (location) {
        // Level with the subtitle when it sits below; otherwise on its own line.
        if (below) meta.y = titleEnd + (this.lh(0.95) - this.lh(0.88)) / 2;
        else if (!date) meta.y = titleEnd;
        this.lines(meta, [location], metaStyle, { align: "end" });
        if (!below && meta.page === body.page) body.y = Math.max(body.y, meta.y);
      }
      flow.y = body.y;
      flow.page = body.page;
      return;
    }

    // Columns: the date and location stack in their own column, on the right
    // (reading end) or the left (reading start).
    const metaLines = [date, location].filter(Boolean);
    const metaWidth = metaLines.length
      ? this.d.datePosition === "left"
        ? 7.5 * this.em()
        : Math.min(flow.width * 0.34, Math.max(...metaLines.map((m) => this.measure(m, metaStyle))) + 0.5)
      : 0;
    const gap = metaWidth ? this.em() : 0;
    const left = this.d.datePosition === "left";
    const bodyX = left ? flow.x + metaWidth + gap : flow.x;
    const bodyWidth = flow.width - metaWidth - gap;
    const metaX = left ? flow.x : flow.x + flow.width - metaWidth;

    const body: Flow = { ...flow };
    this.titleAndSubtitle(body, bodyX, bodyWidth, e.title, subtitle, titleStyle, subStyle, sameLine, e);
    if (metaLines.length) {
      const meta: Flow = { x: metaX, width: metaWidth, page: flow.page, y: flow.y + (this.lh(titleStyle.scale) - this.lh(0.88)) / 2 };
      for (const m of metaLines) {
        this.lines(meta, this.wrap(m, metaWidth, metaStyle), metaStyle, { align: left ? "start" : "end" });
      }
      if (meta.page === body.page) body.y = Math.max(body.y, meta.y);
    }
    flow.y = body.y;
    flow.page = body.page;
  }

  private titleAndSubtitle(
    flow: Flow,
    x: number,
    width: number,
    title: string,
    subtitle: string,
    titleStyle: TextStyle,
    subStyle: TextStyle,
    sameLine: boolean,
    links: { titleHref?: string | null; subtitleHref?: string | null },
  ) {
    if (sameLine && subtitle) {
      const titleW = this.measure(title, titleStyle);
      const restW = this.measure(` · ${subtitle}`, subStyle);
      // On one line when it fits; otherwise the subtitle simply drops below.
      if (titleW + restW <= width) {
        const lh = this.lh(titleStyle.scale);
        this.ensure(flow, lh);
        this.on(flow);
        const base = this.baseline(flow.y, titleStyle.scale);
        this.setText(titleStyle);
        this.put(title, x, base);
        if (links.titleHref) this.linkRect(x, flow.y, titleW, lh, links.titleHref, base);
        this.setText({ ...subStyle, color: "#a1a1aa", style: "normal" });
        const dot = " · ";
        this.put(dot, x + titleW, base);
        const dotW = this.doc.getTextWidth(dot);
        this.setText(subStyle);
        this.put(subtitle, x + titleW + dotW, base);
        if (links.subtitleHref) {
          this.linkRect(x + titleW + dotW, flow.y, this.doc.getTextWidth(subtitle), lh, links.subtitleHref, base);
        }
        flow.y += lh;
        return;
      }
    }
    this.lines(flow, this.wrap(title, width, titleStyle), titleStyle, { x, width, href: links.titleHref });
    if (subtitle) this.lines(flow, this.wrap(subtitle, width, subStyle), subStyle, { x, width, href: links.subtitleHref });
  }

  /**
   * "Name · qualifier" with an optional right-hand value: certificates
   * (issuer, date), references (role, company) and languages (level).
   */
  private nameLine(flow: Flow, name: string, qualifier: string, end: string, href: string | null, plainEnd = false) {
    const nameStyle: TextStyle = { scale: 1, style: "bold", color: INK };
    const qStyle: TextStyle = { scale: 0.95, style: "normal", color: "#52525b" };
    const endStyle: TextStyle = plainEnd
      ? { scale: 0.95, style: "normal", color: "#52525b" }
      : { scale: 0.88, style: "normal", color: this.metaColor() };
    const endW = end ? Math.min(flow.width * 0.4, this.measure(end, endStyle) + 0.5) : 0;
    const width = flow.width - endW - (endW ? this.em() : 0);
    const startY = flow.y;
    const startPage = flow.page;

    const nameW = this.measure(name, nameStyle);
    const q = qualifier ? ` · ${qualifier}` : "";
    const qW = q ? this.measure(q, qStyle) : 0;
    if (nameW + qW <= width) {
      const lh = this.lh(1);
      this.ensure(flow, lh);
      this.on(flow);
      const base = this.baseline(flow.y, 1);
      this.setText(nameStyle);
      this.put(name, flow.x, base);
      if (href) this.linkRect(flow.x, flow.y, nameW, lh, href, base);
      if (q) {
        this.setText(qStyle);
        this.put(q, flow.x + nameW, base);
      }
      flow.y += lh;
    } else {
      this.lines(flow, this.wrap(name, width, nameStyle), nameStyle, { width, href });
      if (qualifier) this.lines(flow, this.wrap(qualifier, width, qStyle), qStyle, { width });
    }
    if (end) {
      const endFlow: Flow = { ...flow, page: startPage, y: startY + (this.lh(1) - this.lh(endStyle.scale)) / 2 };
      this.lines(endFlow, [end], endStyle, { align: "end" });
    }
  }

  private urlLine(flow: Flow, raw: string) {
    const href = urlHref(raw);
    const style: TextStyle = { scale: 0.85, style: "normal", color: this.linkColor(FAINT) };
    this.lines(flow, this.wrap(href ? displayUrl(href) : raw, flow.width, style), style, { href });
  }

  private paragraph(flow: Flow, value: string, scale: number, color = BODY) {
    if (!value) return;
    this.body(flow, value, { scale, style: "normal", color });
  }

  /* -------------------------------- bullets -------------------------------- */

  private bullets(flow: Flow, nodes: ResolvedNode[]) {
    const items = nodes.filter((n) => n.kind === "bullet" && text(n.data.text));
    if (items.length === 0) return;
    flow.y += 0.25 * this.em();
    const style: TextStyle = { scale: 0.95, style: "normal", color: BODY };
    const indent = 0.55 * this.em() + 1.2;
    items.forEach((b, i) => {
      if (i > 0) flow.y += 0.15 * this.em();
      this.ensure(flow, this.lh(0.95));
      this.marker(flow.x, flow.y, flow.page);
      this.body(flow, text(b.data.text), style, { x: flow.x + indent, width: flow.width - indent });
    });
  }

  /** The bullet marker as a shape — never a glyph in the text layer. */
  private marker(x: number, lineTop: number, page: number) {
    this.doc.setPage(page);
    const color = this.d.accentBullets ? this.accent : BODY;
    const mid = lineTop + this.lh(0.95) / 2;
    const em = this.em();
    this.doc.setFillColor(color);
    this.doc.setDrawColor(color);
    switch (this.d.bulletStyle) {
      case "dash":
        this.doc.rect(this.rectX(x, 0.55 * em), mid - 0.06 * em, 0.55 * em, 0.11 * em, "F");
        break;
      case "square": {
        const s = 0.26 * em;
        this.doc.rect(this.rectX(x + 0.05 * em, s), mid - s / 2, s, s, "F");
        break;
      }
      case "arrow": {
        const s = 0.2 * em;
        const cx = x + 0.2 * em;
        this.doc.setLineWidth(0.09 * em);
        // A chevron pointing the way the line reads.
        this.doc.line(this.mx(cx - s / 2), mid - s, this.mx(cx + s / 2), mid);
        this.doc.line(this.mx(cx + s / 2), mid, this.mx(cx - s / 2), mid + s);
        break;
      }
      default:
        this.doc.circle(this.mx(x + 0.15 * em), mid, 0.13 * em, "F");
    }
  }

  /* --------------------------------- skills -------------------------------- */

  private skillGroup(flow: Flow, node: ResolvedNode) {
    const name = text(node.data.name);
    const skills = node.children.filter((c) => c.kind === "skill" && text(c.data.name)).map((c) => text(c.data.name));
    if (!name && skills.length === 0) return;
    const style = this.d.skillStyle;

    if (style === "inline") {
      this.inlineLabel(flow, name, skills.join(", "));
      return;
    }

    if (name) {
      const label: TextStyle = { scale: 0.85, style: "bold", color: INK };
      this.lines(flow, this.wrap(name, flow.width, label), label);
      flow.y += 0.35 * this.em() * 0.85;
    }

    if (style === "list") {
      const t: TextStyle = { scale: 0.92, style: "normal", color: BODY };
      const indent = 0.5 * this.em() + 1.2;
      const colMin = 9 * this.em();
      const cols = Math.max(1, Math.floor((flow.width + this.em()) / (colMin + this.em())));
      const colW = (flow.width - (cols - 1) * this.em()) / cols;
      for (let i = 0; i < skills.length; i += cols) {
        const row = skills.slice(i, i + cols);
        const wrapped = row.map((sk) => this.wrap(sk, colW - indent, t));
        const height = Math.max(...wrapped.map((w) => w.length)) * this.lh(0.92);
        this.ensure(flow, height);
        const top = flow.y;
        wrapped.forEach((lines, c) => {
          const x = flow.x + c * (colW + this.em());
          this.marker(x, top - (this.lh(0.95) - this.lh(0.92)) / 2, flow.page);
          const cell: Flow = { x: x + indent, width: colW - indent, page: flow.page, y: top };
          this.lines(cell, lines, t, { x: x + indent, width: colW - indent });
        });
        flow.y = top + height;
      }
      return;
    }

    // Chips: each skill in its own rounded box, wrapping like the preview.
    const t: TextStyle = {
      scale: 0.82,
      style: "normal",
      color: this.d.accentBullets ? this.accent : BODY,
    };
    const padX = 0.55 * this.em() * 0.82;
    const padY = 0.12 * this.em() * 0.82;
    const gap = 0.35 * this.em();
    const h = this.lh(0.82) + padY * 2;
    let x = flow.x;
    this.ensure(flow, h);
    for (const sk of skills) {
      const w = Math.min(flow.width, this.measure(sk, t) + padX * 2);
      if (x > flow.x && x + w > flow.x + flow.width) {
        x = flow.x;
        flow.y += h + gap;
        this.ensure(flow, h);
      }
      this.on(flow);
      const r = 0.35 * this.em() * 0.82;
      this.doc.setLineWidth(0.2);
      if (this.d.accentBullets) {
        this.doc.setDrawColor(this.accent);
        this.doc.roundedRect(this.rectX(x, w), flow.y, w, h, r, r, "S");
      } else {
        this.doc.setDrawColor("#e4e4e7");
        this.doc.setFillColor("#fafafa");
        this.doc.roundedRect(this.rectX(x, w), flow.y, w, h, r, r, "FD");
      }
      this.setText(t);
      this.put(sk, x + padX, this.baseline(flow.y + padY, 0.82));
      x += w + gap;
    }
    flow.y += h;
  }

  /**
   * "Label: value, value" with the label in bold, wrapping onto full-width
   * lines. The whole string is wrapped as one, so no word is ever lost or
   * repeated at the seam between label and list; the width is trimmed by the
   * extra width bold adds to the label so the first line still fits.
   */
  private inlineLabel(flow: Flow, label: string, value: string) {
    const bold: TextStyle = { scale: 0.95, style: "bold", color: INK };
    const normal: TextStyle = { scale: 0.95, style: "normal", color: BODY };
    const prefix = label ? `${label}: ` : "";
    const boldExtra = prefix ? Math.max(0, this.measure(prefix, bold) - this.measure(prefix, normal)) : 0;
    const lines = this.wrap(`${prefix}${value}`, flow.width - boldExtra, normal);
    const lh = this.lh(0.95);
    lines.forEach((line, i) => {
      this.ensure(flow, lh);
      this.on(flow);
      const base = this.baseline(flow.y, 0.95);
      if (i === 0 && prefix && line.startsWith(prefix.trimEnd())) {
        const head = line.startsWith(prefix) ? prefix : prefix.trimEnd();
        this.setText(bold);
        this.put(head, flow.x, base);
        const headW = this.doc.getTextWidth(head);
        this.setText(normal);
        this.put(line.slice(head.length), flow.x + headW, base);
      } else {
        this.setText(normal);
        this.put(line, flow.x, base);
      }
      flow.y += lh;
    });
  }

  /* -------------------------------- spacing -------------------------------- */

  private sectionGap() {
    return Math.max(2, 18 * this.d.sectionSpacing * MM_PER_CSS_PIXEL);
  }

  private itemGap() {
    return Math.max(1.5, 10 * this.d.sectionSpacing * MM_PER_CSS_PIXEL);
  }
}

/* -------------------------------- helpers --------------------------------- */

const PT_TO_MM = 25.4 / 72;

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** CSS `text-transform: capitalize`, for the PDF: first letter of each word. */
function capitalizeWords(value: string): string {
  return value.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toLocaleUpperCase());
}

function contactLabel(c: HeaderContact): string {
  return c.prefix ? `${c.prefix}: ${c.text}` : c.text;
}

/** Mirrors the preview's column assignment, so the PDF splits the same way. */
function sectionColumn(node: ResolvedNode): "main" | "side" | "full" {
  const stored = node.data.column;
  if (stored === "main" || stored === "side" || stored === "full") return stored;
  return ["skills", "certifications", "references"].includes(text(node.data.sectionType)) ? "side" : "main";
}

function headerOf(roots: ResolvedNode[]) {
  return roots.find((node) => node.kind === "header");
}

function sectionsOf(roots: ResolvedNode[]) {
  return roots.filter((node) => node.kind === "section");
}

function documentName(resumeName: string, versionName: string, isBaseVersion: boolean) {
  return isBaseVersion || !versionName ? resumeName || "Resume" : `${resumeName || "Resume"} — ${versionName}`;
}

export function safeFileName(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Resume";
}
