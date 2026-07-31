import type { NodeKind, SectionType } from "./resume/types";

/**
 * The catalogue of section types a resume can hold.
 *
 * One list drives the Add-content picker, the default heading a new section
 * gets, the icon it shows in the editor and on the paper, and which kind of
 * node its "Add entry" button creates — so a new section type is one entry
 * here rather than four switch statements that can drift apart.
 *
 * Several types share a child kind on purpose: a course, an award and a
 * certificate are all "name, issuer, date", and giving them separate node
 * kinds would buy nothing but three more branches everywhere.
 */
export interface SectionPreset {
  type: SectionType;
  /** Default heading printed on the resume. */
  title: string;
  /** One-liner in the picker. */
  description: string;
  /** Node kind created by this section's add button. */
  childKind: NodeKind;
  addLabel: string;
}

export const SECTION_PRESETS: SectionPreset[] = [
  {
    type: "education",
    title: "Education",
    description: "Your degrees and schools, with focus, honours or exchange terms.",
    childKind: "education",
    addLabel: "Add entry",
  },
  {
    type: "experience",
    title: "Professional Experience",
    description: "Roles and employment history, including internships.",
    childKind: "experience",
    addLabel: "Add entry",
  },
  {
    type: "skills",
    title: "Technical Skills",
    description: "The hard and soft skills that make you stand out.",
    childKind: "skillGroup",
    addLabel: "Add skill group",
  },
  {
    type: "languages",
    title: "Languages",
    description: "Languages you speak and how fluent you are in each.",
    childKind: "language",
    addLabel: "Add language",
  },
  {
    type: "certifications",
    title: "Certificates",
    description: "Industry certificates and licences, with issuer and date.",
    childKind: "certification",
    addLabel: "Add certificate",
  },
  {
    type: "interests",
    title: "Interests",
    description: "Personal interests that support your story and cultural fit.",
    childKind: "skillGroup",
    addLabel: "Add interest group",
  },
  {
    type: "projects",
    title: "Projects",
    description: "Key projects, with your role, the challenge and the impact.",
    childKind: "project",
    addLabel: "Add project",
  },
  {
    type: "courses",
    title: "Courses",
    description: "Online or in-person courses and trainings you completed.",
    childKind: "certification",
    addLabel: "Add course",
  },
  {
    type: "awards",
    title: "Awards",
    description: "Recognitions from industry, competitions or academia.",
    childKind: "certification",
    addLabel: "Add award",
  },
  {
    type: "organisations",
    title: "Organisations",
    description: "Memberships and volunteering, including your role.",
    childKind: "experience",
    addLabel: "Add organisation",
  },
  {
    type: "publications",
    title: "Publications",
    description: "Articles, papers or books you wrote or contributed to.",
    childKind: "project",
    addLabel: "Add publication",
  },
  {
    type: "references",
    title: "References",
    description: "Referees from managers or coworkers, with contact details.",
    childKind: "reference",
    addLabel: "Add reference",
  },
  {
    type: "declaration",
    title: "Declaration",
    description: "A closing statement, signed off in your own words.",
    childKind: "text",
    addLabel: "Add paragraph",
  },
  {
    type: "custom",
    title: "Custom Section",
    description: "Anything else — free paragraphs under a heading you choose.",
    childKind: "text",
    addLabel: "Add paragraph",
  },
];

const BY_TYPE = new Map(SECTION_PRESETS.map((p) => [p.type, p]));

/** Falls back to Experience so unknown/legacy section types still work. */
export function sectionPreset(type: SectionType | string | undefined): SectionPreset {
  return BY_TYPE.get(type as SectionType) ?? BY_TYPE.get("experience")!;
}
