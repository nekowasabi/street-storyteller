#!/usr/bin/env -S deno run --allow-read --allow-run --allow-write

import { parseArgs } from "@std/cli/parse-args";
import { join, toFileUrl } from "@std/path";

export function stripAnsi(text: string): string {
  // deno-lint-ignore no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export function parseCoveragePercent(output: string): number {
  const clean = stripAnsi(output);
  const lines = clean.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(
      /\|\s*All files\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*\|/,
    );
    if (match) {
      return Number(match[2]);
    }
  }
  throw new Error(
    "Unable to parse coverage percentage from deno coverage output",
  );
}

export function meetsThreshold(
  coveragePercent: number,
  thresholdPercent: number,
): boolean {
  return coveragePercent >= thresholdPercent;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function defaultIncludePatternForCwd(): string {
  const srcUrl = toFileUrl(join(Deno.cwd(), "src")).href;
  const prefix = srcUrl.endsWith("/") ? srcUrl : `${srcUrl}/`;
  return `^${escapeRegExp(prefix)}`;
}

export interface CoverageThresholdArgs {
  threshold: number;
  profile: string;
  include: string;
  exclude: string;
  html?: string;
  input?: string;
  dryRun?: boolean;
}

export function parseCoverageThresholdArgs(
  args: string[],
): CoverageThresholdArgs {
  const parsed = parseArgs(args, {
    string: ["threshold", "profile", "include", "exclude", "html", "input"],
    boolean: ["dry-run"],
    default: {
      threshold: "80",
      profile: "coverage/profile",
      exclude: "test_output/|/sample/",
      "dry-run": false,
    },
    alias: {
      t: "threshold",
    },
  }) as Record<string, unknown>;

  const threshold = Number(parsed.threshold);
  if (!Number.isFinite(threshold)) {
    throw new Error(`Invalid --threshold: ${String(parsed.threshold)}`);
  }

  return {
    threshold,
    profile: String(parsed.profile),
    include: parsed.include
      ? String(parsed.include)
      : defaultIncludePatternForCwd(),
    exclude: String(parsed.exclude),
    html: parsed.html ? String(parsed.html) : undefined,
    input: parsed.input ? String(parsed.input) : undefined,
    dryRun: Boolean(parsed["dry-run"]),
  };
}

async function runDenoCoverageText(
  args: CoverageThresholdArgs,
): Promise<string> {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "coverage",
      `--include=${args.include}`,
      `--exclude=${args.exclude}`,
      args.profile,
    ],
    stdout: "piped",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) {
    throw new Error("deno coverage failed");
  }
  return new TextDecoder().decode(result.stdout);
}

async function writeHtmlReport(args: CoverageThresholdArgs): Promise<void> {
  if (!args.html) return;

  await Deno.mkdir(args.html, { recursive: true });
  const lcovOutputPath = join(args.html, "coverage.lcov");
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "coverage",
      "--lcov",
      `--output=${lcovOutputPath}`,
      `--include=${args.include}`,
      `--exclude=${args.exclude}`,
      args.profile,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) {
    throw new Error("deno coverage --lcov failed");
  }
}

export async function runCoverageThreshold(
  args: CoverageThresholdArgs,
): Promise<{
  coveragePercent: number;
  threshold: number;
  ok: boolean;
}> {
  let output: string;
  if (args.input) {
    output = await Deno.readTextFile(args.input);
  } else if (args.dryRun) {
    throw new Error("--dry-run requires --input");
  } else {
    output = await runDenoCoverageText(args);
  }

  const coveragePercent = parseCoveragePercent(output);
  const ok = meetsThreshold(coveragePercent, args.threshold);

  if (!args.dryRun) {
    await writeHtmlReport(args);
  }

  return { coveragePercent, threshold: args.threshold, ok };
}

if (import.meta.main) {
  const args = parseCoverageThresholdArgs(Deno.args);
  const result = await runCoverageThreshold(args);
  const message = `Coverage ${result.coveragePercent.toFixed(1)}% (threshold ${
    result.threshold.toFixed(1)
  }%)`;
  if (!result.ok) {
    console.error(message);
    Deno.exit(1);
  }
  console.log(message);
}
