import { describe, expect, it } from "vitest";
import {
  describeDateValue,
  formatDateValue,
  initialPickerYear,
  parseDateValue,
} from "./date-value";

describe("parseDateValue", () => {
  it("parses the canonical YYYY-MM form", () => {
    expect(parseDateValue("2022-03")).toEqual({ year: 2022, month: 3, present: false, custom: null });
  });

  it("tolerates a single-digit month", () => {
    expect(parseDateValue("2022-3")).toEqual({ year: 2022, month: 3, present: false, custom: null });
  });

  it("parses the MM/YYYY ordering", () => {
    expect(parseDateValue("09/2024")).toEqual({ year: 2024, month: 9, present: false, custom: null });
  });

  it("parses a year on its own", () => {
    expect(parseDateValue("2014")).toEqual({ year: 2014, month: null, present: false, custom: null });
  });

  it("recognises the ways people write an ongoing role", () => {
    for (const word of ["Present", "present", "Current", "now", "Ongoing"]) {
      expect(parseDateValue(word).present).toBe(true);
    }
  });

  it("keeps anything else verbatim instead of guessing", () => {
    expect(parseDateValue("Summer 2023")).toEqual({
      year: null,
      month: null,
      present: false,
      custom: "Summer 2023",
    });
  });

  it("rejects impossible months rather than storing them as dates", () => {
    expect(parseDateValue("2022-13").custom).toBe("2022-13");
    expect(parseDateValue("13/2022").custom).toBe("13/2022");
  });

  it("treats empty and non-string input as blank", () => {
    expect(parseDateValue("")).toEqual({ year: null, month: null, present: false, custom: null });
    expect(parseDateValue("   ")).toEqual({ year: null, month: null, present: false, custom: null });
    expect(parseDateValue(undefined)).toEqual({ year: null, month: null, present: false, custom: null });
  });
});

describe("formatDateValue", () => {
  it("zero-pads the month into the canonical form", () => {
    expect(formatDateValue({ year: 2022, month: 3, present: false, custom: null })).toBe("2022-03");
  });

  it("writes a bare year when no month is chosen", () => {
    expect(formatDateValue({ year: 2014, month: null, present: false, custom: null })).toBe("2014");
  });

  it("writes Present regardless of any stored year", () => {
    expect(formatDateValue({ year: 2022, month: 5, present: true, custom: null })).toBe("Present");
  });

  it("passes custom text through", () => {
    expect(formatDateValue({ year: null, month: null, present: false, custom: "Summer 2023" })).toBe(
      "Summer 2023",
    );
  });

  it("returns empty for a blank value", () => {
    expect(formatDateValue({ year: null, month: null, present: false, custom: null })).toBe("");
  });
});

describe("round trip", () => {
  it("leaves every recognised shape unchanged in canonical form", () => {
    for (const raw of ["2022-03", "2014", "Present"]) {
      expect(formatDateValue(parseDateValue(raw))).toBe(raw);
    }
  });

  it("normalises alternate orderings to the canonical form", () => {
    expect(formatDateValue(parseDateValue("09/2024"))).toBe("2024-09");
    expect(formatDateValue(parseDateValue("current"))).toBe("Present");
  });

  it("never rewrites free text", () => {
    expect(formatDateValue(parseDateValue("Summer 2023"))).toBe("Summer 2023");
  });
});

describe("describeDateValue", () => {
  it("shows a readable month and year", () => {
    expect(describeDateValue("2022-03")).toBe("Mar 2022");
    expect(describeDateValue("2022-12")).toBe("Dec 2022");
  });

  it("shows year-only, Present and custom values as they are", () => {
    expect(describeDateValue("2014")).toBe("2014");
    expect(describeDateValue("now")).toBe("Present");
    expect(describeDateValue("Summer 2023")).toBe("Summer 2023");
    expect(describeDateValue("")).toBe("");
  });
});

describe("initialPickerYear", () => {
  it("opens on the value's year when there is one", () => {
    expect(initialPickerYear("2019-06", 2030)).toBe(2019);
    expect(initialPickerYear("2014", 2030)).toBe(2014);
  });

  it("falls back for blank, Present and free-form values", () => {
    expect(initialPickerYear("", 2030)).toBe(2030);
    expect(initialPickerYear("Present", 2030)).toBe(2030);
    expect(initialPickerYear("Summer 2023", 2030)).toBe(2030);
  });
});
