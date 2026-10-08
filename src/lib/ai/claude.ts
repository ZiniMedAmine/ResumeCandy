import "server-only";

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { AiError, classifyFailure, parseResult } from "./result";

/**
 * Claude, through the Claude Code CLI installed on this machine.
 *
 * Going through the CLI rather than the HTTP API is what lets ResumeCandy run
 * on a Claude subscription with no API key: the `claude` binary carries its
 * own sign-in. Each call is one headless, single-turn request — no tools, no
 * session saved, no project or user settings loaded — with the reply forced
 * into a JSON Schema, so what comes back is data rather than prose to parse.
 *
 * Configuration (all optional, in `.env.local`):
 *   CLAUDE_CLI_PATH   full path to the `claude` binary, when it is not on the
 *                     server's PATH
 *   CLAUDE_MODEL      a model alias or id; defaults to "sonnet"
 */

interface StructuredRequest {
  /** Replaces Claude Code's own system prompt entirely. */
  system: string;
  /** The user turn, sent on stdin so it can be any length. */
  prompt: string;
  /** JSON Schema the reply must satisfy. */
  schema: Record<string, unknown>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The environment the CLI runs in. A configured binary is found by putting its
 * folder first on PATH rather than spawning the path itself: the build's file
 * tracer reads any non-literal command as a file the server might open, and
 * would otherwise pull the whole project into the trace.
 */
function cliEnv(): NodeJS.ProcessEnv {
  const configured = process.env.CLAUDE_CLI_PATH?.trim();
  if (!configured) return process.env;
  return { ...process.env, PATH: [path.dirname(configured), process.env.PATH].filter(Boolean).join(path.delimiter) };
}

export async function runStructured<T>(request: StructuredRequest): Promise<T> {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    process.env.CLAUDE_MODEL?.trim() || "sonnet",
    "--system-prompt",
    request.system,
    "--json-schema",
    JSON.stringify(request.schema),
    "--tools",
    "",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    // A neutral working directory: run from the project, the CLI would pick
    // up this repository's CLAUDE.md as context for a résumé.
    const child = spawn("claude", args, { cwd: os.tmpdir(), env: cliEnv(), stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new AiError("timeout", "Claude took too long to answer."));
    }, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (out += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (err += chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        error.code === "ENOENT"
          ? new AiError(
              "cli-missing",
              `Claude Code CLI not found (looked for "claude"${process.env.CLAUDE_CLI_PATH ? ` in ${path.dirname(process.env.CLAUDE_CLI_PATH.trim())} and` : " on"} the PATH).`,
            )
          : new AiError("failed", error.message),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // The CLI reports most failures as a JSON result with is_error set, so a
      // non-zero exit with nothing on stdout is the only case handled here.
      if (code !== 0 && !out.trim()) {
        reject(classifyFailure(err.trim() || `Claude Code exited with code ${code}.`));
      } else {
        resolve(out);
      }
    });
    child.stdin.end(request.prompt);
  });

  return parseResult<T>(stdout);
}
