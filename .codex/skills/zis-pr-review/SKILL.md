---
name: zis-pr-review
description: Review a ZIS code change or pull request for concrete bugs, regressions, contract breaks, and maintainability risks. Use for ordinary change reviews; use a specialized skill for a requested security or end-to-end flow review.
---

# ZIS change review

Review the requested diff or PR without changing code unless the user also asks for fixes. Establish the base and scope before interpreting a diff. If no comparison target is given, review the current local changes and state that scope.

Read `docs/PLAN_INDEX.md`, `docs/GUIDELINES.md`, the current work plan, and only the topic documents relevant to changed behavior. Apply `AGENTS.md` and any narrower repository instructions. Treat plans as intended behavior, not proof of implementation; verify claims in code and tests. Do not infer a business decision from conflicting documents; identify the decision needed.

Trace changed behavior through callers, API contracts, tests, and user-visible effects. Prioritize defects and regressions over style. Check simplicity, separation of concerns, Mantine/MobX conventions where applicable, and missing tests only where they expose a plausible failure. Use lint or typecheck results as evidence when available, and run focused read-only checks when useful.

Never read, print, search, index, or attach `.env` or `.env.*`; `.env.example` is the only permitted environment template. Before attaching any file to an LLM, use `scripts/prepare-file-for-llm.ps1` and attach only `PreparedPath`. Never execute or automatically apply a database migration. Keep production and live-data actions outside the review unless explicitly authorized.

Report actionable findings first, ordered by severity. For each, give file and line, the failure scenario, why the change causes it, and a practical fix direction. Separate confirmed findings from questions and unverified external state. Say what was inspected and which checks ran, with the verification date. If no actionable finding is supported, say so and name the main remaining verification gap.
