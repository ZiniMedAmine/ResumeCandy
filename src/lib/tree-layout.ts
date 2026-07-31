/**
 * Tidy layout for a node-link tree.
 *
 * The classic bottom-up rule: leaves take the next free slot on the x axis,
 * and every parent centres itself over its children. That is enough for the
 * shape people expect from a tree diagram — siblings evenly spaced, parents
 * centred, no crossing edges — without the bookkeeping a full Reingold–Tilford
 * contour pass needs. Depth alone drives y.
 *
 * Pure geometry over a generic node, so it is unit-testable and knows nothing
 * about resumes or versions.
 */

export interface TreeInput<T> {
  id: string;
  data: T;
  children: TreeInput<T>[];
}

export interface LaidOutNode<T> {
  id: string;
  data: T;
  depth: number;
  /** Centre of the node, in px. */
  x: number;
  y: number;
}

export interface LaidOutEdge {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface TreeLayout<T> {
  nodes: LaidOutNode<T>[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** Horizontal distance between adjacent leaves. */
  columnGap: number;
  /** Vertical distance between depths. */
  rowGap: number;
  /** Padding around the whole drawing. */
  padding: number;
}

export function layoutTree<T>(roots: TreeInput<T>[], options: LayoutOptions): TreeLayout<T> {
  const { columnGap, rowGap, padding } = options;
  const nodes: LaidOutNode<T>[] = [];
  const edges: LaidOutEdge[] = [];
  // Slot counter shared across roots, so a forest lays out side by side
  // instead of every root stacking on the same column.
  let nextSlot = 0;

  const place = (node: TreeInput<T>, depth: number): LaidOutNode<T> => {
    const placedChildren = node.children.map((child) => place(child, depth + 1));

    const x =
      placedChildren.length === 0
        ? nextSlot++ * columnGap
        : (placedChildren[0].x + placedChildren[placedChildren.length - 1].x) / 2;

    const laid: LaidOutNode<T> = { id: node.id, data: node.data, depth, x, y: depth * rowGap };
    nodes.push(laid);

    for (const child of placedChildren) {
      edges.push({
        id: `${node.id}->${child.id}`,
        fromX: laid.x,
        fromY: laid.y,
        toX: child.x,
        toY: child.y,
      });
    }
    return laid;
  };

  for (const root of roots) place(root, 0);

  // Shift everything into the padded box; slots start at 0 but a centred
  // parent can sit on a half slot, so normalise off the real minimum.
  const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) : 0;
  const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x)) : 0;
  const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y)) : 0;
  const dx = padding - minX;

  for (const node of nodes) node.x += dx;
  for (const edge of edges) {
    edge.fromX += dx;
    edge.toX += dx;
  }
  for (const node of nodes) node.y += padding;
  for (const edge of edges) {
    edge.fromY += padding;
    edge.toY += padding;
  }

  return {
    nodes,
    edges,
    width: maxX - minX + padding * 2,
    height: maxY + padding * 2,
  };
}
