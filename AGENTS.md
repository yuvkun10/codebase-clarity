# AGENTS.md

Codebase Clarity is a TypeScript CLI that scans a local project and writes a plain English architecture report.

## Setup

Node.js 20.19 or newer. npm 11 or newer is recommended.

```bash
npm ci
npm run build
```

No secrets are needed. Optional names in `.env.example`: `CODEBASE_CLARITY_TARGET`, `CODEBASE_CLARITY_OUTPUT`, `CODEBASE_CLARITY_MAX_FILES`, `CODEBASE_CLARITY_MAX_FILE_SIZE_KB`.

## Commands

```bash
npm run lint            # eslint "src/**/*.ts" "tests/**/*.ts"
npm test                # vitest run
npm run build           # tsc -p tsconfig.json (also the type check)
npm run audit:moderate  # npm audit --audit-level=moderate
npm run deps:outdated   # npm outdated
npm run check           # all of the above in one run
```

Run the CLI with `node dist/cli.js [path] --output report.txt`.

## Project structure

- `src/cli.ts`: argument parsing and output.
- `src/scanner.ts`: file walk, ignore list, language and framework signals.
- `src/report.ts`: report rendering.
- `src/types.ts`: shared types. `src/index.ts`: library exports.
- `tests/`: Vitest suites for CLI, scanner and report.

Details are in [docs/architecture.md](docs/architecture.md).

## Conventions

- TypeScript `strict`. ESLint flat config with `@eslint/js` and `typescript-eslint` recommended rules.
- No formatter or commit convention is enforced. Recent history uses `type: summary` subjects. Do not add attribution trailers.
- The scanner's default ignore list (`DEFAULT_IGNORES` in `src/scanner.ts`) skips agent files such as `AGENTS.md` and `CLAUDE.md` in scanned projects, and `tests/scanner.test.ts` asserts it. Keep that behavior unless the task is to change it.

## Testing

Run `npm run check` before a PR. CI runs lint, test, build, the audit and the outdated check.

## Safety

- Never commit `.env` files, secrets or machine specific files. Only `.env.example` is tracked.
- The tool only reads local files. Do not add network calls to the scan path.

## More

- [docs/README.md](docs/README.md): docs index
- [docs/usage.md](docs/usage.md): audience and npm commands
- [docs/security.md](docs/security.md): security and privacy notes
