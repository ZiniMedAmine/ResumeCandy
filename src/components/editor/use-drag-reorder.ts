"use client";

import { useCallback, useState, type DragEvent, type PointerEvent } from "react";

/** Where the drop line sits relative to an item, if it sits there at all. */
export type DropEdge = "top" | "bottom" | null;

export interface DragReorder {
  /** Id of the item currently being dragged, or null. */
  draggingId: string | null;
  /** Props for the element that should physically move. */
  itemProps(id: string, index: number): {
    draggable: boolean;
    onDragStart(e: DragEvent<HTMLElement>): void;
    onDragOver(e: DragEvent<HTMLElement>): void;
    onDrop(e: DragEvent<HTMLElement>): void;
    onDragEnd(): void;
  };
  /**
   * Props for a grip that arms the drag. Only needed with `requireHandle`,
   * where the item is inert until the pointer goes down on the grip — so
   * text and inputs inside it stay usable.
   */
  handleProps(id: string): {
    onPointerDown(e: PointerEvent<HTMLElement>): void;
    onPointerUp(): void;
  };
  /** Which edge of this item should show the drop line. */
  dropEdge(index: number, count: number): DropEdge;
}

/**
 * Drag-to-reorder for a flat list, on the browser's own drag events.
 *
 * `onReorder` is given the index the item should end up at, counted in the
 * list with that item already removed — the same convention the store's
 * `moveNodeTo` uses, so no index juggling happens at the call site.
 *
 * Each list owns its own instance, which is also what keeps a drag from
 * crossing between lists: a foreign item never arms this hook, so its
 * `dragover` is left un-prevented and the browser refuses the drop.
 */
export function useDragReorder(
  onReorder: (id: string, toIndex: number) => void,
  options?: { requireHandle?: boolean },
): DragReorder {
  const requireHandle = options?.requireHandle ?? false;
  const [armedId, setArmedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; from: number } | null>(null);
  // Insertion slot, in the list *including* the dragged item.
  const [slot, setSlot] = useState<number | null>(null);

  const reset = useCallback(() => {
    setDrag(null);
    setSlot(null);
    setArmedId(null);
  }, []);

  const itemProps = useCallback(
    (id: string, index: number) => ({
      draggable: requireHandle ? armedId === id : true,
      onDragStart(e: DragEvent<HTMLElement>) {
        e.dataTransfer.effectAllowed = "move";
        // Firefox only starts a drag when some data is attached.
        e.dataTransfer.setData("text/plain", id);
        setDrag({ id, from: index });
      },
      onDragOver(e: DragEvent<HTMLElement>) {
        if (!drag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const below = e.clientY > rect.top + rect.height / 2;
        setSlot(index + (below ? 1 : 0));
      },
      onDrop(e: DragEvent<HTMLElement>) {
        e.preventDefault();
        if (drag && slot != null) {
          // Removing the item first shifts every slot after it down by one.
          const to = slot > drag.from ? slot - 1 : slot;
          if (to !== drag.from) onReorder(drag.id, to);
        }
        reset();
      },
      onDragEnd: reset,
    }),
    [armedId, drag, onReorder, requireHandle, reset, slot],
  );

  const handleProps = useCallback(
    (id: string) => ({
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        setArmedId(id);
      },
      onPointerUp() {
        setArmedId(null);
      },
    }),
    [],
  );

  const dropEdge = useCallback(
    (index: number, count: number): DropEdge => {
      if (!drag || slot == null) return null;
      // A drop either side of the item's own position changes nothing.
      if (slot === drag.from || slot === drag.from + 1) return null;
      if (slot === index) return "top";
      if (slot === count && index === count - 1) return "bottom";
      return null;
    },
    [drag, slot],
  );

  return { draggingId: drag?.id ?? null, itemProps, handleProps, dropEdge };
}

/**
 * Shared look for a row while it is being dragged or hovered over. The drop
 * line is a pseudo-element rather than a border or inset shadow: it neither
 * shifts the layout by 2px nor fights the card's own `shadow-card`.
 */
export function dragClasses(dragging: boolean, edge: DropEdge) {
  return [
    dragging ? "opacity-40" : "",
    edge ? "relative" : "",
    edge === "top"
      ? "before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:rounded-full before:bg-rose-500 before:content-['']"
      : "",
    edge === "bottom"
      ? "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-rose-500 after:content-['']"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
