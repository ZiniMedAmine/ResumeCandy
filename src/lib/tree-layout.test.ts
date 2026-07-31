import { describe, expect, it } from "vitest";
import { layoutTree, type TreeInput } from "./tree-layout";

const OPTS = { columnGap: 100, rowGap: 80, padding: 10 };

function node(id: string, children: TreeInput<null>[] = []): TreeInput<null> {
  return { id, data: null, children };
}

const at = (layout: ReturnType<typeof layoutTree<null>>, id: string) =>
  layout.nodes.find((n) => n.id === id)!;

describe("layoutTree", () => {
  it("puts a lone node at the padding origin", () => {
    const layout = layoutTree([node("a")], OPTS);
    expect(at(layout, "a")).toMatchObject({ x: 10, y: 10, depth: 0 });
  });

  it("spaces siblings one column apart and centres the parent over them", () => {
    const layout = layoutTree([node("root", [node("l"), node("r")])], OPTS);
    expect(at(layout, "l").x).toBe(10);
    expect(at(layout, "r").x).toBe(110);
    // Dead centre between the two children, not on either of them.
    expect(at(layout, "root").x).toBe(60);
    expect(at(layout, "root").y).toBe(10);
    expect(at(layout, "l").y).toBe(90);
  });

  it("centres over the outermost children when the subtree is lopsided", () => {
    const layout = layoutTree(
      [node("root", [node("a", [node("a1"), node("a2")]), node("b")])],
      OPTS,
    );
    // Leaves take slots 0, 1, 2; "a" centres on its two, root spans a..b.
    expect(at(layout, "a1").x).toBe(10);
    expect(at(layout, "a2").x).toBe(110);
    expect(at(layout, "b").x).toBe(210);
    expect(at(layout, "a").x).toBe(60);
    expect(at(layout, "root").x).toBe(135);
  });

  it("gives every parent-child pair an edge with matching endpoints", () => {
    const layout = layoutTree([node("root", [node("kid")])], OPTS);
    expect(layout.edges).toHaveLength(1);
    const [edge] = layout.edges;
    expect(edge).toMatchObject({
      fromX: at(layout, "root").x,
      fromY: at(layout, "root").y,
      toX: at(layout, "kid").x,
      toY: at(layout, "kid").y,
    });
  });

  it("lays a forest out side by side rather than stacking roots", () => {
    const layout = layoutTree([node("one"), node("two")], OPTS);
    expect(at(layout, "one").x).toBe(10);
    expect(at(layout, "two").x).toBe(110);
    expect(at(layout, "one").y).toBe(at(layout, "two").y);
  });

  it("sizes the box to the drawing plus padding on both sides", () => {
    const layout = layoutTree([node("root", [node("l"), node("r")])], OPTS);
    expect(layout.width).toBe(120); // 100 of span + 10 padding each side
    expect(layout.height).toBe(100); // one 80px row + 10 padding each side
  });

  it("handles an empty forest without dividing by nothing", () => {
    const layout = layoutTree<null>([], OPTS);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.width).toBe(20);
  });
});
