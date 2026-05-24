import { basename } from "node:path";

import type { CodebaseFile, CodebaseScan, ModuleSummary } from "./types.js";

export function renderPlainEnglishReport(scan: CodebaseScan): string {
  const projectName = basename(scan.rootPath);
  const primaryLanguage = getPrimaryLanguage(scan.languages);
  const sections = [
    "# Codebase Clarity Report",
    "",
    `Project: ${projectName}`,
    `Scanned: ${scan.scannedAt}`,
    "",
    "## Summary",
    "",
    buildSummary(scan, primaryLanguage),
    "",
    "## Architecture",
    "",
    ...buildModuleLines(scan.modules),
    "",
    "## Key Files",
    "",
    ...buildFileLines(scan.files),
    "",
    "## How It Fits Together",
    "",
    buildFlowExplanation(scan)
  ];

  return sections.join("\n").trimEnd() + "\n";
}

function buildSummary(scan: CodebaseScan, primaryLanguage: string): string {
  const languageText = formatLanguages(scan.languages);
  const frameworkText = formatFrameworks(scan);
  const moduleCount = scan.modules.length;

  return [
    `This codebase is primarily ${primaryLanguage}.`,
    languageText ? `The scan found ${languageText}.` : "The scan did not find source files with known extensions.",
    frameworkText,
    `The project is organized into ${moduleCount} main ${moduleCount === 1 ? "area" : "areas"}.`
  ]
    .filter(Boolean)
    .join(" ");
}

function formatLanguages(languages: Record<string, number>): string {
  const entries = Object.entries(languages).sort((first, second) => second[1] - first[1]);
  return entries.map(([language, count]) => `${count} ${language} ${count === 1 ? "file" : "files"}`).join(", ");
}

function formatFrameworks(scan: CodebaseScan): string {
  if (scan.frameworks.length === 0) {
    return "No major framework signals were found.";
  }

  return `It appears to use ${joinHumanList(scan.frameworks.map((framework) => framework.name))}.`;
}

function buildModuleLines(modules: ModuleSummary[]): string[] {
  if (modules.length === 0) {
    return ["No module areas were identified from the scanned files."];
  }

  return modules.map((module) => {
    const fileText = `${module.files.length} ${module.files.length === 1 ? "file" : "files"}`;
    const importText = module.imports.length > 0 ? ` It depends on ${joinHumanList(module.imports)}.` : "";
    return `- The \`${module.name}\` area is ${lowerFirst(module.role)}. It contains ${fileText}.${importText}`;
  });
}

function buildFileLines(files: CodebaseFile[]): string[] {
  const notableFiles = files
    .filter((file) => file.imports.length > 0 || file.exports.length > 0 || isNotableFile(file.relativePath))
    .slice(0, 12);

  if (notableFiles.length === 0) {
    return ["No high-signal files were found in the scan window."];
  }

  return notableFiles.map((file) => {
    const parts = [`- \`${file.relativePath}\` is ${file.language}.`];
    if (file.imports.length > 0) {
      parts.push(`${file.relativePath} imports ${file.imports.join(", ")}.`);
    }
    if (file.exports.length > 0) {
      parts.push(`${file.relativePath} exports ${file.exports.join(", ")}.`);
    }
    return parts.join(" ");
  });
}

function buildFlowExplanation(scan: CodebaseScan): string {
  const sourceModules = scan.modules.filter((module) => module.name !== "Project manifest" && module.name !== "Documentation");
  const strongestImports = scan.files
    .filter((file) => file.imports.length > 0)
    .slice(0, 3)
    .map((file) => `${file.relativePath} pulls in ${joinHumanList(file.imports)}`);

  if (sourceModules.length === 0) {
    return "The scan mainly found project metadata. Add or point the CLI at source files to get a fuller architecture explanation.";
  }

  const moduleText = joinHumanList(sourceModules.map((module) => `\`${module.name}\``));
  const dependencyText =
    strongestImports.length > 0
      ? ` Important dependency clues are: ${strongestImports.join("; ")}.`
      : " The scanned files did not expose many import relationships.";

  return `The main working parts live in ${moduleText}. Start with the files that export named functions or import framework packages, because they usually show where data enters the application and how features are wired together.${dependencyText}`;
}

function getPrimaryLanguage(languages: Record<string, number>): string {
  const [primary] = Object.entries(languages).sort((first, second) => second[1] - first[1]);
  return primary?.[0] ?? "unknown file types";
}

function isNotableFile(relativePath: string): boolean {
  return (
    relativePath === "package.json" ||
    relativePath.endsWith("config.ts") ||
    relativePath.endsWith("config.js") ||
    relativePath.endsWith("config.mjs")
  );
}

function joinHumanList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function lowerFirst(value: string): string {
  return value.length === 0 ? value : value[0].toLowerCase() + value.slice(1);
}
