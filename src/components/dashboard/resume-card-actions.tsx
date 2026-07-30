"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteResume, renameResume } from "@/app/actions/resumes";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DotsIcon, DownloadIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { printResumeVersion } from "@/lib/print-resume";

export function ResumeCardActions({
  resumeId,
  name,
  baseVersionId,
}: {
  resumeId: string;
  name: string;
  /** Downloads apply to the Default version from the dashboard. */
  baseVersionId?: string | null;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [value, setValue] = useState(name);

  return (
    <>
      <Menu
        align="end"
        trigger={
          <button
            type="button"
            className="pressable rounded-lg p-1.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-sunken hover:text-ink group-hover:opacity-100"
            aria-label={`Options for ${name}`}
          >
            <DotsIcon className="size-4" />
          </button>
        }
      >
        <MenuItem
          icon={<PencilIcon />}
          onSelect={() => {
            setValue(name);
            setRenaming(true);
          }}
        >
          Rename
        </MenuItem>
        {baseVersionId && (
          <MenuItem
            icon={<DownloadIcon />}
            onSelect={() => printResumeVersion(resumeId, baseVersionId)}
          >
            Download PDF
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem danger icon={<TrashIcon />} onSelect={() => setConfirming(true)}>
          Delete resume
        </MenuItem>
      </Menu>

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename resume" width="max-w-sm">
        <form
          className="space-y-3 px-5 py-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await renameResume({ resumeId, name: value });
            setRenaming(false);
            router.refresh();
          }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-hairline px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="pressable rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pressable rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:brightness-[1.03]"
            >
              Save
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete “${name}”?`}
        body="The resume with all of its versions and content will be permanently deleted. This cannot be undone."
        confirmLabel="Delete resume"
        danger
        onConfirm={async () => {
          await deleteResume({ resumeId });
          router.refresh();
        }}
      />
    </>
  );
}
