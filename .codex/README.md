# Codex security profile

`config.toml` defines the `zis-workspace` permission profile. It keeps normal workspace editing enabled but denies command access to `.env` and `.env.*` files. The non-secret `zis-api/.env.example` template is explicitly readable.

This is a Codex sandbox rule, not a substitute for secret management. Keep real production secrets in an OS environment variable, a deployment secret store, or Supabase Edge Function Secrets. Do not paste secret values into chat.

After changing this file, select the `zis-workspace` custom permission profile or restart the Codex task so the profile is loaded.

Before attaching any file to an LLM, run `scripts/prepare-file-for-llm.ps1`.
Environment files are replaced in a temporary staging directory with their
sibling `.env.example`; the source file is never overwritten. See
`scripts/README.md` for usage.
