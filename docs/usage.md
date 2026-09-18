# Usage

## Who it helps

It is meant to help people understand an unfamiliar repo before they edit it, review it, document it or hand it to another maintainer.

- Developers joining a project who need a quick map of the code.
- Maintainers preparing a handoff, audit or cleanup plan.
- Reviewers who want a neutral summary before reading a large diff.
- Technical leads comparing project structure across multiple repos.
- Non-specialist stakeholders who need a plain-English explanation of what a codebase contains.

CLI examples are in the [README](../README.md#usage).

## Commands

```bash
npm run lint
npm test
npm run build
npm run audit:moderate
npm run deps:outdated
npm run check
```

- `npm run lint` checks TypeScript source and tests with ESLint.
- `npm test` runs the Vitest test suite.
- `npm run build` compiles `src` into `dist` and writes type declarations.
- `npm run audit:moderate` fails on npm advisories of moderate severity or higher.
- `npm run deps:outdated` fails when npm reports outdated dependencies.
- `npm run check` runs lint, tests, build, audit and outdated checks in one command.
