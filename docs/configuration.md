# Configuration

The CLI is configured with command-line flags. It does not require secrets or external service credentials.

Use `.env.example` as a safe template for local shell wrappers or CI variables:

```dotenv
CODEBASE_CLARITY_TARGET=.
CODEBASE_CLARITY_OUTPUT=architecture-report.txt
CODEBASE_CLARITY_MAX_FILES=500
CODEBASE_CLARITY_MAX_FILE_SIZE_KB=256
```

These values mirror the CLI concepts:

- `CODEBASE_CLARITY_TARGET` is the directory to scan.
- `CODEBASE_CLARITY_OUTPUT` is an optional report file path.
- `CODEBASE_CLARITY_MAX_FILES` maps to `--max-files`.
- `CODEBASE_CLARITY_MAX_FILE_SIZE_KB` maps to `--max-file-size-kb`.

The source in `src/` does not read these variables itself. A wrapper script has to pass them to the CLI as flags.
