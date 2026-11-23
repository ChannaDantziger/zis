---
name: zis-pr-review
description: Review a ZIS code change or pull request for concrete bugs, regressions, contract breaks, and maintainability risks. Use for ordinary change reviews; use a specialized skill for a requested security or end-to-end flow review.
---

# ZIS change review

Review the requested diff or PR without changing code unless the user also asks for fixes. Establish the base and scope before interpreting a diff. If no comparison target is given, review the current local changes and state that scope.

Read `docs/PLAN_INDEX.md`, `docs/GUIDELINES.md`, the current work plan, and only the topic documents relevant to changed behavior. Apply `AGENTS.md` and any narrower repository instructions. Treat plans as intended behavior, not proof of implementation; verify claims in code and tests. Do not infer a business decision from conflicting documents; identify the decision needed.

Inspect the full diff, including deleted behavior, configuration, SQL, and tests; examine enough surrounding code and callers to establish the old and new behavior. Check each affected behavior rather than sampling only obvious files; if the diff is too large, identify unreviewed areas and do not imply full coverage. Separate defects introduced by the change from pre-existing problems and planned work; when a baseline cannot be established, say so.

Trace affected behavior through callers, API contracts, tests, and user-visible effects. Apply the relevant checks in [the business-logic review guide](../zis-architecture-review/references/business-logic-review.md), including explicit execution paths and responsibility boundaries. Prioritize defects and regressions over style. Check simplicity, separation of concerns, Mantine/MobX conventions where applicable, and missing tests only where they expose a plausible failure. Inspect whether tests assert the behavior independently of mocks; run focused safe local checks when useful.

Never read, print, search, index, or attach `.env` or `.env.*`; `.env.example` is the only permitted environment template. Before attaching any file to an LLM, use `scripts/prepare-file-for-llm.ps1` and attach only `PreparedPath`. Never execute or automatically apply a database migration. Keep production and live-data actions outside the review unless explicitly authorized.

Report only material, supported findings first, ordered by severity. For each, give the exact file and line, failure scenario, impact, severity (critical, medium, or low), confidence (high, medium, or low) and its basis, a way to reproduce or verify, and a practical fix. Keep evidence gaps and hypotheses separate from confirmed findings. State the base, revision and uncommitted scope, inspected areas, checks and outcomes, and verification date. End with focused automated or manual checks for the findings. If no actionable finding is supported, say so explicitly and name the main remaining verification gap.
