---
name: zis-edge-case-inventory
description: Map meaningful edge cases for a specified ZIS customer or operations flow, with expected behavior, evidence, test coverage, and unresolved decisions. Use when asked for an edge-case inventory or test matrix; do not activate for an ordinary code review.
---

# ZIS edge-case inventory

Define the journey, start and end state, actors, trust boundaries, and requested scope. Read `docs/PLAN_INDEX.md`, `docs/GUIDELINES.md`, the current plan, and relevant topic documents. Trace the actual UI, API, service, persistence, and admin handoff before listing cases. Treat documentation as intent and code/tests as separate evidence.

Generate cases systematically from: invalid and boundary inputs; missing, stale, duplicate, or reordered requests; timeout and uncertain result; retry and idempotency; concurrent edits; authentication and role changes; price, stock, date, and configuration changes; partial external failure; cancellation and recovery; browser reload/navigation; and downstream visibility. Include only categories that can affect this journey. Combine equivalent cases instead of inflating the list. Never claim the list is mathematically exhaustive.

For each case record trigger, expected outcome or decision needed, observed code behavior, existing test and result, remaining verification, risk, confidence and its basis, and precise code/document references. For a supported defect also give severity, impact, a reproducible check and a repair direction. Distinguish verified local behavior, test-only evidence, planned behavior, and unknown live state. If policy conflicts or is absent, record the owner decision and blocked step rather than guessing. Prioritize cases that could cause a charge, duplicate order, lost recovery path, wrong stock, or missed operations work.

Work read-only unless the user also asks for fixes. Run focused local tests when useful, but do not create live orders, charge money, mutate production, or execute migrations. Never read, print, search, index, or attach `.env` or `.env.*`; `.env.example` alone may be inspected. Before attaching a file to an LLM, use `scripts/prepare-file-for-llm.ps1` and attach only its `PreparedPath`.

Deliver a compact matrix and a prioritized action list. Give the verification date, what ran, and the boundary of the review. Keep any maintained Markdown report below 320 lines and add it to `docs/PLAN_INDEX.md`.
