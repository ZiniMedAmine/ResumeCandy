"use client";

import { Dialog } from "@/components/ui/dialog";
import { sectionIcon } from "@/components/ui/section-icons";
import { enterDelay } from "@/lib/motion";
import { SECTION_PRESETS, type SectionPreset } from "@/lib/sections";

/**
 * The section picker.
 *
 * A grid rather than a dropdown because the choice is browsed, not recalled:
 * fourteen section types with a line of explanation each is a lot to read down
 * a menu, and the descriptions are what tell someone whether "Courses" or
 * "Certificates" is the one they want.
 */
export function AddContentDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (preset: SectionPreset) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Add content" width="max-w-4xl">
      <div className="grid max-h-[68vh] grid-cols-1 gap-2.5 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SECTION_PRESETS.map((preset, i) => {
          const Icon = sectionIcon(preset.type);
          const custom = preset.type === "custom";
          return (
            <button
              key={preset.type}
              type="button"
              onClick={() => {
                onPick(preset);
                onClose();
              }}
              style={enterDelay(i, 18, 200)}
              className={`anim-rise group rounded-xl p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card ${
                custom
                  ? "border border-dashed border-hairline-strong hover:border-rose-300"
                  : "bg-sunken hover:bg-surface"
              }`}
            >
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <Icon className="size-4 shrink-0 text-ink-faint transition-colors duration-150 group-hover:text-rose-500" />
                <span className="min-w-0 truncate">{preset.title}</span>
              </span>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-muted">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
