---
name: zis-flow-review
description: Trace a ZIS customer or operations journey across storefront, API, database contracts, and admin UI to find integration gaps. Use for end-to-end behavior reviews, including checkout, orders, fulfillment, and returns.
---

# ZIS flow review

Name the requested user journey, starting state, expected result, and components it crosses. Begin with `docs/PLAN_INDEX.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/GUIDELINES.md`, and the relevant topic documents. Use `docs/OPEN_ISSUES.md` and `docs/OWNER_ACTIONS.md` to identify known blockers and decisions, without assuming they are resolved.

Trace the journey from UI action through client state, API route, controller, service, persistence contract, response, and next user or admin action. Apply the relevant checks in [the business-logic review guide](../zis-architecture-review/references/business-logic-review.md) to each consequential step, including failure and recovery paths. Compare the same field, status, amount, and permission across boundaries, including units and source of truth. Inspect focused tests and run safe local checks when available. For UI behavior, use a browser only when a working local test environment exists and the review needs runtime evidence.

Never read, print, search, index, or attach `.env` or `.env.*`; `.env.example` is the only permitted environment template. Prepare any file attached to an LLM with `scripts/prepare-file-for-llm.ps1` and attach only `PreparedPath`. Do not run migrations, submit live orders, charge payments, or mutate production during a review.

Deliver a compact journey map with each step marked verified in code, verified in a local test, planned, or unverified externally. Lead with concrete breaks or mismatches, citing file and line plus the user-visible consequence and fix direction. Record relevant open decisions and their blocked phase without choosing business policy. State the verification date and exactly what was tested.
