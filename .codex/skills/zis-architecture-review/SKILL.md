---
name: zis-architecture-review
description: Review the architecture of the whole ZIS system against relevant software architecture practices, with evidence and prioritized improvements. Use for a system-wide architecture assessment; use a narrower review skill for one change, security surface, or user journey.
---

# ZIS architecture review

Assess the **implemented system** as a whole: storefront, admin app, API, database contracts, media/storage, external integrations, tests, deployment, and operations. Work read-only unless the user separately requests changes. Define the assessment date and checkout/revision before making claims.

Start with `docs/PLAN_INDEX.md`, `docs/GUIDELINES.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/IMPLEMENTATION_PROGRESS.md`, `docs/OPEN_ISSUES.md`, and `docs/OWNER_ACTIONS.md`. Then consult the relevant architecture, API, schema, commerce, and deployment documents. Treat plans and historical reports as intent or prior evidence; establish current behavior from code, configuration, and tests. Follow applicable `AGENTS.md` instructions.

Build a current architecture map from repository evidence: deployable units, ownership of business rules and state, entry points, dependencies, trust boundaries, data stores, and the main paths from customer action through operations. Mark each part as implemented and verified, implemented but unverified, planned, or externally unknown. Record what was sampled if full inspection is impractical.

Perform an explicit **internal-structure pass** before concluding: inventory the actual directories and test entry points; trace imports across routes, controllers, services, repositories, and infrastructure; search for duplicate security checks, token parsing/issuance, business rules, status transitions, configuration defaults, and API contracts. Compare implementations and tests, distinguishing deliberate client-side mirrors from competing sources of truth. Identify dead helpers and misplaced shared interfaces. State which families were inspected; never claim that no duplicate exists without a complete basis.

Use [the review rubric](references/review-rubric.md) across system boundaries, data consistency, security, reliability, performance, operations, and maintainability, and apply [the business-logic review guide](references/business-logic-review.md) to the paths inspected. Follow at least the purchase/payment and admin/fulfillment paths deeply enough to test the architecture map against real behavior. Check cross-layer contracts and failure/retry paths, not only folder structure. Use focused local checks where they resolve a material uncertainty; state exactly what ran. Do not infer deployment health, data state, or security from passing unit tests.

Evaluate tradeoffs against ZIS requirements and maturity. Recommend the smallest change that addresses a demonstrated risk. Do not prescribe microservices, queues, caches, cloud services, or abstractions solely because a framework mentions them. Separate architecture defects from code style, hypothetical scale concerns, and unresolved owner policy. If the user asks for a focused code, security, or end-to-end review, use the corresponding narrower skill.

Never read, print, search, index, or attach `.env` or `.env.*`; only `.env.example` may be inspected. Before attaching a file to an LLM, prepare it with `scripts/prepare-file-for-llm.ps1` and attach only `PreparedPath`. Never run migrations. Do not mutate production, create live orders, charge payments, or alter external accounts during the review.

Deliver a compact architecture map, a directory/dependency map, and a coverage table, then actionable findings ranked by impact. Each finding needs a failure or change scenario, affected boundary, code/config evidence with file and line, likely consequence, concrete repair direction, and verification needed. Distinguish confirmed findings, design tradeoffs, decisions required from the owner, and unverified external state. Finish with a sequenced improvement plan, checks performed, date, and limits. If writing a maintained Markdown report, keep it under 320 lines, link it from `docs/PLAN_INDEX.md`, and track unresolved work in `docs/OPEN_ISSUES.md` or owner decisions in `docs/OWNER_ACTIONS.md` without exceeding their line limits.
