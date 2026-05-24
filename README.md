# Codebase Clarity

Codebase Clarity is a TypeScript command-line tool that scans a local codebase and writes a plain-English architecture report.

It focuses on practical signals that are usually available without executing the target project:

- Safe recursive file walking with common generated folders ignored.
- Language and framework detection from file extensions, config files, imports, and `package.json`.
- Module summaries based on project structure, filenames, imports, and exports.
- Text report output to stdout or a file.

## Usage

Install dependencies and build the CLI:

```bash
npm ci
npm run build
```

Run it against the current directory:

```bash
node dist/cli.js
```

Run it against another codebase and write a report:

```bash
node dist/cli.js ../some-project --output architecture-report.txt
```

Useful options:

```bash
node dist/cli.js --max-files 250 --max-file-size-kb 128 ./project
```

## Development

```bash
npm run lint
npm test
npm run build
```
