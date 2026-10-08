import { describe, expect, it } from "vitest";
import { hasRichText, parseRichText, stripRichText } from "./rich-text";

describe("parseRichText", () => {
  it("returns one plain run for unmarked text", () => {
    expect(parseRichText("Built pipelines")).toEqual([{ text: "Built pipelines", bold: false }]);
  });

  it("splits bold runs out of a sentence", () => {
    expect(parseRichText("Built **Kafka** streaming on **AWS**.")).toEqual([
      { text: "Built ", bold: false },
      { text: "Kafka", bold: true },
      { text: " streaming on ", bold: false },
      { text: "AWS", bold: true },
      { text: ".", bold: false },
    ]);
  });

  it("keeps multi-word bold phrases together", () => {
    expect(parseRichText("**data modeling** first")[0]).toEqual({ text: "data modeling", bold: true });
  });

  it("keeps an unmatched mark literally", () => {
    expect(parseRichText("Half **typed")).toEqual([{ text: "Half **typed", bold: false }]);
  });

  it("ignores marks around whitespace only", () => {
    expect(parseRichText("a ** b ** c")).toEqual([{ text: "a ** b ** c", bold: false }]);
  });

  it("returns no runs for empty text", () => {
    expect(parseRichText("")).toEqual([]);
  });
});

describe("stripRichText / hasRichText", () => {
  it("removes marks and keeps the words", () => {
    expect(stripRichText("Led **CI/CD** with **GitHub Actions**")).toBe("Led CI/CD with GitHub Actions");
  });

  it("detects marks", () => {
    expect(hasRichText("plain")).toBe(false);
    expect(hasRichText("one **bold** word")).toBe(true);
    expect(hasRichText("one **bold** word")).toBe(true);
  });
});
