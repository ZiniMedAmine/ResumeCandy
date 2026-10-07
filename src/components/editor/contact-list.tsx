"use client";

import { useEffect, useRef, useState } from "react";
import { ContactIcon } from "@/components/ui/contact-icons";
import { GripIcon, LinkIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import {
  CONTACT_TYPES,
  contactHref,
  contactType,
  detectContactType,
  urlHref,
  type ContactGroup,
  type ContactType,
} from "@/lib/contacts";
import { useT } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n";
import type { ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { HiddenGhost, LocalBadge, NodeControls } from "./node-controls";
import { ProvenanceField } from "./provenance-field";
import { dragClasses, useDragReorder } from "./use-drag-reorder";

const GROUPS: ContactGroup[] = ["network", "web", "detail"];

/** What the picker calls a type: the brand, or the interface-language noun. */
function typeName(id: ContactType, t: Dictionary): string {
  const def = contactType(id);
  return def.brand ?? t.contacts.type[id as keyof Dictionary["contacts"]["type"]] ?? id;
}

/**
 * Every contact type, grouped. Used both to add a row and to change one, so
 * the two lists can never drift apart.
 */
function TypeMenuItems({ onPick, t }: { onPick: (id: ContactType) => void; t: Dictionary }) {
  return (
    <div className="max-h-80 w-[22rem] overflow-y-auto">
      {GROUPS.map((group) => (
        <div key={group}>
          <MenuLabel>{t.contacts.group[group]}</MenuLabel>
          <div className="grid grid-cols-2">
            {CONTACT_TYPES.filter((c) => c.group === group).map((c) => (
              <MenuItem key={c.id} icon={<ContactIcon type={c.id} />} onSelect={() => onPick(c.id)}>
                <span className="truncate">{typeName(c.id, t)}</span>
              </MenuItem>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactRow({
  node,
  drag,
  index,
  count,
}: {
  node: ResolvedNode;
  drag: ReturnType<typeof useDragReorder>;
  index: number;
  count: number;
}) {
  const editField = useResumeStore((s) => s.editField);
  const t = useT();
  const type = contactType(node.data.type);
  const value = typeof node.data.value === "string" ? node.data.value : "";
  const href = contactHref(type.id, value);

  // A pasted LinkedIn URL in a generic "Other link" row becomes a LinkedIn
  // row — the icon and printed name follow without a second step.
  useEffect(() => {
    if (type.id !== "link") return;
    const detected = detectContactType(value);
    if (detected) editField(node.id, "type", detected, { silent: true });
  }, [type.id, value, node.id, editField]);

  const custom = type.id === "link" || type.id === "info";

  return (
    <div
      {...drag.itemProps(node.id, index)}
      className={`group/contact flex items-start gap-1.5 rounded-xl ${dragClasses(
        drag.draggingId === node.id,
        drag.dropEdge(index, count),
      )}`}
    >
      <span
        {...drag.handleProps(node.id)}
        className="mt-2.5 flex size-5 shrink-0 cursor-grab items-center justify-center text-ink-faint/30 transition-colors duration-150 select-none group-hover/contact:text-ink-faint active:cursor-grabbing"
        title={t.fields.dragToReorder}
      >
        <GripIcon className="size-3.5" />
      </span>

      <Menu
        align="start"
        trigger={
          <button
            type="button"
            title={`${typeName(type.id, t)} — ${t.contacts.changeType}`}
            aria-label={t.contacts.changeType}
            className={`pressable mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border bg-surface text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink ${
              node.customizedFields.includes("type")
                ? "border-amber-200/90 dark:border-amber-500/30"
                : "border-hairline"
            }`}
          >
            <ContactIcon type={type.id} className="size-4" />
          </button>
        }
      >
        <TypeMenuItems t={t} onPick={(id) => editField(node.id, "type", id)} />
      </Menu>

      <div className={`grid min-w-0 flex-1 gap-2 ${custom ? "grid-cols-[2fr_3fr]" : "grid-cols-1"}`}>
        {custom && (
          <ProvenanceField
            node={node}
            field="label"
            placeholder={type.id === "info" ? t.contacts.infoLabelPlaceholder : t.contacts.labelPlaceholder}
          />
        )}
        <ProvenanceField node={node} field="value" placeholder={type.placeholder} />
      </div>

      <div className="mt-1 flex items-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/contact:opacity-100">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={t.contacts.open}
            className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          >
            <LinkIcon className="size-3.5" />
          </a>
        )}
        {node.status === "local" && <LocalBadge />}
        <NodeControls node={node} compact />
      </div>
    </div>
  );
}

/**
 * The header's links and personal details: one row per contact node, drag to
 * reorder, hide per version, add from a grouped picker — or paste any profile
 * URL and let the type be recognised.
 */
export function ContactList({ header }: { header: ResolvedNode }) {
  const addNode = useResumeStore((s) => s.addNode);
  const moveNodeTo = useResumeStore((s) => s.moveNodeTo);
  const t = useT();
  const [paste, setPaste] = useState("");

  const contacts = header.children.filter((c) => c.kind === "contact");
  const firstIndex = Math.max(0, header.children.findIndex((c) => c.kind === "contact"));
  const drag = useDragReorder((id, to) => moveNodeTo(id, to + firstIndex), { requireHandle: true });

  const add = (type: ContactType, value = "") => addNode(header.id, "contact", { type, value, label: "" });

  const commitPaste = () => {
    const value = paste.trim();
    if (!value) return;
    add(detectContactType(value) ?? "link", value);
    setPaste("");
  };

  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
        {t.content.linksTitle}
      </p>
      <p className="mb-3 text-[11.5px] leading-relaxed text-ink-faint">{t.content.linksHint}</p>

      <div className="space-y-2">
        {contacts.map((c, i) =>
          c.hidden ? (
            <HiddenGhost key={c.id} node={c} />
          ) : (
            <ContactRow key={c.id} node={c} drag={drag} index={i} count={contacts.length} />
          ),
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Menu
          align="start"
          trigger={
            <button
              type="button"
              className="pressable flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-rose-500"
            >
              <PlusIcon className="size-3.5" />
              {t.content.addLink}
            </button>
          }
        >
          <TypeMenuItems t={t} onPick={(id) => add(id)} />
        </Menu>
        <input
          value={paste}
          dir="ltr"
          onChange={(e) => setPaste(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitPaste();
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").trim();
            // Only a URL is added on paste; anything else waits for Enter.
            if (!text || /\s/.test(text) || !urlHref(text)) return;
            e.preventDefault();
            add(detectContactType(text) ?? "link", text);
          }}
          placeholder={t.contacts.pastePlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-dashed border-hairline-strong bg-transparent px-3 py-1.5 text-[12.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint/70 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
        />
      </div>
    </div>
  );
}

/* ---------------------------------- photo ---------------------------------- */

/** Edge length the photo is stored at — sharp at print size, tiny as a data URL. */
const PHOTO_PX = 320;

/**
 * Center-crops and downsizes an image to a square JPEG data URL. Doing it in
 * the browser keeps the stored value around 30 KB however large the original
 * was, so it travels in the node's JSON like any other field.
 */
async function toSquareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_PX;
  canvas.height = PHOTO_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PHOTO_PX, PHOTO_PX);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_PX,
    PHOTO_PX,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function PhotoField({ header }: { header: ResolvedNode }) {
  const editField = useResumeStore((s) => s.editField);
  const toast = useResumeStore((s) => s.toast);
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const photo = typeof header.data.photo === "string" ? header.data.photo : "";
  const customized = header.status !== "local" && header.customizedFields.includes("photo");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      editField(header.id, "photo", await toSquareJpeg(file));
    } catch (error) {
      console.error(error);
      toast({ message: "photoFailed", kind: "error" });
    }
  };

  return (
    <div className="flex items-center gap-3.5">
      <div
        className={`size-14 shrink-0 overflow-hidden rounded-full border bg-sunken ${
          customized ? "border-amber-300" : "border-hairline"
        }`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-faint">
            <UploadIcon className="size-4" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="pressable rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-hairline-strong"
          >
            {photo ? t.content.changePhoto : t.content.uploadPhoto}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => editField(header.id, "photo", "")}
              title={t.content.removePhoto}
              aria-label={t.content.removePhoto}
              className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-red-500"
            >
              <TrashIcon className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-ink-faint">{t.content.photoHint}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
