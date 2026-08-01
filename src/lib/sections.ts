import type { NodeKind, SectionType } from "./resume/types";

/**
 * The catalogue of section types a resume can hold.
 *
 * One list drives the Add-content picker, the icon a section shows in the
 * editor and on the paper, and which kind of node its "Add entry" button
 * creates — so a new section type is one entry here rather than four switch
 * statements that can drift apart.
 *
 * Two things deliberately live elsewhere. The default *heading* is in
 * `locale.ts`: it is printed on the résumé, so it belongs to the CV's
 * language. The picker blurb and the add-button wording are in the interface
 * dictionary, keyed by `type` and `addKey`: they are this app talking, so they
 * follow the app's language. Keeping the two apart is what lets an Arabic CV
 * be edited in an English UI.
 *
 * Several types share a child kind on purpose: a course, an award and a
 * certificate are all "name, issuer, date", and giving them separate node
 * kinds would buy nothing but three more branches everywhere.
 */
export type AddLabelKey =
  | "entry"
  | "skillGroup"
  | "language"
  | "certificate"
  | "interestGroup"
  | "project"
  | "course"
  | "award"
  | "organisation"
  | "publication"
  | "reference"
  | "paragraph";

export interface SectionPreset {
  type: SectionType;
  /** Node kind created by this section's add button. */
  childKind: NodeKind;
  /** Key into `t.sections.add` — what the add button says. */
  addKey: AddLabelKey;
}

export const SECTION_PRESETS: SectionPreset[] = [
  { type: "education", childKind: "education", addKey: "entry" },
  { type: "experience", childKind: "experience", addKey: "entry" },
  { type: "skills", childKind: "skillGroup", addKey: "skillGroup" },
  { type: "languages", childKind: "language", addKey: "language" },
  { type: "certifications", childKind: "certification", addKey: "certificate" },
  { type: "interests", childKind: "skillGroup", addKey: "interestGroup" },
  { type: "projects", childKind: "project", addKey: "project" },
  { type: "courses", childKind: "certification", addKey: "course" },
  { type: "awards", childKind: "certification", addKey: "award" },
  { type: "organisations", childKind: "experience", addKey: "organisation" },
  { type: "publications", childKind: "project", addKey: "publication" },
  { type: "references", childKind: "reference", addKey: "reference" },
  { type: "declaration", childKind: "text", addKey: "paragraph" },
  { type: "custom", childKind: "text", addKey: "paragraph" },
];

const BY_TYPE = new Map(SECTION_PRESETS.map((p) => [p.type, p]));

/** Falls back to Experience so unknown/legacy section types still work. */
export function sectionPreset(type: SectionType | string | undefined): SectionPreset {
  return BY_TYPE.get(type as SectionType) ?? BY_TYPE.get("experience")!;
}
