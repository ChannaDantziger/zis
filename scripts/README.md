# Safe file preparation for LLM context

Run this script before attaching a repository file to an LLM:

```powershell
pwsh -File .\scripts\prepare-file-for-llm.ps1 -Path .\path\to\file.ts
```

For `.env`, `.env.local`, `.env.production`, and other `.env.*` files, the
script stages a copy of the sibling `.env.example` instead of reading the
requested file. If the example file is missing, it fails closed.

The original file is never overwritten. The command prints one compact JSON
record per input file; attach only the returned `PreparedPath`.

## Documentation validation

Run `./scripts/check-docs.ps1` from the repository, or invoke it by absolute path.
It checks all maintained Markdown files (including hidden documentation), the
320-line maximum, local file-link targets, and coverage in [PLAN_INDEX](../PLAN_INDEX.md).
It excludes dependencies, build output, Git internals and environment files.
It reads only prepared copies. HTTP URLs and heading anchors are not checked.
Files with identical basenames are prepared and read sequentially because the
preparation script uses the basename in its output directory.

## Local visual review

`build-zis-preview.py` rebuilds the ZIS review copy from the preserved HTML bundle.
`review-zis-preview.mjs` captures Chromium screenshots and checks responsive width,
logo/image loading, runtime errors and the mobile menu. Setup, commands and limits
are documented in the [preview README](../prototypes/zis-review/README.md).
