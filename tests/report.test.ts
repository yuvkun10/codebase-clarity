import { describe, expect, test } from "vitest";

import { renderPlainEnglishReport } from "../src/report.js";
import type { CodebaseScan } from "../src/types.js";

describe("renderPlainEnglishReport", () => {
  test("turns scan data into a readable architecture explanation", () => {
    const scan: CodebaseScan = {
      rootPath: "/work/sample-app",
      scannedAt: "2026-05-24T00:00:00.000Z",
      files: [
        {
          relativePath: "package.json",
          language: "JSON",
          sizeBytes: 120,
          imports: [],
          exports: []
        },
        {
          relativePath: "src/server.ts",
          language: "TypeScript",
          sizeBytes: 220,
          imports: ["express", "./routes"],
          exports: ["createServer"]
        },
        {
          relativePath: "src/routes.ts",
          language: "TypeScript",
          sizeBytes: 180,
          imports: ["./db"],
          exports: ["registerRoutes"]
        }
      ],
      languages: {
        JSON: 1,
        TypeScript: 2
      },
      frameworks: [
        {
          name: "Express",
          evidence: ["package.json dependency"]
        }
      ],
      modules: [
        {
          name: "src",
          role: "Application source code",
          files: ["src/routes.ts", "src/server.ts"],
          imports: ["./db", "./routes", "express"]
        },
        {
          name: "Project manifest",
          role: "Dependency and package metadata",
          files: ["package.json"],
          imports: []
        }
      ]
    };

    const report = renderPlainEnglishReport(scan);

    expect(report).toContain("# Codebase Clarity Report");
    expect(report).toContain("sample-app");
    expect(report).toContain("This codebase is primarily TypeScript");
    expect(report).toContain("It appears to use Express");
    expect(report).toContain("The `src` area is application source code");
    expect(report).toContain("src/server.ts imports express, ./routes");
    expect(report).toContain("src/routes.ts exports registerRoutes");
  });
});
