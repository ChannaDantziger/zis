---
name: zis-security-review
description: Perform a focused, read-only security and privacy review of ZIS code, especially authentication, admin permissions, orders, payments, uploads, and API boundaries. Use when security risk or a security review is the task.
---

# ZIS security review

Define the requested change or surface and identify its trust boundaries: browser, API, database, storage, payment provider, and admin roles as relevant. Start at `docs/PLAN_INDEX.md`; read `docs/GUIDELINES.md`, the current plan, and only relevant security, commerce, and schema documents. Confirm behavior in code rather than treating a plan as an implemented control.

Follow untrusted data from entry to use. Examine authentication and authorization on every sensitive route, object-level access, input validation, idempotency and replay, upload handling, secrets and personal data in responses or logs, and payment/webhook integrity where applicable. Use OWASP's secure code review guidance as a topic checklist, not as evidence that a vulnerability exists: https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html.

Operate read-only by default. Do not probe production, create live orders, perform charges, change permissions, or run migrations as part of a review. Never read, print, search, index, or attach `.env` or `.env.*`; `.env.example` is the only permitted environment template. Prepare any file attached to an LLM with `scripts/prepare-file-for-llm.ps1` and attach only `PreparedPath`. Avoid exposing personal or secret values in findings.

Report only supported risks with affected file and line, attacker or failure path, impact, evidence, and a bounded remediation. Rank by impact and exploitability. Distinguish code-verified controls from tests, documentation claims, and unverified live configuration. Include checks performed, verification date, and coverage limits; do not label a system secure from a narrow review.
