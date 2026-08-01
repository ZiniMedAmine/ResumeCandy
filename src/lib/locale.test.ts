import { describe, expect, it } from "vitest";
import {
  LOCALE_LIST,
  directionOf,
  isDefaultHeading,
  isRtlLocale,
  localeOf,
  sectionTitle,
  toArabicIndic,
} from "./locale";
import { SECTION_PRESETS } from "./sections";

describe("localeOf", () => {
  it("falls back to English for unknown or missing ids", () => {
    expect(localeOf(undefined).id).toBe("en");
    expect(localeOf("de").id).toBe("en");
  });

  it("marks only Arabic as right-to-left", () => {
    expect(directionOf("en")).toBe("ltr");
    expect(directionOf("fr")).toBe("ltr");
    expect(directionOf("ar")).toBe("rtl");
    expect(isRtlLocale("ar")).toBe(true);
  });

  it("names each locale in its own language", () => {
    expect(localeOf("fr").name).toBe("Français");
    expect(localeOf("ar").name).toBe("العربية");
  });

  it("gives every locale twelve months", () => {
    for (const locale of LOCALE_LIST) {
      expect(locale.monthsShort).toHaveLength(12);
      expect(locale.monthsLong).toHaveLength(12);
    }
  });
});

describe("sectionTitle", () => {
  it("covers every section type the picker can create", () => {
    for (const preset of SECTION_PRESETS) {
      for (const locale of LOCALE_LIST) {
        expect(sectionTitle(preset.type, locale.id)).toBeTruthy();
      }
    }
  });

  it("falls back to the custom heading for an unknown type", () => {
    expect(sectionTitle("nonsense", "en")).toBe("Custom Section");
  });
});

describe("isDefaultHeading", () => {
  it("recognises each locale's own generated default", () => {
    for (const locale of LOCALE_LIST) {
      expect(isDefaultHeading(sectionTitle("experience", locale.id), "experience")).toBe(true);
    }
  });

  it("recognises a heading translated into another language", () => {
    // What makes switching language repeatable: French on the way in has to be
    // recognised again on the way back to English.
    expect(isDefaultHeading("Expérience Professionnelle", "experience")).toBe(true);
    expect(isDefaultHeading("الخبرة المهنية", "experience")).toBe(true);
  });

  it("ignores case and stray whitespace", () => {
    expect(isDefaultHeading("  WORK   EXPERIENCE ", "experience")).toBe(true);
  });

  it("recognises the ordinary phrasings people actually have", () => {
    expect(isDefaultHeading("Work Experience", "experience")).toBe(true);
    expect(isDefaultHeading("Skills", "skills")).toBe(true);
    expect(isDefaultHeading("Certifications", "certifications")).toBe(true);
    expect(isDefaultHeading("Hobbies", "interests")).toBe(true);
  });

  it("treats an empty heading as untouched", () => {
    expect(isDefaultHeading("   ", "projects")).toBe(true);
  });

  it("leaves a personalised heading alone", () => {
    expect(isDefaultHeading("My Journey at Google", "experience")).toBe(false);
    expect(isDefaultHeading("Ce que j'ai construit", "projects")).toBe(false);
  });

  it("does not match a default belonging to a different section type", () => {
    expect(isDefaultHeading("Education", "experience")).toBe(false);
  });
});

describe("toArabicIndic", () => {
  it("converts Western digits", () => {
    expect(toArabicIndic("2022")).toBe("٢٠٢٢");
    expect(toArabicIndic("03/2022")).toBe("٠٣/٢٠٢٢");
  });

  it("leaves everything else untouched", () => {
    expect(toArabicIndic("مارس 2022")).toBe("مارس ٢٠٢٢");
    expect(toArabicIndic("Present")).toBe("Present");
  });
});
