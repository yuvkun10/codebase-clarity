# Codebase Clarity

Codebase Clarity is a TypeScript CLI that explains a local codebase in plain English. Point it at a project directory and it writes an architecture report covering the main languages, framework signals, module areas, notable files, imports and exports. It helps developers, maintainers and reviewers understand an unfamiliar repo before they edit, review or hand it over. Status: version 0.1.0, run from a local build.

## Installation

Prerequisites:

- Node.js 20.19 or newer
- npm 11 or newer is recommended for the lockfile and audit commands used by this repo

```bash
npm ci
npm run build
```

The CLI needs no secrets or environment variables. `.env.example` holds optional names for shell wrappers or CI: `CODEBASE_CLARITY_TARGET`, `CODEBASE_CLARITY_OUTPUT`, `CODEBASE_CLARITY_MAX_FILES`, `CODEBASE_CLARITY_MAX_FILE_SIZE_KB`. See [docs/configuration.md](docs/configuration.md).

## Usage

Run the built CLI against the current directory:

```bash
node dist/cli.js
```

Run it against another project and write the report to a file:

```bash
node dist/cli.js ../some-project --output architecture-report.txt
```

Limit scan size for large repos:

```bash
node dist/cli.js ./project --max-files 250 --max-file-size-kb 128
```

Show help and version:

```bash
node dist/cli.js --help
node dist/cli.js --version
```

Daily commands are `npm run lint`, `npm test`, `npm run build` and `npm run check`. Each one is described in [docs/usage.md](docs/usage.md). The tool runs locally and has no deployment.

## Project structure

```text
├── .github
│   ├── dependabot.yml
│   └── workflows
│       └── ci.yml
├── docs
│   ├── architecture.md
│   ├── architecture.mmd
│   └── archive
├── src
│   ├── cli.ts
│   ├── index.ts
│   ├── report.ts
│   ├── scanner.ts
│   └── types.ts
├── tests
│   ├── cli.test.ts
│   ├── report.test.ts
│   └── scanner.test.ts
├── .env.example
├── eslint.config.js
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

What each file does is in [docs/architecture.md](docs/architecture.md).

## Coding style

- ESLint flat config (`eslint.config.js`) with `@eslint/js` recommended and `typescript-eslint` recommended rules, applied to `src` and `tests`. Run `npm run lint`.
- TypeScript `strict` mode, checked by `npm run build`.
- No formatter or commit message convention is configured.

## Test

```bash
npm test
```

Vitest runs `tests/cli.test.ts`, `tests/scanner.test.ts` and `tests/report.test.ts`, which cover CLI parsing, scanning behavior and report rendering. `npm run check` runs lint, tests, build, the npm audit and the outdated check in one command. CI runs the same steps.

## Documentation

- [docs/README.md](docs/README.md): index of all docs
- [docs/architecture.md](docs/architecture.md): how the scan works, diagram, file roles
- [docs/usage.md](docs/usage.md): audience and npm commands
- [docs/configuration.md](docs/configuration.md): optional environment names
- [docs/security.md](docs/security.md): security and privacy notes

## License

MIT. See [LICENSE](LICENSE).
