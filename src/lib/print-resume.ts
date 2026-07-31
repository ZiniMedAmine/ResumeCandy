/**
 * Opens the browser's print dialog for one resume version, with "Save as PDF"
 * as the destination the user picks.
 *
 * The printable view is loaded into a hidden frame so the editor stays put —
 * no new tab, no lost scroll position — and the frame is torn down once the
 * dialog closes.
 */
export function printResumeVersion(resumeId: string, versionId: string): void {
  if (typeof document === "undefined") return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;";
  frame.src = `/print/${resumeId}/${versionId}?auto=1`;

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    window.removeEventListener("message", onMessage);
    clearTimeout(timeout);
    frame.remove();
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if ((event.data as { type?: string })?.type === "resumecandy:printed") cleanup();
  };

  window.addEventListener("message", onMessage);
  // Safety net: the dialog may be dismissed in ways that never message back.
  const timeout = setTimeout(cleanup, 120_000);

  document.body.appendChild(frame);
}
