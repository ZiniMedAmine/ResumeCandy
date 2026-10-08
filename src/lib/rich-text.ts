/**
 * Inline emphasis inside résumé text: `**term**` prints in bold.
 *
 * That one mark is the whole syntax on purpose. Its job is to let a recruiter
 * skimming the page see the posting's keywords at once ("Built **Kafka**
 * streaming ingestion…"), and anything richer would be one more thing a
 * parser can mangle. The marks never reach the text layer: the preview and
 * the PDF draw the run in the bold face, and the ATS check reads the text
 * with the marks removed.
 *
 * An unmatched `**` is kept literally rather than swallowing the rest of the
 * line, so a half-typed mark in the editor never makes text disappear.
 */

export interface TextRun {
  text: string;
  bold: boolean;
}

const MARK = /\*\*(?=\S)([\s\S]*?\S)\*\*/g;

/** Splits text into plain and bold runs. Adjacent runs never share a weight. */
export function parseRichText(value: string): TextRun[] {
  const runs: TextRun[] = [];
  const push = (text: string, bold: boolean) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.bold === bold) last.text += text;
    else runs.push({ text, bold });
  };
  let index = 0;
  for (const match of value.matchAll(MARK)) {
    push(value.slice(index, match.index), false);
    push(match[1], true);
    index = match.index + match[0].length;
  }
  push(value.slice(index), false);
  return runs;
}

/** The text as a reader (or a parser) sees it — marks removed. */
export function stripRichText(value: string): string {
  return value.replace(MARK, "$1");
}

/** True when the text carries at least one bold run. */
export function hasRichText(value: string): boolean {
  return value.search(MARK) !== -1;
}
