import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";

import { scanCodebase } from "../src/scanner.js";

async function makeFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "codebase-clarity-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "node_modules", "left-pad"), { recursive: true });
  await mkdir(join(root, "dist"), { recursive: true });
  await mkdir(join(root, ".git"), { recursive: true });

  await writeFile(join(root, "AGENTS.md"), "Local-only agent notes.\n");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify(
      {
        dependencies: {
          "@vitejs/plugin-react": "latest",
          react: "latest",
          vite: "latest"
        },
        devDependencies: {
          vitest: "latest"
        }
      },
      null,
      2
    )
  );
  await writeFile(
    join(root, "src", "app.ts"),
    [
      "import React from 'react';",
      "import { parseInvoice } from './parser';",
      "",
      "export function startApp() {",
      "  return parseInvoice('demo');",
      "}"
    ].join("\n")
  );
  await writeFile(
    join(root, "src", "parser.ts"),
    "export function parseInvoice(input: string) { return input.trim(); }\n"
  );
  await writeFile(
    join(root, "src", "app.test.ts"),
    "import { startApp } from './app';\ntest('starts', () => startApp());\n"
  );
  await writeFile(join(root, "node_modules", "left-pad", "index.js"), "module.exports = '';\n");
  await writeFile(join(root, "dist", "bundle.js"), "console.log('generated');\n");
  await writeFile(join(root, ".git", "config"), "[core]\n");

  return root;
}

describe("scanCodebase", () => {
  test("walks useful source files while ignoring generated folders", async () => {
    const root = await makeFixture();

    const scan = await scanCodebase(root);

    expect(scan.files.map((file) => file.relativePath).sort()).toEqual([
      "package.json",
      "src/app.test.ts",
      "src/app.ts",
      "src/parser.ts"
    ]);
    expect(scan.languages).toMatchObject({
      JSON: 1,
      TypeScript: 3
    });
    expect(scan.frameworks.map((framework) => framework.name).sort()).toEqual([
      "React",
      "Vite",
      "Vitest"
    ]);
    expect(scan.files.find((file) => file.relativePath === "src/app.ts")?.imports).toEqual([
      "react",
      "./parser"
    ]);
  });

  test("groups files into plain-English module summaries", async () => {
    const root = await makeFixture();

    const scan = await scanCodebase(root);

    expect(scan.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "src",
          role: "Application source code",
          files: ["src/app.test.ts", "src/app.ts", "src/parser.ts"]
        }),
        expect.objectContaining({
          name: "Project manifest",
          role: "Dependency and package metadata",
          files: ["package.json"]
        })
      ])
    );
  });

  test("rejects paths that are not directories", async () => {
    const root = await makeFixture();
    const packageFile = join(root, "package.json");

    await expect(scanCodebase(packageFile)).rejects.toThrow(/directory/i);
  });

  test("does not treat code snippets inside strings as real imports or exports", async () => {
    const root = await mkdtemp(join(tmpdir(), "codebase-clarity-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "src", "notes.ts"),
      [
        "const example = \"import React from 'react'; export function fakeExport() {}\";",
        "",
        "export function realExport() {",
        "  return example;",
        "}"
      ].join("\n")
    );

    const scan = await scanCodebase(root);
    const notes = scan.files.find((file) => file.relativePath === "src/notes.ts");

    expect(notes?.imports).toEqual([]);
    expect(notes?.exports).toEqual(["realExport"]);
  });
});
