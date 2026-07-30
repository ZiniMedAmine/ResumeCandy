import { describe, expect, it } from "vitest";
import { flattenTree, resolveVersion, sectionTitleOf } from "./resolve";
import type { NodeOverride, ResumeNode } from "./types";

const R = "resume1";
const BASE = "vBase";
const GOOGLE = "vGoogle";
const AMAZON = "vAmazon";

function node(partial: Partial<ResumeNode> & { id: string; kind: ResumeNode["kind"] }): ResumeNode {
  return {
    resumeId: R,
    parentId: null,
    rank: "a0",
    data: {},
    ownerVersionId: null,
    ...partial,
  };
}

/** header + experience section with one experience holding two bullets. */
function fixture(): ResumeNode[] {
  return [
    node({ id: "hdr", kind: "header", rank: "a0", data: { fullName: "Ada Lovelace", headline: "Engineer" } }),
    node({ id: "secExp", kind: "section", rank: "a1", data: { title: "Work Experience", sectionType: "experience" } }),
    node({ id: "exp1", kind: "experience", parentId: "secExp", rank: "a0", data: { company: "Initech", title: "Engineer" } }),
    node({ id: "b1", kind: "bullet", parentId: "exp1", rank: "a0", data: { text: "Built the thing" } }),
    node({ id: "b2", kind: "bullet", parentId: "exp1", rank: "a1", data: { text: "Shipped the thing" } }),
  ];
}

describe("resolveVersion", () => {
  it("resolves the base version untouched when there are no overrides", () => {
    const tree = resolveVersion(fixture(), [], BASE);
    expect(tree.roots.map((r) => r.id)).toEqual(["hdr", "secExp"]);
    const exp = tree.byId.get("exp1")!;
    expect(exp.status).toBe("base");
    expect(exp.data.company).toBe("Initech");
    expect(tree.byId.get("b1")!.data.text).toBe("Built the thing");
  });

  it("applies a field patch to only that field, leaving siblings inheriting", () => {
    const overrides: NodeOverride[] = [
      { versionId: GOOGLE, nodeId: "exp1", patch: { title: "Senior Engineer" }, hidden: null, rank: null },
    ];
    const g = resolveVersion(fixture(), overrides, GOOGLE);
    const exp = g.byId.get("exp1")!;
    expect(exp.data.title).toBe("Senior Engineer");
    expect(exp.data.company).toBe("Initech"); // untouched field still inherits
    expect(exp.status).toBe("customized");
    expect(exp.customizedFields).toEqual(["title"]);

    // Sibling version sees pure base.
    const a = resolveVersion(fixture(), overrides, AMAZON);
    expect(a.byId.get("exp1")!.data.title).toBe("Engineer");
    expect(a.byId.get("exp1")!.status).toBe("base");
  });

  it("lets later base edits flow through non-overridden fields", () => {
    const overrides: NodeOverride[] = [
      { versionId: GOOGLE, nodeId: "exp1", patch: { title: "Senior Engineer" }, hidden: null, rank: null },
    ];
    const nodes = fixture();
    // Base edit happens after Google overrode `title`.
    const exp = nodes.find((n) => n.id === "exp1")!;
    exp.data = { ...exp.data, company: "Globex" };

    const g = resolveVersion(nodes, overrides, GOOGLE);
    expect(g.byId.get("exp1")!.data.company).toBe("Globex"); // flows through
    expect(g.byId.get("exp1")!.data.title).toBe("Senior Engineer"); // override kept
  });

  it("prunes hidden subtrees from resolution but keeps them with includeHidden", () => {
    const overrides: NodeOverride[] = [
      { versionId: GOOGLE, nodeId: "exp1", patch: null, hidden: 1, rank: null },
    ];
    const g = resolveVersion(fixture(), overrides, GOOGLE);
    expect(g.byId.has("exp1")).toBe(false);
    expect(g.byId.has("b1")).toBe(false); // descendants pruned with parent
    expect(g.byId.get("secExp")!.children).toHaveLength(0);

    const withHidden = resolveVersion(fixture(), overrides, GOOGLE, { includeHidden: true });
    expect(withHidden.byId.get("exp1")!.hidden).toBe(true);
    expect(withHidden.byId.get("b1")!.hidden).toBe(false); // itself not hidden
    expect(withHidden.byId.get("exp1")!.children.map((c) => c.id)).toEqual(["b1", "b2"]);

    // Base untouched.
    const b = resolveVersion(fixture(), overrides, BASE);
    expect(b.byId.has("exp1")).toBe(true);
  });

  it("deleting an override restores the base value exactly", () => {
    const nodes = fixture();
    const withOverride = resolveVersion(
      nodes,
      [{ versionId: GOOGLE, nodeId: "b1", patch: { text: "Tailored for Google" }, hidden: null, rank: null }],
      GOOGLE,
    );
    expect(withOverride.byId.get("b1")!.data.text).toBe("Tailored for Google");

    const afterReset = resolveVersion(nodes, [], GOOGLE);
    expect(afterReset.byId.get("b1")!.data.text).toBe("Built the thing");
    expect(afterReset.byId.get("b1")!.status).toBe("base");
  });

  it("reorders in one version without moving another", () => {
    const overrides: NodeOverride[] = [
      // Move b2 before b1 in Amazon only.
      { versionId: AMAZON, nodeId: "b2", patch: null, hidden: null, rank: "Zz" },
    ];
    const amazon = resolveVersion(fixture(), overrides, AMAZON);
    expect(amazon.byId.get("exp1")!.children.map((c) => c.id)).toEqual(["b2", "b1"]);
    expect(amazon.byId.get("b2")!.reordered).toBe(true);

    const google = resolveVersion(fixture(), overrides, GOOGLE);
    expect(google.byId.get("exp1")!.children.map((c) => c.id)).toEqual(["b1", "b2"]);
  });

  it("keeps version-local nodes out of sibling versions", () => {
    const nodes = [
      ...fixture(),
      node({ id: "gBullet", kind: "bullet", parentId: "exp1", rank: "a2", data: { text: "Google-only bullet" }, ownerVersionId: GOOGLE }),
    ];
    const g = resolveVersion(nodes, [], GOOGLE);
    expect(g.byId.get("gBullet")!.status).toBe("local");
    expect(g.byId.get("exp1")!.children.map((c) => c.id)).toEqual(["b1", "b2", "gBullet"]);

    const a = resolveVersion(nodes, [], AMAZON);
    expect(a.byId.has("gBullet")).toBe(false);
    const b = resolveVersion(nodes, [], BASE);
    expect(b.byId.has("gBullet")).toBe(false);
  });

  it("ignores overrides belonging to other versions", () => {
    const overrides: NodeOverride[] = [
      { versionId: AMAZON, nodeId: "exp1", patch: { title: "AWS Engineer" }, hidden: null, rank: null },
    ];
    const g = resolveVersion(fixture(), overrides, GOOGLE);
    expect(g.byId.get("exp1")!.data.title).toBe("Engineer");
  });

  it("flattens depth-first and finds section titles", () => {
    const tree = resolveVersion(fixture(), [], BASE);
    expect(flattenTree(tree.roots).map((n) => n.id)).toEqual(["hdr", "secExp", "exp1", "b1", "b2"]);
    expect(sectionTitleOf(tree, "b1")).toBe("Work Experience");
    expect(sectionTitleOf(tree, "hdr")).toBe("Header");
  });
});
