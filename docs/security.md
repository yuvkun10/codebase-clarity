# Security and privacy

- Codebase Clarity scans local files only and does not send code to a network service.
- It does not execute the target project.
- It skips common generated folders, dependency folders, VCS metadata and local agent notes by default.
- Reports can include filenames, dependency names, imports, exports and project structure. Review reports before sharing them publicly.
- Do not put secrets in `.env.example`, README examples, reports, test fixtures or committed config.
- Keep private notes and machine-specific files out of version control.
