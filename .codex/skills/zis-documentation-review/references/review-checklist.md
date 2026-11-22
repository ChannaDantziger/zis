# Documentation review checklist

Use applicable items for the requested scope; document omissions and do not treat a checklist as proof of correctness.

## Coverage and evidence

- Identify active entry points, navigation, owners, readers, review dates and relationships between plans, decisions, implemented-behavior guides and historical reports. Check `PLAN_INDEX.md` as the full index and `DOCS_INDEX.md` as the index of implemented behavior.
- Compare API endpoints, authorization, fields, statuses, examples, SQL/schema references, scripts and test instructions with corresponding code and contracts. Treat samples and old screenshots according to their stated date and purpose.
- Cross-check status claims against tests actually run and current code; distinguish a prior test result from a current test, and local implementation from external deployment. Flag instructions that could cause a harmful action if followed.
- Identify missing documentation for significant implemented features, setup, configuration templates, migrations, operations, backup/recovery and troubleshooting where applicable. Do not inspect restricted environment files.
- Check links, file locations, navigation, encoding and readability; run the repository documentation checker. Where relevant inspect HTML and companion assets and state which formats were not inspected.

## File disposition

- Compare content and audience, not just titles. Determine whether overlap is intentional, one source is authoritative, or versions disagree.
- Search references across allowed source, docs, scripts and configuration, and inspect generators and output consumers. Check whether a file is tracked, untracked, modified, generated, externally referenced or part of an audit trail; unknown consumers remain unknown.
- Recommend retaining historical evidence with clear status when it has continuing value. Mark an unreferenced or redundant file as a candidate, with evidence and risk, rather than asserting it is safe to delete.
- Archive confirmed obsolete versions under `docs/OLD`, mark them historical, and update `PLAN_INDEX.md` with their new paths and active replacements. Update `DOCS_INDEX.md` when relevant, repair incoming and internal links, preserve existing uncommitted work and run appropriate checks. Keep uncertain files in place and report why. For splits keep the entry document and index all parts; maintained Markdown is limited to 320 lines.

## Findings and handover

- Rank safety, release-blocking and misleading operational instructions above cosmetic issues. For each actionable finding include the observed claim, evidence, impact, proposed correction and how to verify it.
- Provide a file-disposition table with path, current purpose/status, evidence, recommendation, confidence and affected references. List decisions requiring the owner and record unresolved contradictions without guessing.
- Include a coverage summary with reviewed areas, omitted areas, commands and results, revision/date, external-state limitations and any checks that failed or could not run. Structural validation is not a semantic audit.
