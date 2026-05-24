import { lstat, readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";

import type { CodebaseFile, CodebaseScan, FrameworkSignal, ModuleSummary, ScanOptions } from "./types.js";

const DEFAULT_MAX_FILES = 500;
const DEFAULT_MAX_FILE_SIZE_BYTES = 256 * 1024;

const DEFAULT_IGNORES = new Set([
  ".cache",
  ".codex",
  ".git",
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".svelte-kit",
  ".turbo",
  ".venv",
  "__pycache__",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "Obsidian",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "venv"
]);

const LANGUAGE_BY_EXTENSION = new Map<string, string>([
  [".cjs", "JavaScript"],
  [".css", "CSS"],
  [".go", "Go"],
  [".html", "HTML"],
  [".java", "Java"],
  [".js", "JavaScript"],
  [".jsx", "JavaScript React"],
  [".json", "JSON"],
  [".md", "Markdown"],
  [".mjs", "JavaScript"],
  [".php", "PHP"],
  [".py", "Python"],
  [".rb", "Ruby"],
  [".rs", "Rust"],
  [".scss", "SCSS"],
  [".ts", "TypeScript"],
  [".tsx", "TypeScript React"],
  [".vue", "Vue"],
  [".yaml", "YAML"],
  [".yml", "YAML"]
]);

const IMPORTANT_FILENAMES = new Set([
  "Dockerfile",
  "Makefile",
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock"
]);

const DEPENDENCY_FRAMEWORKS = new Map<string, string>([
  ["@angular/core", "Angular"],
  ["@nestjs/core", "NestJS"],
  ["@playwright/test", "Playwright"],
  ["@remix-run/node", "Remix"],
  ["@sveltejs/kit", "SvelteKit"],
  ["@vitejs/plugin-react", "Vite"],
  ["astro", "Astro"],
  ["cypress", "Cypress"],
  ["drizzle-orm", "Drizzle ORM"],
  ["eslint", "ESLint"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["jest", "Jest"],
  ["koa", "Koa"],
  ["next", "Next.js"],
  ["prisma", "Prisma"],
  ["react", "React"],
  ["svelte", "Svelte"],
  ["tailwindcss", "Tailwind CSS"],
  ["typescript", "TypeScript"],
  ["vite", "Vite"],
  ["vitest", "Vitest"],
  ["vue", "Vue"]
]);

const CONFIG_FRAMEWORKS: Array<[RegExp, string]> = [
  [/^astro\.config\./, "Astro"],
  [/^eslint\.config\./, "ESLint"],
  [/^next\.config\./, "Next.js"],
  [/^playwright\.config\./, "Playwright"],
  [/^svelte\.config\./, "Svelte"],
  [/^tailwind\.config\./, "Tailwind CSS"],
  [/^vite\.config\./, "Vite"],
  [/^vitest\.config\./, "Vitest"],
  [/^prisma\/schema\.prisma$/, "Prisma"]
];

const IMPORT_FRAMEWORKS: Array<[RegExp, string]> = [
  [/^@angular\//, "Angular"],
  [/^@nestjs\//, "NestJS"],
  [/^@sveltejs\//, "SvelteKit"],
  [/^astro$/, "Astro"],
  [/^express$/, "Express"],
  [/^fastify$/, "Fastify"],
  [/^koa$/, "Koa"],
  [/^next(\/|$)/, "Next.js"],
  [/^react(\/|$)/, "React"],
  [/^svelte(\/|$)/, "Svelte"],
  [/^vue(\/|$)/, "Vue"]
];

export async function scanCodebase(rootPath: string, options: ScanOptions = {}): Promise<CodebaseScan> {
  const resolvedRoot = resolve(rootPath);
  const rootStats = await stat(resolvedRoot);

  if (!rootStats.isDirectory()) {
    throw new Error(`Expected a directory to scan, received: ${rootPath}`);
  }

  const ignoreNames = new Set([...DEFAULT_IGNORES, ...(options.ignoreNames ?? [])]);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const files: CodebaseFile[] = [];

  await walkDirectory(resolvedRoot, resolvedRoot, ignoreNames, maxFiles, maxFileSizeBytes, files);

  files.sort((first, second) => first.relativePath.localeCompare(second.relativePath));

  const languages = countLanguages(files);
  const frameworks = await detectFrameworks(files, resolvedRoot);
  const modules = summarizeModules(files);

  return {
    rootPath: resolvedRoot,
    scannedAt: new Date().toISOString(),
    files,
    languages,
    frameworks,
    modules
  };
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  ignoreNames: Set<string>,
  maxFiles: number,
  maxFileSizeBytes: number,
  files: CodebaseFile[]
): Promise<void> {
  if (files.length >= maxFiles) {
    return;
  }

  const entries = await readdir(currentPath, { withFileTypes: true });
  entries.sort((first, second) => first.name.localeCompare(second.name));

  for (const entry of entries) {
    if (files.length >= maxFiles || ignoreNames.has(entry.name)) {
      continue;
    }

    const fullPath = join(currentPath, entry.name);
    const entryStats = await lstat(fullPath);

    if (entryStats.isSymbolicLink()) {
      continue;
    }

    if (entryStats.isDirectory()) {
      await walkDirectory(rootPath, fullPath, ignoreNames, maxFiles, maxFileSizeBytes, files);
      continue;
    }

    if (!entryStats.isFile() || entryStats.size > maxFileSizeBytes) {
      continue;
    }

    const relativePath = normalizePath(relative(rootPath, fullPath));
    if (!isRelevantFile(relativePath)) {
      continue;
    }

    const content = await readFile(fullPath, "utf8");
    files.push({
      relativePath,
      language: detectLanguage(relativePath),
      sizeBytes: entryStats.size,
      imports: extractImports(relativePath, content),
      exports: extractExports(relativePath, content)
    });
  }
}

function normalizePath(pathValue: string): string {
  return pathValue.split(sep).join("/");
}

function isRelevantFile(relativePath: string): boolean {
  const name = basename(relativePath);
  return IMPORTANT_FILENAMES.has(name) || LANGUAGE_BY_EXTENSION.has(extname(name));
}

function detectLanguage(relativePath: string): string {
  const name = basename(relativePath);
  if (IMPORTANT_FILENAMES.has(name) && !extname(name)) {
    return "Project file";
  }

  return LANGUAGE_BY_EXTENSION.get(extname(name)) ?? "Text";
}

function extractImports(relativePath: string, content: string): string[] {
  const extension = extname(relativePath);
  const imports = new Set<string>();
  const lines = statementLines(content);

  if ([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extension)) {
    for (const line of lines) {
      collectLineMatch(line, /^import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/, imports);
      collectLineMatch(line, /^export\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)["']([^"']+)["']/, imports);
      collectLineMatch(
        line,
        /^(?:const|let|var)\s+[\w${}\s,[\]]+\s*=\s*require\(\s*["']([^"']+)["']\s*\)/,
        imports
      );
      collectLineMatch(line, /^require\(\s*["']([^"']+)["']\s*\)/, imports);
      collectLineMatch(
        line,
        /^(?:const|let|var)\s+[\w${}\s,[\]]+\s*=\s*(?:await\s+)?import\(\s*["']([^"']+)["']\s*\)/,
        imports
      );
    }
  }

  if (extension === ".py") {
    for (const line of lines) {
      collectLineMatch(line, /^from\s+([A-Za-z0-9_.]+)\s+import\s+/, imports);
      collectLineMatch(line, /^import\s+([A-Za-z0-9_.]+)/, imports);
    }
  }

  if ([".css", ".scss"].includes(extension)) {
    for (const line of lines) {
      collectLineMatch(line, /^@import\s+["']([^"']+)["']/, imports);
    }
  }

  return [...imports];
}

function extractExports(relativePath: string, content: string): string[] {
  const extension = extname(relativePath);
  const exports = new Set<string>();
  const lines = statementLines(content);

  if ([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extension)) {
    for (const line of lines) {
      collectLineMatch(
        line,
        /^export\s+(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/,
        exports
      );
      collectNamedExportLine(line, exports);
      if (/^export\s+default\b/.test(line)) {
        exports.add("default");
      }
    }
  }

  if (extension === ".py") {
    for (const line of lines) {
      collectLineMatch(line, /^(?:def|class)\s+([A-Za-z_][\w]*)/, exports);
    }
  }

  return [...exports];
}

function collectLineMatch(line: string, expression: RegExp, values: Set<string>): void {
  const match = expression.exec(line);
  if (match?.[1]) {
    values.add(match[1].trim());
  }
}

function collectNamedExportLine(line: string, exports: Set<string>): void {
  const match = /^export\s*\{([^}]+)\}/.exec(line);
  if (!match?.[1]) {
    return;
  }

  const names = match[1]
    .split(",")
    .map((value) => value.trim().split(/\s+as\s+/i)[0]?.trim())
    .filter(Boolean);

  for (const name of names) {
    exports.add(name);
  }
}

function statementLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"));
}

function countLanguages(files: CodebaseFile[]): Record<string, number> {
  const languages: Record<string, number> = {};
  for (const file of files) {
    languages[file.language] = (languages[file.language] ?? 0) + 1;
  }
  return sortRecord(languages);
}

async function detectFrameworks(files: CodebaseFile[], rootPath: string): Promise<FrameworkSignal[]> {
  const frameworkEvidence = new Map<string, Set<string>>();
  const recordFramework = (name: string, evidence: string): void => {
    if (!frameworkEvidence.has(name)) {
      frameworkEvidence.set(name, new Set());
    }
    frameworkEvidence.get(name)?.add(evidence);
  };

  for (const file of files) {
    for (const [pattern, framework] of CONFIG_FRAMEWORKS) {
      if (pattern.test(file.relativePath)) {
        recordFramework(framework, `${file.relativePath} config file`);
      }
    }

    for (const imported of file.imports) {
      for (const [pattern, framework] of IMPORT_FRAMEWORKS) {
        if (pattern.test(imported)) {
          recordFramework(framework, `${file.relativePath} import`);
        }
      }
    }
  }

  const packageFile = files.find((file) => file.relativePath === "package.json");
  if (packageFile) {
    await readPackageDependencies(join(rootPath, packageFile.relativePath), recordFramework);
  }

  return [...frameworkEvidence.entries()]
    .map(([name, evidence]): FrameworkSignal => ({
      name,
      evidence: [...evidence].sort((first, second) => first.localeCompare(second))
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

async function readPackageDependencies(
  packagePath: string,
  recordFramework: (name: string, evidence: string) => void
): Promise<void> {
  try {
    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as Record<string, unknown>;
    const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

    for (const section of sections) {
      const dependencies = packageJson[section];
      if (!dependencies || typeof dependencies !== "object") {
        continue;
      }

      for (const dependencyName of Object.keys(dependencies)) {
        const framework = DEPENDENCY_FRAMEWORKS.get(dependencyName);
        if (framework) {
          recordFramework(framework, `package.json ${section} dependency`);
        }
      }
    }
  } catch {
    return;
  }
}

function summarizeModules(files: CodebaseFile[]): ModuleSummary[] {
  const groups = new Map<string, CodebaseFile[]>();

  for (const file of files) {
    const groupName = moduleNameFor(file.relativePath);
    const groupFiles = groups.get(groupName) ?? [];
    groupFiles.push(file);
    groups.set(groupName, groupFiles);
  }

  return [...groups.entries()]
    .map(([name, groupFiles]) => ({
      name,
      role: moduleRoleFor(name),
      files: groupFiles.map((file) => file.relativePath).sort((first, second) => first.localeCompare(second)),
      imports: uniqueSorted(groupFiles.flatMap((file) => file.imports))
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function moduleNameFor(relativePath: string): string {
  if (relativePath === "package.json") {
    return "Project manifest";
  }

  if (/^(?:tsconfig|vite|vitest|eslint|tailwind|next|astro|svelte|playwright)\.config/.test(relativePath)) {
    return "Project configuration";
  }

  if (relativePath === "README.md" || relativePath.startsWith("docs/")) {
    return "Documentation";
  }

  if (!relativePath.includes("/")) {
    return "Root files";
  }

  return relativePath.split("/")[0] ?? "Root files";
}

function moduleRoleFor(name: string): string {
  const normalized = name.toLowerCase();
  const roles: Record<string, string> = {
    ".github": "Automation and CI",
    api: "API and server code",
    app: "Application routes and screens",
    assets: "Static assets",
    components: "User interface components",
    config: "Project configuration",
    database: "Database layer",
    db: "Database layer",
    docs: "Documentation",
    lib: "Shared utilities",
    migrations: "Database migrations",
    pages: "Application routes and screens",
    prisma: "Database layer",
    public: "Static assets",
    routes: "Application routes and screens",
    scripts: "Developer scripts",
    server: "API and server code",
    src: "Application source code",
    test: "Automated tests",
    tests: "Automated tests",
    types: "Shared type definitions",
    utils: "Shared utilities"
  };

  if (name === "Project manifest") {
    return "Dependency and package metadata";
  }

  if (name === "Project configuration") {
    return "Tooling and runtime configuration";
  }

  if (name === "Documentation") {
    return "Documentation";
  }

  if (name === "Root files") {
    return "Top-level project files";
  }

  return roles[normalized] ?? "Supporting project files";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((first, second) => first.localeCompare(second));
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([first], [second]) => first.localeCompare(second)));
}
