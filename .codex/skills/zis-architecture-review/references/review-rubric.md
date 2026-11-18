# Architecture review rubric

Use these questions selectively, with evidence. A missing feature is a finding only when a current requirement, failure path, or release gate makes it necessary. Compare tradeoffs for this workload rather than scoring a generic checklist.

## System and module boundaries

- Can a reader identify the storefront, admin, API, database, storage, and external services and their runtime dependencies from code and deployment assets?
- Do routes/controllers/services/repositories and frontend app/pages/features/stores have clear responsibilities? Are dependencies directed toward stable contracts? Is business logic duplicated across clients, API, SQL, and reports?
- Do customer and admin actions cross the API boundary consistently, with server-owned price, stock, permissions, and status transitions? Are shared schemas/contracts versioned or checked where they cross builds?
- Are architectural choices simple enough for the current team and workload? Is there a measured reason for each additional abstraction or service?

## State and data integrity

- For ordering, payment, inventory, cancellation, and fulfillment, identify the source of truth, transaction boundary, invariant, and state transition owner.
- Check duplicate requests, lost responses, replay, concurrent writes, stale reads, partial failures, and recovery. Does idempotency survive process restart? Are external effects reconciled after uncertain outcomes?
- Do schema, migrations, API types, and UI expectations agree? Distinguish migration files from migrations verified in a target database. Check privacy and retention of customer data, tokens, media, logs, and audit records.

## Security and privacy boundaries

- Locate authentication, authorization, object-level access, input validation, upload controls, secret handling, and audit boundaries for customer and admin flows. Identify the actor and trust boundary of any risk.
- Verify that the server enforces sensitive rules and that simulated payment cannot approve a real order. A broad review should flag a concrete security risk and use `zis-security-review` for a deeper requested investigation.

## Reliability, performance, and operations

- Identify required availability and recovery targets before recommending redundancy. Check timeouts, retries, backoff, readiness, graceful failure, backup and restore evidence, rollback, deployment independence, and observability across the main flows.
- Check likely hot paths for query shape, pagination, indexes, payload size, media delivery, caching correctness, and load evidence. Label capacity guesses as hypotheses until measured.
- Compare build, CI, environment separation, migration workflow, operational runbooks, alerts, and ownership with the planned release gate. Distinguish local checks from staging and production verification. Discuss cost only where actual provider or usage data exists.

## Evidence and reporting

- Prioritize findings that can lose an order, cause an incorrect charge or stock change, expose private data, block operations, or make recovery impossible. Cite exact code/config lines and the path from cause to outcome.
- Give a practical fix and a targeted validation for each finding. Do not report naming, file size, or framework differences as defects without a concrete maintenance or runtime consequence.
- Map coverage as inspected, tested locally, planned, or externally unverified. Avoid a single pass/fail score for the whole architecture.

## Reference lenses

These are prompts for quality attributes, not provider requirements or evidence that ZIS uses a named cloud:

- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/) — operational excellence, security, reliability, performance, cost, and sustainability.
- [Azure Well-Architected pillars](https://learn.microsoft.com/en-us/azure/well-architected/pillars) — workload tradeoffs across reliability, security, cost, operations, and performance.
- [Google Cloud Well-Architected Framework](https://docs.cloud.google.com/architecture/framework) — workload quality and cross-pillar perspectives.
- [OWASP ASVS](https://asvs.owasp.org/) — security requirements for web applications and services; use for security questions, not as a claim of certification.
- [C4 model](https://c4model.com/) — optional system context and container/component diagrams when a diagram clarifies boundaries.

Verify current official guidance when a recommendation depends on a version or provider-specific behavior. ZIS requirements, code evidence, and approved owner decisions determine the recommendation.
