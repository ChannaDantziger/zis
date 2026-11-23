# Business-logic and responsibility review

Apply these checks to behavior affected by a change, or to the explicitly selected paths of a broader review. Scale depth to risk and document what was not inspected. Do not turn possible scenarios into findings without a concrete path and evidence.

## Establish the rule and execute the paths

- Identify the actor, starting state, intended outcome, authoritative rule and its evidence. Distinguish approved policy from plans, existing behavior, and unresolved decisions; do not invent policy to judge correctness.
- Follow real callers and inputs through each relevant branch to its observable result and persisted side effects. Work through representative valid, invalid and boundary values, including empty, missing, zero, maximum and equality at a cutoff. Check predicates, negation, default values, ordering and early returns against the rule.
- For amounts and quantities, follow units, rounding, precision, minimums, discounts, tax and delivery where relevant; compare calculations at quote, commit and display. Check dates, time zones and cutoff boundaries where they affect behavior.
- For status-driven work, identify permitted and forbidden transitions, preconditions, who may perform them, and downstream visibility. Check whether validation and the mutation use the same current state.

## Follow ownership and failure

- Identify the authoritative source of price, stock, permissions, state and configuration. Compare client validation, API, SQL and admin/reporting consumers where relevant; distinguish intentional display copies from independently enforced rules that can diverge.
- Identify transaction and concurrency boundaries. Trace duplicate requests, simultaneous changes, stale responses, retry after timeout or lost response, partial failure, rollback and recovery when relevant. Verify that success is shown only after the necessary durable effects; inspect idempotency scope and side effects rather than assuming a key is sufficient.
- Check responsibility and dependency direction across UI/state, routes, controllers, services and repositories. Identify mixed responsibilities, duplicate rules, circular dependencies and abstractions only when they create a concrete error, divergence or maintenance risk. Prefer a focused repair over structural change for its own sake.

## Test the claim

- Examine the actual test assertions and fixtures, not just test names or green status. Consider whether mocks bypass the rule, SQL transaction or cross-layer contract under review. Select focused negative, boundary, concurrency or integration checks that can distinguish correct from incorrect behavior.
- For each supported finding identify the inputs and state, exact code path and evidence, consequence, and a targeted verification. Mark assumptions, missing policy, runtime or database evidence, and uninspected branches explicitly. Passing tests and a checklist do not prove absence of logic errors.
