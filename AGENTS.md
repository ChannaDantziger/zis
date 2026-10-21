# Repository safety rules

- Never read, print, search, index, or attach `.env` or `.env.*` files to an LLM.
- `.env.example` is the only environment-file template that may be inspected or shared.
- Before attaching a file to an LLM, prepare it with `scripts/prepare-file-for-llm.ps1` and attach only the returned `PreparedPath`.
- The preparation command must fail closed when a requested environment file has no sibling `.env.example`.
- Never execute or automatically apply database migrations in this project. Prepare/document the required migration and ask the user to run it manually through the approved database workflow.

# Project navigation and documentation

- Start with [docs/PLAN_INDEX.md](docs/PLAN_INDEX.md), then read the current work plan and relevant topic documents.
- Follow [docs/GUIDELINES.md](docs/GUIDELINES.md), the local copy of the user's development guidelines.
- Every maintained Markdown file must contain at most 320 lines. Aim for 300; split by responsibility before exceeding 320.
- When splitting a document, keep its entry file, link to each part, fix incoming links, and list every part in docs/PLAN_INDEX.md.
- docs/PLAN_INDEX.md is the single full index. docs/DOCS_INDEX.md indexes implemented behavior only; archived plans are not execution instructions.
- Track missing work and contradictions in docs/OPEN_ISSUES.md; track owner decisions and account setup in docs/OWNER_ACTIONS.md.
- Distinguish verified implementation, partial implementation, planned work, and unverified external state. Include evidence and the verification date.
- Do not resolve conflicting business policies by guessing; record the decision needed and which dependent phase it blocks.
- Update task status and decisions during development. Write and verify final implementation/operations documentation at the end of each completed feature and at final handover.
- A shop release requires the complete customer and operations flows in docs/IMPLEMENTATION_PLAN.md; a visual prototype or inventory service alone is not a completed store.
