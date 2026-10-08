/**
 * The pure half of the Claude bridge: error codes and reading the CLI's JSON
 * envelope. Kept apart from the process spawning so it can be unit tested.
 */

export type AiErrorCode = "cli-missing" | "not-signed-in" | "timeout" | "failed" | "bad-output";

export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function classifyFailure(message: string): AiError {
  return /log ?in|sign ?in|auth|oauth|credential|api key/i.test(message)
    ? new AiError("not-signed-in", message)
    : new AiError("failed", message);
}

/**
 * Reads the CLI's JSON envelope. The schema-checked reply arrives as
 * `structured_output`; older CLI builds put it in `result` as text, which is
 * accepted too (fences stripped) rather than failing on a version difference.
 */
export function parseResult<T>(stdout: string): T {
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(stdout.trim().split("\n").filter(Boolean).pop() ?? "");
  } catch {
    throw new AiError("bad-output", "Claude Code returned something that is not JSON.");
  }
  if (envelope.is_error) {
    throw classifyFailure(typeof envelope.result === "string" ? envelope.result : "Claude Code reported an error.");
  }
  if (envelope.structured_output && typeof envelope.structured_output === "object") {
    return envelope.structured_output as T;
  }
  if (typeof envelope.result === "string") {
    const raw = envelope.result.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      return JSON.parse(raw) as T;
    } catch {
      // fall through
    }
  }
  throw new AiError("bad-output", "Claude's reply did not contain the expected data.");
}
