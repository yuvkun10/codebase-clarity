import { describe, expect, test } from "vitest";

import { parseCliArgs } from "../src/cli.js";

describe("parseCliArgs", () => {
  test("uses the current directory when no path is provided", () => {
    expect(parseCliArgs([])).toMatchObject({
      targetPath: ".",
      showHelp: false,
      showVersion: false
    });
  });

  test("parses output and scan limit options", () => {
    expect(parseCliArgs(["--output", "report.txt", "--max-files", "25", "--max-file-size-kb", "64", "sample"])).toEqual({
      targetPath: "sample",
      outputPath: "report.txt",
      maxFiles: 25,
      maxFileSizeBytes: 65536,
      showHelp: false,
      showVersion: false
    });
  });

  test("rejects unknown options", () => {
    expect(() => parseCliArgs(["--mystery"])).toThrow(/unknown option/i);
  });
});
