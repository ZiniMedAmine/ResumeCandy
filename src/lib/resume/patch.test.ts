import { describe, expect, it } from "vitest";
import {
  inheritingVersionCount,
  mergedOverride,
  overrideIsEmpty,
  withFieldEdit,
  withFieldReset,
  withHidden,
  withRank,
} from "./patch";
import type { NodeOverride } from "./types";

const V = "vGoogle";
const N = "node1";
const base = { title: "Engineer", company: "Initech" };

describe("withFieldEdit", () => {
  it("creates an override with a single-field patch", () => {
    const o = withFieldEdit(undefined, V, N, base, "title", "Senior Engineer");
    expect(o).toEqual({ versionId: V, nodeId: N, patch: { title: "Senior Engineer" }, hidden: null, rank: null });
  });

  it("heals back to inherited when the value equals base", () => {
    const o1 = withFieldEdit(undefined, V, N, base, "title", "Senior Engineer")!;
    const o2 = withFieldEdit(o1, V, N, base, "title", "Engineer");
    expect(o2).toBeNull(); // row should be deleted entirely
  });

  it("keeps other patch fields when one heals", () => {
    let o = withFieldEdit(undefined, V, N, base, "title", "Senior Engineer");
    o = withFieldEdit(o ?? undefined, V, N, base, "company", "Globex");
    const healed = withFieldEdit(o ?? undefined, V, N, base, "title", "Engineer");
    expect(healed).toEqual({ versionId: V, nodeId: N, patch: { company: "Globex" }, hidden: null, rank: null });
  });

  it("preserves hidden/rank when patch empties", () => {
    const hidden = withHidden(undefined, V, N, true)!;
    const withPatch = withFieldEdit(hidden, V, N, base, "title", "X")!;
    const healed = withFieldEdit(withPatch, V, N, base, "title", "Engineer");
    expect(healed).toEqual({ versionId: V, nodeId: N, patch: null, hidden: 1, rank: null });
  });
});

describe("withHidden / withRank", () => {
  it("round-trips hidden to null override", () => {
    const o = withHidden(undefined, V, N, true);
    expect(o?.hidden).toBe(1);
    expect(withHidden(o!, V, N, false)).toBeNull();
  });

  it("drops rank when it matches base rank", () => {
    const o = withRank(undefined, V, N, "a0", "a5");
    expect(o?.rank).toBe("a5");
    expect(withRank(o!, V, N, "a0", "a0")).toBeNull();
  });
});

describe("withFieldReset", () => {
  it("removes just the one field", () => {
    const o: NodeOverride = { versionId: V, nodeId: N, patch: { title: "X", company: "Y" }, hidden: null, rank: null };
    expect(withFieldReset(o, "title")).toEqual({ ...o, patch: { company: "Y" } });
  });

  it("returns null when the last field resets", () => {
    const o: NodeOverride = { versionId: V, nodeId: N, patch: { title: "X" }, hidden: null, rank: null };
    expect(withFieldReset(o, "title")).toBeNull();
  });

  it("no-ops when the field is not overridden", () => {
    const o: NodeOverride = { versionId: V, nodeId: N, patch: { title: "X" }, hidden: null, rank: null };
    expect(withFieldReset(o, "company")).toBe(o);
  });
});

describe("mergedOverride", () => {
  it("copies patch fields onto the target, source winning", () => {
    const target: NodeOverride = { versionId: "vB", nodeId: N, patch: { title: "B-title" }, hidden: null, rank: null };
    const source: NodeOverride = { versionId: V, nodeId: N, patch: { title: "G-title", company: "G-co" }, hidden: null, rank: null };
    expect(mergedOverride(target, source, "vB")).toEqual({
      versionId: "vB",
      nodeId: N,
      patch: { title: "G-title", company: "G-co" },
      hidden: null,
      rank: null,
    });
  });

  it("creates the target override when missing", () => {
    const source: NodeOverride = { versionId: V, nodeId: N, patch: { title: "G" }, hidden: 1, rank: "a9" };
    expect(mergedOverride(undefined, source, "vB")).toEqual({
      versionId: "vB",
      nodeId: N,
      patch: { title: "G" },
      hidden: 1,
      rank: "a9",
    });
  });
});

describe("overrideIsEmpty", () => {
  it("treats empty patch, no hidden, no rank as empty", () => {
    expect(overrideIsEmpty({ versionId: V, nodeId: N, patch: {}, hidden: null, rank: null })).toBe(true);
    expect(overrideIsEmpty({ versionId: V, nodeId: N, patch: null, hidden: 0, rank: null })).toBe(true);
    expect(overrideIsEmpty({ versionId: V, nodeId: N, patch: null, hidden: 1, rank: null })).toBe(false);
    expect(overrideIsEmpty({ versionId: V, nodeId: N, patch: null, hidden: null, rank: "a1" })).toBe(false);
  });
});

describe("inheritingVersionCount", () => {
  const versions = ["vBase", "vGoogle", "vAmazon", "vMsft"];
  it("counts versions that would receive a base edit for a field", () => {
    const overrides: NodeOverride[] = [
      { versionId: "vGoogle", nodeId: N, patch: { title: "G" }, hidden: null, rank: null },
      { versionId: "vAmazon", nodeId: N, patch: { company: "A" }, hidden: null, rank: null }, // different field
      { versionId: "vMsft", nodeId: "other", patch: { title: "M" }, hidden: null, rank: null }, // different node
    ];
    expect(inheritingVersionCount(versions, "vBase", overrides, N, "title")).toEqual({ inheriting: 2, total: 3 });
  });

  it("counts hidden nodes as not receiving the edit", () => {
    const overrides: NodeOverride[] = [
      { versionId: "vGoogle", nodeId: N, patch: null, hidden: 1, rank: null },
    ];
    expect(inheritingVersionCount(versions, "vBase", overrides, N, "title")).toEqual({ inheriting: 2, total: 3 });
  });
});
