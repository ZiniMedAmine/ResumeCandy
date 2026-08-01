/**
 * The language a *résumé* is written in — deliberately separate from the
 * language of the application's own interface.
 *
 * A CV's language is stored as a design setting, so it layers exactly like
 * every other one: the resume carries a base language and each version may
 * override it. "My CV in French" is therefore just a version whose
 * settingsPatch sets `language: "fr"`.
 *
 * This module is the whole catalogue and nothing else: no React, no imports
 * from `design.ts` (which imports *this*), so it stays usable from the pure
 * engine, the PDF writer and tests alike.
 */

import type { SectionType } from "./resume/types";

export type LocaleId = "en" | "fr" | "ar";

export type Direction = "ltr" | "rtl";

export interface LocaleDef {
  id: LocaleId;
  /** Shown in the picker in its own language, never translated. */
  name: string;
  dir: Direction;
  monthsShort: string[];
  monthsLong: string[];
  /** The word for a role that is still ongoing. */
  present: string;
  /** Sits between a start and end date. */
  rangeSeparator: string;
  /** Default heading a newly added section of each type gets. */
  sectionTitles: Record<SectionType, string>;
}

/**
 * Arabic months use the international Gregorian names (يناير, فبراير …) rather
 * than the Levantine ones (كانون الثاني …): they are what professional CVs
 * across the Arab world use, and they read unambiguously everywhere.
 *
 * Arabic has no conventional month abbreviations — the full names are short
 * already — so short and long are the same list rather than an invented
 * truncation that would look wrong to a native reader.
 */
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const LOCALES: Record<LocaleId, LocaleDef> = {
  en: {
    id: "en",
    name: "English",
    dir: "ltr",
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    monthsLong: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    present: "Present",
    rangeSeparator: "–",
    sectionTitles: {
      experience: "Professional Experience",
      education: "Education",
      skills: "Technical Skills",
      languages: "Languages",
      certifications: "Certificates",
      interests: "Interests",
      projects: "Projects",
      courses: "Courses",
      awards: "Awards",
      organisations: "Organisations",
      publications: "Publications",
      references: "References",
      declaration: "Declaration",
      custom: "Custom Section",
    },
  },
  fr: {
    id: "fr",
    name: "Français",
    dir: "ltr",
    monthsShort: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
    monthsLong: [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ],
    present: "Présent",
    rangeSeparator: "–",
    sectionTitles: {
      experience: "Expérience Professionnelle",
      education: "Formation",
      skills: "Compétences Techniques",
      languages: "Langues",
      certifications: "Certifications",
      interests: "Centres d'Intérêt",
      projects: "Projets",
      courses: "Cours",
      awards: "Distinctions",
      organisations: "Associations",
      publications: "Publications",
      references: "Références",
      declaration: "Déclaration",
      custom: "Section Personnalisée",
    },
  },
  ar: {
    id: "ar",
    name: "العربية",
    dir: "rtl",
    monthsShort: AR_MONTHS,
    monthsLong: AR_MONTHS,
    present: "حتى الآن",
    rangeSeparator: "–",
    sectionTitles: {
      experience: "الخبرة المهنية",
      education: "التعليم",
      skills: "المهارات التقنية",
      languages: "اللغات",
      certifications: "الشهادات",
      interests: "الاهتمامات",
      projects: "المشاريع",
      courses: "الدورات التدريبية",
      awards: "الجوائز",
      organisations: "العضويات",
      publications: "المنشورات",
      references: "المراجع",
      declaration: "إقرار",
      custom: "قسم مخصص",
    },
  },
};

/** Every locale, in picker order. */
export const LOCALE_LIST: LocaleDef[] = [LOCALES.en, LOCALES.fr, LOCALES.ar];

export function localeOf(id: LocaleId | string | null | undefined): LocaleDef {
  return LOCALES[id as LocaleId] ?? LOCALES.en;
}

export function directionOf(id: LocaleId | string | null | undefined): Direction {
  return localeOf(id).dir;
}

export function isRtlLocale(id: LocaleId | string | null | undefined): boolean {
  return directionOf(id) === "rtl";
}

/** The heading a newly added section of this type gets, in the CV's language. */
export function sectionTitle(type: SectionType | string | undefined, locale: LocaleId): string {
  const titles = localeOf(locale).sectionTitles;
  return titles[type as SectionType] ?? titles.custom;
}

/* --------------------------- untouched headings ---------------------------- */

/**
 * Headings that count as "not renamed by the user" beyond the generated
 * defaults above.
 *
 * Switching a CV's language retitles only headings the user never touched, and
 * that judgement is only as good as this list: someone who typed nothing is
 * usually looking at a heading that came from a template, an import or an
 * older version of this app, not at the exact string `sectionTitles` produces
 * today. Recognising the handful of ordinary phrasings per type is what makes
 * the feature work on real resumes instead of only on freshly created ones.
 *
 * These are recognised, never generated. Anything genuinely personal ("My
 * Journey at Google") matches nothing here and is left alone.
 */
const HEADING_ALIASES: Partial<Record<SectionType, string[]>> = {
  experience: [
    "Work Experience", "Experience", "Employment", "Employment History",
    "Work History", "Professional Background", "Career History",
    "Expérience", "Expériences", "Expériences Professionnelles", "Parcours Professionnel",
    "الخبرات", "الخبرة", "الخبرات المهنية", "الخبرة العملية",
  ],
  education: [
    "Academic Background", "Academic History", "Studies", "Qualifications",
    "Éducation", "Formations", "Études", "Parcours Académique",
    "التعليم والتدريب", "المؤهلات العلمية", "الدراسة",
  ],
  skills: [
    "Skills", "Core Skills", "Key Skills", "Expertise", "Competencies",
    "Compétences", "Compétences Clés", "Savoir-Faire",
    "المهارات", "الكفاءات",
  ],
  languages: ["Language Skills", "Compétences Linguistiques", "اللغة"],
  certifications: [
    "Certifications", "Licenses", "Licenses & Certifications", "Credentials",
    "Certificats", "Diplômes et Certifications",
    "الشهادات المهنية", "التراخيص",
  ],
  interests: [
    "Hobbies", "Hobbies & Interests", "Personal Interests",
    "Loisirs", "Centres d'Interet",
    "الهوايات", "الاهتمامات الشخصية",
  ],
  projects: [
    "Personal Projects", "Key Projects", "Selected Projects",
    "Projets Personnels", "Projets Clés",
    "المشاريع الشخصية", "أهم المشاريع",
  ],
  courses: ["Training", "Courses & Training", "Formations", "Cours et Formations", "الدورات", "التدريب"],
  awards: ["Honors", "Honours", "Honors & Awards", "Achievements", "Prix", "Récompenses", "الإنجازات", "التكريمات"],
  organisations: ["Organizations", "Memberships", "Volunteering", "Bénévolat", "Adhésions", "التطوع", "المنظمات"],
  publications: ["Papers", "Articles", "Research", "Recherche", "الأبحاث", "الأوراق البحثية"],
  references: ["Referees", "Recommandations", "التوصيات"],
  declaration: ["Statement", "Déclaration Finale", "تعهد"],
};

/** Case- and whitespace-insensitive, so "WORK EXPERIENCE " still matches. */
function normalizeHeading(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * Every string that means "this heading was never personalised" for a type —
 * each locale's generated default plus the aliases above.
 */
function defaultHeadingsFor(type: SectionType | string | undefined): Set<string> {
  const set = new Set<string>();
  for (const locale of LOCALE_LIST) {
    set.add(normalizeHeading(sectionTitle(type, locale.id)));
  }
  for (const alias of HEADING_ALIASES[type as SectionType] ?? []) {
    set.add(normalizeHeading(alias));
  }
  return set;
}

/**
 * True when this heading is still a default for its type in *any* locale.
 *
 * Checking every locale rather than just the current one is what lets a CV
 * move between languages repeatedly: a heading translated to French on the
 * way in is recognised again on the way back to English.
 */
export function isDefaultHeading(title: string, type: SectionType | string | undefined): boolean {
  const normalized = normalizeHeading(title);
  if (!normalized) return true;
  return defaultHeadingsFor(type).has(normalized);
}

/* -------------------------------- numerals --------------------------------- */

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Rewrites Western digits as Arabic-Indic ones (2022 → ٢٠٢٢). */
export function toArabicIndic(value: string): string {
  return value.replace(/[0-9]/g, (digit) => ARABIC_INDIC[Number(digit)]);
}
