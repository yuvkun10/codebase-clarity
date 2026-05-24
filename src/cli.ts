#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderPlainEnglishReport } from "./report.js";
import { scanCodebase } from "./scanner.js";
import type { ScanOptions } from "./types.js";

const VERSION = "0.1.0";

export interface CliArgs extends ScanOptions {
  targetPath: string;
  outputPath?: string;
  showHelp: boolean;
  showVersion: boolean;
}

export function parseCliArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {
    targetPath: ".",
    showHelp: false,
    showVersion: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      parsed.showHelp = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      parsed.showVersion = true;
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      parsed.outputPath = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--max-files") {
      parsed.maxFiles = parsePositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--max-file-size-kb") {
      parsed.maxFileSizeBytes = parsePositiveInteger(readValue(args, index, arg), arg) * 1024;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (parsed.targetPath !== ".") {
      throw new Error(`Only one target path can be scanned at a time: ${arg}`);
    }

    parsed.targetPath = arg;
  }

  return parsed;
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(args);

  if (parsed.showHelp) {
    process.stdout.write(helpText());
    return;
  }

  if (parsed.showVersion) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const scan = await scanCodebase(resolve(parsed.targetPath), {
    maxFiles: parsed.maxFiles,
    maxFileSizeBytes: parsed.maxFileSizeBytes
  });
  const report = renderPlainEnglishReport(scan);

  if (parsed.outputPath) {
    await mkdir(dirname(resolve(parsed.outputPath)), { recursive: true });
    await writeFile(parsed.outputPath, report, "utf8");
    process.stdout.write(`Report written to ${parsed.outputPath}\n`);
    return;
  }

  process.stdout.write(report);
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer`);
  }
  return parsed;
}

function helpText(): string {
  return [
    "codebase-clarity [options] [path]",
    "",
    "Scan a local codebase and print a plain-English architecture report.",
    "",
    "Options:",
    "  -o, --output <file>       Write the report to a file instead of stdout",
    "      --max-files <count>   Limit the number of files scanned",
    "      --max-file-size-kb <kb>  Skip files larger than this size",
    "  -h, --help                Show help",
    "  -v, --version             Show version",
    ""
  ].join("\n");
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  });
}
