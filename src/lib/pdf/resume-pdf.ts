"use client";

import type { jsPDF } from "jspdf";
import { PAGE_FORMATS, type DesignSettings, type FontId } from "@/lib/design";
import type { ResolvedNode } from "@/lib/resume/types";

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
 * selectable and searchable instead of a canvas snapshot.
 */
export async function downloadResumePdf(input: ResumePdfInput): Promise<void> {
  const document = await createResumePdf(input);
  const name = documentName(input.resumeName, input.versionName, input.isBaseVersion);
  await document.save(`${safeFileName(name)}.pdf`, { returnPromise: true });
}

/** Build a semantic PDF without triggering a browser download. */
export async function createResumePdf(input: ResumePdfInput): Promise<PdfDocument> {
  const { jsPDF } = await import("jspdf");
  const page = PAGE_FORMATS[input.design.pageFormat];
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: PAGE_FORMAT_BY_DESIGN[input.design.pageFormat],
    compress: true,
  });
  const name = documentName(input.resumeName, input.versionName, input.isBaseVersion);

  document.setProperties({
    title: name,
    subject: "Resume",
    author: headerOf(input.tree.roots)?.data.fullName as string | undefined,
    keywords: "resume,curriculum vitae,CV",
  });

  const font = await registerPdfFont(document, input.design);
  const writer = new PdfWriter(document, input.design, page.width * MM_PER_CSS_PIXEL, page.height * MM_PER_CSS_PIXEL, font);
  if (input.design.template === "modern") renderModern(writer, input.tree.roots);
  else renderClassic(writer, input.tree.roots);
  return document;
}

async function registerPdfFont(document: PdfDocument, design: DesignSettings): Promise<PdfFont> {
  const registration = PDF_FONT_REGISTRY[design.fontFamily] ?? PDF_FONT_REGISTRY.serif;
  // Node-based unit tests have no public asset origin. Browser exports always
  // embed the assets; the fallback keeps the semantic renderer testable.
  if (typeof window === "undefined" || !registration.files) return registration.fallback;

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

function renderClassic(writer: PdfWriter, roots: ResolvedNode[]) {
  const header = headerOf(roots);
  if (header) writer.classicHeader(header);
  for (const section of sectionsOf(roots)) writer.classicSection(section);
}

function renderModern(writer: PdfWriter, roots: ResolvedNode[]) {
  const header = headerOf(roots);
  const sections = sectionsOf(roots);
  if (header) writer.modernHeader(header);

  const sidebarTypes = new Set(["skills", "certifications", "references"]);
  const sidebar = sections.filter((section) => sidebarTypes.has(text(section.data.sectionType)));
  const main = sections.filter((section) => !sidebar.includes(section));
  if (sidebar.length === 0) {
    for (const section of main) writer.modernSection(section, "main");
    return;
  }

  writer.beginColumns();
  for (const section of main) writer.modernSection(section, "main");
  for (const section of sidebar) writer.modernSection(section, "side");
}

class PdfWriter {
  private readonly doc: PdfDocument;
  private readonly width: number;
  private readonly height: number;
  private readonly marginX: number;
  private readonly marginY: number;
  private readonly bottom: number;
  private readonly accent: string;
  private readonly font: PdfFont;
  private readonly baseSize: number;
  private readonly lineHeight: number;
  private readonly sectionSpacing: number;
  private y: number;
  private firstPageBodyY: number;
  private columns: Record<"main" | "side", ColumnCursor> | null = null;

  constructor(doc: PdfDocument, design: DesignSettings, width: number, height: number, font: PdfFont) {
    this.doc = doc;
    this.width = width;
    this.height = height;
    this.marginX = design.marginX * MM_PER_CSS_PIXEL;
    this.marginY = design.marginY * MM_PER_CSS_PIXEL;
    this.bottom = height - this.marginY;
    this.accent = design.accentColor;
    this.font = font;
    this.baseSize = design.fontSize * 0.75;
    this.lineHeight = this.baseSize * design.lineHeight * 0.3528;
    this.sectionSpacing = design.sectionSpacing;
    this.y = this.marginY;
    this.firstPageBodyY = this.marginY;
  }

  classicHeader(node: ResolvedNode) {
    const d = node.data;
    const name = text(d.fullName) || "Your Name";
    const headline = text(d.headline);
    const contacts = contactValues(d);
    const summary = text(d.summary);
    const available = this.width - this.marginX * 2;
    const summaryLines = summary ? this.lines(summary, available, 0.95, "normal") : [];
    const needed = 10 + (headline ? 6 : 0) + (contacts.length ? 5 : 0) + summaryLines.length * this.lineHeight + 6;
    this.ensure(needed);

    this.setText(2, "bold", "#18181b");
    this.center(name, this.y + 6);
    this.y += 8;
    if (headline) {
      this.setText(1.08, "italic", this.accent);
      this.center(headline, this.y + 3);
      this.y += 6;
    }
    if (contacts.length) {
      this.setText(0.85, "normal", "#52525b");
      this.center(contacts.join("  ·  "), this.y + 3);
      this.y += 5.5;
    }
    if (summaryLines.length) {
      this.setText(0.95, "normal", "#3f3f46");
      this.writeLines(summaryLines, this.marginX);
      this.y += 2;
    }
    this.y += this.sectionGap();
  }

  modernHeader(node: ResolvedNode) {
    const d = node.data;
    const name = text(d.fullName) || "Your Name";
    const headline = text(d.headline);
    const contacts = contactValues(d);
    const summary = text(d.summary);
    const available = this.width - this.marginX * 2;
    const summaryLines = summary ? this.lines(summary, available, 0.95, "normal") : [];
    const needed = 11 + (headline ? 6 : 0) + (contacts.length ? 5 : 0) + summaryLines.length * this.lineHeight + 10;
    this.ensure(needed);

    this.setText(1.9, "bold", "#18181b");
    this.doc.text(name, this.marginX, this.y + 6);
    this.y += 8;
    if (headline) {
      this.setText(1.05, "bold", this.accent);
      this.doc.text(headline, this.marginX, this.y + 3);
      this.y += 6;
    }
    if (contacts.length) {
      this.setText(0.85, "normal", "#52525b");
      this.doc.text(contacts.join("  ·  "), this.marginX, this.y + 3);
      this.y += 5.5;
    }
    if (summaryLines.length) {
      this.setText(0.95, "normal", "#3f3f46");
      this.writeLines(summaryLines, this.marginX);
      this.y += 2;
    }
    this.doc.setFillColor(this.accent);
    this.doc.roundedRect(this.marginX, this.y + 1, 11, 1.1, 0.55, 0.55, "F");
    this.y += 7;
    this.firstPageBodyY = this.y;
  }

  beginColumns() {
    const available = this.width - this.marginX * 2;
    const gap = 2.2 * this.baseSize * 0.3528;
    const mainWidth = (available - gap) * 0.655;
    const sideWidth = available - gap - mainWidth;
    this.columns = {
      main: { page: 1, y: this.firstPageBodyY, x: this.marginX, width: mainWidth },
      side: { page: 1, y: this.firstPageBodyY, x: this.marginX + mainWidth + gap, width: sideWidth },
    };
  }

  classicSection(section: ResolvedNode) {
    if (section.children.length === 0) return;
    const title = text(section.data.title);
    const titleLines = this.lines(title, this.width - this.marginX * 2, 1, "bold");
    const first = section.children[0];
    this.ensure(titleLines.length * this.lineHeight + this.measureItem(first, this.width - this.marginX * 2) + 3);
    this.setText(1, "bold", "#18181b");
    this.writeLines(titleLines.map((line) => line.toUpperCase()), this.marginX);
    this.doc.setDrawColor("#27272a");
    this.doc.setLineWidth(0.45);
    this.doc.line(this.marginX, this.y + 0.5, this.width - this.marginX, this.y + 0.5);
    this.y += 3.2;
    for (const child of section.children) this.classicItem(child);
    this.y += this.sectionGap();
  }

  modernSection(section: ResolvedNode, column: "main" | "side") {
    if (section.children.length === 0) return;
    const cursor = this.cursor(column);
    const first = section.children[0];
    const titleLines = this.lines(text(section.data.title).toUpperCase(), cursor.width - 5, 0.88, "bold");
    this.ensureColumn(column, titleLines.length * this.lineHeight + this.measureItem(first, cursor.width, column === "side") + 3);
    const active = this.cursor(column);
    this.setPage(active.page);
    this.setText(0.88, "bold", "#18181b");
    this.doc.setFillColor(this.accent);
    this.doc.roundedRect(active.x, active.y + 0.5, 1.05, 4.3, 0.5, 0.5, "F");
    this.writeColumnLines(column, titleLines, active.x + 3);
    this.advanceColumn(column, 1.8);
    for (const child of section.children) this.modernItem(child, column, column === "side");
    this.advanceColumn(column, this.sectionGap());
  }

  private classicItem(node: ResolvedNode) {
    const available = this.width - this.marginX * 2;
    this.ensure(this.measureItem(node, available));
    const d = node.data;
    switch (node.kind) {
      case "experience":
      case "education": {
        const primary = node.kind === "experience" ? text(d.title) || "Role" : [text(d.degree), text(d.field)].filter(Boolean).join(" — ") || "Degree";
        const secondary = node.kind === "experience" ? text(d.company) : text(d.school);
        const meta = dateRange(d) || text(d.location);
        this.entryHeader(primary, secondary, meta, this.marginX, available, false);
        this.bullets(node.children, undefined);
        break;
      }
      case "project":
        this.entryHeader(text(d.name) || "Project", text(d.url), dateRange(d), this.marginX, available, false);
        this.paragraph(text(d.description), this.marginX, available, 0.95);
        this.bullets(node.children, undefined);
        break;
      case "skillGroup":
        this.inlineLabel(text(d.name), node.children.map((child) => text(child.data.name)).filter(Boolean).join(", "), this.marginX, available);
        break;
      case "certification":
        this.entryHeader(text(d.name), [text(d.issuer), text(d.date)].filter(Boolean).join(" · "), "", this.marginX, available, false);
        break;
      case "reference":
        this.entryHeader(text(d.name), [text(d.title), text(d.company)].filter(Boolean).join(", "), "", this.marginX, available, false);
        this.paragraph([text(d.email), text(d.phone)].filter(Boolean).join(" · "), this.marginX, available, 0.85);
        break;
      case "bullet":
        this.bullets([node], undefined);
        break;
    }
    this.y += this.itemGap();
  }

  private modernItem(node: ResolvedNode, column: "main" | "side", compact: boolean) {
    const cursor = this.cursor(column);
    this.ensureColumn(column, this.measureItem(node, cursor.width, compact));
    const d = node.data;
    switch (node.kind) {
      case "experience":
      case "education": {
        const primary = node.kind === "experience" ? text(d.title) || "Role" : [text(d.degree), text(d.field)].filter(Boolean).join(", ") || "Degree";
        const secondary = node.kind === "experience" ? [text(d.company), text(d.location)].filter(Boolean).join(" · ") : [text(d.school), text(d.location)].filter(Boolean).join(" · ");
        this.columnEntryHeader(column, primary, secondary, dateRange(d), compact);
        this.columnBullets(column, node.children);
        break;
      }
      case "project":
        this.columnEntryHeader(column, text(d.name) || "Project", text(d.url), dateRange(d), compact);
        this.columnParagraph(column, text(d.description), 0.95);
        this.columnBullets(column, node.children);
        break;
      case "skillGroup": {
        const skills = node.children.map((child) => text(child.data.name)).filter(Boolean).join(", ");
        this.columnInlineLabel(column, text(d.name), skills);
        break;
      }
      case "certification":
        this.columnEntryHeader(column, text(d.name), [text(d.issuer), text(d.date)].filter(Boolean).join(" · "), "", true);
        break;
      case "reference":
        this.columnEntryHeader(column, text(d.name), [text(d.title), text(d.company)].filter(Boolean).join(", "), "", true);
        this.columnParagraph(column, [text(d.email), text(d.phone)].filter(Boolean).join(" · "), 0.8);
        break;
      case "bullet":
        this.columnBullets(column, [node]);
        break;
    }
    this.advanceColumn(column, compact ? 1.5 : this.itemGap());
  }

  private entryHeader(primary: string, secondary: string, meta: string, x: number, width: number, compact: boolean) {
    const metaWidth = meta ? Math.min(width * 0.32, this.measure(meta, 0.88, "normal") + 1) : 0;
    const primaryWidth = width - metaWidth - (metaWidth ? 3 : 0);
    const lines = this.lines(primary, primaryWidth, 1, "bold");
    this.setText(1, "bold", "#18181b");
    this.writeLines(lines, x);
    if (meta) {
      this.setText(0.88, "normal", "#52525b");
      this.doc.text(meta, x + width, this.y - (lines.length - 1) * this.lineHeight, { align: "right" });
    }
    if (secondary) {
      this.setText(0.95, compact ? "normal" : "italic", this.accent);
      this.writeLines(this.lines(secondary, width, 0.95, compact ? "normal" : "italic"), x);
    }
  }

  private columnEntryHeader(column: "main" | "side", primary: string, secondary: string, meta: string, compact: boolean) {
    const cursor = this.cursor(column);
    this.setPage(cursor.page);
    const metaWidth = !compact && meta ? Math.min(cursor.width * 0.34, this.measure(meta, 0.82, "normal") + 1) : 0;
    const primaryWidth = cursor.width - metaWidth - (metaWidth ? 2 : 0);
    const lines = this.lines(primary, primaryWidth, compact ? 0.92 : 1, "bold");
    this.setText(compact ? 0.92 : 1, "bold", "#18181b");
    this.writeColumnLines(column, lines, cursor.x);
    if (meta) {
      const now = this.cursor(column);
      this.setText(0.82, "normal", "#71717a");
      this.doc.text(meta, now.x + now.width, now.y - (lines.length - 1) * this.lineHeight, { align: "right" });
    }
    if (secondary) {
      this.setText(compact ? 0.82 : 0.92, compact ? "normal" : "bold", compact ? "#71717a" : this.accent);
      this.writeColumnLines(column, this.lines(secondary, this.cursor(column).width, compact ? 0.82 : 0.92, compact ? "normal" : "bold"), this.cursor(column).x);
    }
  }

  private bullets(nodes: ResolvedNode[], column: "main" | "side" | undefined) {
    for (const node of nodes) {
      if (node.kind !== "bullet" || !text(node.data.text)) continue;
      if (column) this.columnBullet(column, text(node.data.text));
      else this.bullet(text(node.data.text));
    }
  }

  private bullet(value: string) {
    const width = this.width - this.marginX * 2;
    const lines = this.lines(value, width - 4, 0.95, "normal");
    this.ensure(lines.length * this.lineHeight);
    this.setText(0.95, "normal", "#3f3f46");
    this.doc.setFillColor("#3f3f46");
    this.doc.circle(this.marginX + 1, this.y + this.lineHeight * 0.45, 0.55, "F");
    this.writeLines(lines, this.marginX + 3);
  }

  private columnBullets(column: "main" | "side", nodes: ResolvedNode[]) {
    this.bullets(nodes, column);
  }

  private columnBullet(column: "main" | "side", value: string) {
    const cursor = this.cursor(column);
    const lines = this.lines(value, cursor.width - 3, 0.95, "normal");
    this.ensureColumn(column, lines.length * this.lineHeight);
    const active = this.cursor(column);
    this.setPage(active.page);
    this.setText(0.95, "normal", "#3f3f46");
    this.doc.setFillColor(this.accent);
    this.doc.circle(active.x + 0.9, active.y + this.lineHeight * 0.45, 0.45, "F");
    this.writeColumnLines(column, lines, active.x + 2.5);
  }

  private paragraph(value: string, x: number, width: number, scale: number) {
    if (!value) return;
    const lines = this.lines(value, width, scale, "normal");
    this.ensure(lines.length * this.lineHeight);
    this.setText(scale, "normal", "#3f3f46");
    this.writeLines(lines, x);
  }

  private columnParagraph(column: "main" | "side", value: string, scale: number) {
    if (!value) return;
    const cursor = this.cursor(column);
    const lines = this.lines(value, cursor.width, scale, "normal");
    this.ensureColumn(column, lines.length * this.lineHeight);
    this.setText(scale, "normal", "#3f3f46");
    const active = this.cursor(column);
    this.writeColumnLines(column, lines, active.x);
  }

  private inlineLabel(label: string, value: string, x: number, width: number) {
    const prefix = label ? `${label}: ` : "";
    this.setText(0.95, "bold", "#18181b");
    const prefixWidth = this.doc.getTextWidth(prefix);
    this.setText(0.95, "normal", "#3f3f46");
    const lines = this.lines(value, Math.max(1, width - prefixWidth), 0.95, "normal");
    this.ensure(Math.max(1, lines.length) * this.lineHeight);
    this.setText(0.95, "bold", "#18181b");
    this.doc.text(prefix, x, this.y + this.lineHeight * 0.78);
    this.setText(0.95, "normal", "#3f3f46");
    if (lines.length) {
      this.doc.text(lines[0], x + prefixWidth, this.y + this.lineHeight * 0.78);
      this.y += this.lineHeight;
      for (const line of lines.slice(1)) {
        this.ensure(this.lineHeight);
        this.doc.text(line, x, this.y + this.lineHeight * 0.78);
        this.y += this.lineHeight;
      }
    } else this.y += this.lineHeight;
  }

  private columnInlineLabel(column: "main" | "side", label: string, value: string) {
    const cursor = this.cursor(column);
    const prefix = label ? `${label}: ` : "";
    this.setPage(cursor.page);
    this.setText(0.95, "bold", "#18181b");
    const prefixWidth = this.doc.getTextWidth(prefix);
    this.setText(0.95, "normal", "#3f3f46");
    const lines = this.lines(value, Math.max(1, cursor.width - prefixWidth), 0.95, "normal");
    this.ensureColumn(column, Math.max(1, lines.length) * this.lineHeight);
    const active = this.cursor(column);
    this.setText(0.95, "bold", "#18181b");
    this.doc.text(prefix, active.x, active.y + this.lineHeight * 0.78);
    this.setText(0.95, "normal", "#3f3f46");
    if (lines.length) {
      this.doc.text(lines[0], active.x + prefixWidth, active.y + this.lineHeight * 0.78);
      this.advanceColumn(column, this.lineHeight);
      for (const line of lines.slice(1)) {
        this.ensureColumn(column, this.lineHeight);
        const next = this.cursor(column);
        this.setPage(next.page);
        this.doc.text(line, next.x, next.y + this.lineHeight * 0.78);
        this.advanceColumn(column, this.lineHeight);
      }
    } else this.advanceColumn(column, this.lineHeight);
  }

  private measureItem(node: ResolvedNode, width: number, compact = false) {
    const d = node.data;
    const normal = (value: string, scale = 0.95) => this.lines(value, width, scale, "normal").length * this.lineHeight;
    switch (node.kind) {
      case "experience":
        return normal(text(d.title) || "Role", compact ? 0.92 : 1) + normal([text(d.company), text(d.location)].filter(Boolean).join(" · "), compact ? 0.82 : 0.95) + this.measureBullets(node.children, width);
      case "education":
        return normal([text(d.degree), text(d.field)].filter(Boolean).join(", ") || "Degree", compact ? 0.92 : 1) + normal([text(d.school), text(d.location)].filter(Boolean).join(" · "), compact ? 0.82 : 0.95) + this.measureBullets(node.children, width);
      case "project":
        return normal(text(d.name) || "Project") + normal(text(d.url), 0.92) + normal(text(d.description)) + this.measureBullets(node.children, width);
      case "skillGroup":
        return normal(`${text(d.name)}: ${node.children.map((child) => text(child.data.name)).filter(Boolean).join(", ")}`);
      case "certification":
        return normal(text(d.name), compact ? 0.92 : 1) + normal([text(d.issuer), text(d.date)].filter(Boolean).join(" · "), compact ? 0.82 : 0.95);
      case "reference":
        return normal(text(d.name), compact ? 0.92 : 1) + normal([text(d.title), text(d.company)].filter(Boolean).join(", "), 0.85) + normal([text(d.email), text(d.phone)].filter(Boolean).join(" · "), 0.8);
      case "bullet":
        return normal(text(d.text), 0.95);
      default:
        return this.lineHeight;
    }
  }

  private measureBullets(nodes: ResolvedNode[], width: number) {
    return nodes
      .filter((node) => node.kind === "bullet")
      .reduce((total, node) => total + this.lines(text(node.data.text), Math.max(1, width - 3), 0.95, "normal").length * this.lineHeight, 0);
  }

  private lines(value: string, width: number, scale: number, style: "normal" | "bold" | "italic") {
    if (!value) return [] as string[];
    this.setText(scale, style, "#18181b");
    return this.doc.splitTextToSize(value, width) as string[];
  }

  private measure(value: string, scale: number, style: "normal" | "bold" | "italic") {
    this.setText(scale, style, "#18181b");
    return this.doc.getTextWidth(value);
  }

  private setText(scale: number, style: "normal" | "bold" | "italic", color: string) {
    this.doc.setFont(this.font, style);
    this.doc.setFontSize(this.baseSize * scale);
    this.doc.setTextColor(color);
  }

  private center(value: string, baseline: number) {
    this.doc.text(value, this.width / 2, baseline, { align: "center" });
  }

  private writeLines(lines: string[], x: number) {
    for (const line of lines) {
      this.ensure(this.lineHeight);
      this.doc.text(line, x, this.y + this.lineHeight * 0.78);
      this.y += this.lineHeight;
    }
  }

  private writeColumnLines(column: "main" | "side", lines: string[], x: number) {
    for (const line of lines) {
      this.ensureColumn(column, this.lineHeight);
      const cursor = this.cursor(column);
      this.setPage(cursor.page);
      this.doc.text(line, x, cursor.y + this.lineHeight * 0.78);
      this.advanceColumn(column, this.lineHeight);
    }
  }

  private ensure(height: number) {
    if (this.y + height <= this.bottom || this.y <= this.marginY + 0.01) return;
    this.doc.addPage();
    this.y = this.marginY;
  }

  private ensureColumn(column: "main" | "side", height: number) {
    const cursor = this.cursor(column);
    if (cursor.y + height <= this.bottom || cursor.y <= this.marginY + 0.01) return;
    cursor.page += 1;
    if (this.doc.getNumberOfPages() < cursor.page) this.doc.addPage();
    cursor.y = this.marginY;
    this.setPage(cursor.page);
  }

  private cursor(column: "main" | "side") {
    if (!this.columns) throw new Error("Column layout was not initialized");
    return this.columns[column];
  }

  private advanceColumn(column: "main" | "side", amount: number) {
    this.cursor(column).y += amount;
  }

  private setPage(page: number) {
    this.doc.setPage(page);
  }

  private sectionGap() {
    return Math.max(2, 18 * this.sectionSpacing * MM_PER_CSS_PIXEL);
  }

  private itemGap() {
    return Math.max(1.5, 10 * this.sectionSpacing * MM_PER_CSS_PIXEL);
  }
}

interface ColumnCursor {
  page: number;
  y: number;
  x: number;
  width: number;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dateRange(data: Record<string, unknown>): string {
  const start = text(data.startDate);
  const end = text(data.endDate);
  return start && end ? `${start} – ${end}` : start || end;
}

function contactValues(data: Record<string, unknown>): string[] {
  return [text(data.email), text(data.phone), text(data.location), text(data.website)].filter(Boolean);
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
