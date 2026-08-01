import { describe, expect, it } from "vitest";
import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { localeFromAcceptLanguage } from "./index";
import { formatNumber, plural, translate } from "./translate";

describe("interpolation", () => {
  it("substitutes named placeholders", () => {
    expect(translate("en", "Delete “{name}”?", { name: "Google" })).toBe("Delete “Google”?");
  });

  it("substitutes the same placeholder everywhere it appears", () => {
    expect(translate("en", "{a} then {a}", { a: "x" })).toBe("x then x");
  });

  it("leaves an unmatched placeholder visible rather than blanking it", () => {
    // A stray "{name}" on screen is a bug report; a silent gap is not.
    expect(translate("en", "Hello {name}", { other: "x" })).toBe("Hello {name}");
  });

  it("returns the template untouched when there are no params", () => {
    expect(translate("en", "Plain string")).toBe("Plain string");
  });

  it("formats numeric params through Intl", () => {
    expect(translate("en", "{n} items", { n: 1234 })).toBe("1,234 items");
    expect(translate("fr", "{n} éléments", { n: 1234 })).toBe("1 234 éléments");
  });
});

describe("plural selection", () => {
  const versions = plural({ one: "{n} version", other: "{n} versions" });

  it("picks English forms", () => {
    expect(translate("en", versions, { n: 1 })).toBe("1 version");
    expect(translate("en", versions, { n: 0 })).toBe("0 versions");
    expect(translate("en", versions, { n: 7 })).toBe("7 versions");
  });

  it("picks all six Arabic categories", () => {
    // The noun itself changes shape, which is why `n === 1 ? a : b` cannot work.
    const nusakh = plural({
      zero: "zero",
      one: "one",
      two: "two",
      few: "few",
      many: "many",
      other: "other",
    });
    expect(translate("ar", nusakh, { n: 0 })).toBe("zero");
    expect(translate("ar", nusakh, { n: 1 })).toBe("one");
    expect(translate("ar", nusakh, { n: 2 })).toBe("two");
    expect(translate("ar", nusakh, { n: 3 })).toBe("few");
    expect(translate("ar", nusakh, { n: 10 })).toBe("few");
    expect(translate("ar", nusakh, { n: 11 })).toBe("many");
    expect(translate("ar", nusakh, { n: 99 })).toBe("many");
    expect(translate("ar", nusakh, { n: 100 })).toBe("other");
  });

  it("falls back to `other` when the locale selects a category the entry lacks", () => {
    // English-shaped entry read in Arabic: "two" and "few" simply are not there.
    expect(translate("ar", versions, { n: 2 })).toBe("2 versions");
  });

  it("treats a missing count as zero rather than throwing", () => {
    expect(translate("en", versions)).toBe("{n} versions");
  });
});

describe("numerals", () => {
  it("writes Arabic counts in Western digits", () => {
    // Maghrebi convention; Arabic-Indic numerals stay an opt-in on the paper.
    expect(formatNumber("ar", 2022)).toBe("2,022");
    expect(translate("ar", "{n}", { n: 11 })).toBe("11");
  });
});

describe("dictionary parity", () => {
  // The `Dictionary` type already makes a missing key a compile error; this
  // catches the other half — a key that was translated as an empty string.
  const flatten = (value: unknown, path: string[] = []): [string, unknown][] =>
    value && typeof value === "object"
      ? Object.entries(value).flatMap(([k, v]) => flatten(v, [...path, k]))
      : [[path.join("."), value]];

  it.each([
    ["fr", fr],
    ["ar", ar],
  ])("%s has a non-empty string for every English leaf", (_name, dictionary) => {
    for (const [path, value] of flatten(dictionary)) {
      expect(typeof value, path).toBe("string");
      expect(String(value).trim(), path).not.toBe("");
    }
  });

  it("keeps the product name untranslated", () => {
    expect(fr.app.name).toBe(en.app.name);
    expect(ar.app.name).toBe(en.app.name);
  });
});

describe("accept-language", () => {
  it("takes the highest-quality supported language", () => {
    expect(localeFromAcceptLanguage("de,fr;q=0.8,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("matches on the primary subtag", () => {
    expect(localeFromAcceptLanguage("ar-MA")).toBe("ar");
  });

  it("returns null when nothing is supported", () => {
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });
});
