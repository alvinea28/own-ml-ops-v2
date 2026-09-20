# Repository workflow preferences

- Use the standard/default coding assistant. Use focused standard subagents only when useful; do not run custom Scrum agents, full-team orchestration, or role-by-role ceremonies.
- Do not create, recreate, update, or commit `.opencode/` or Graphify memory artifacts. OpenCode metadata was intentionally removed and is ignored by Git.
- `main` is the publication branch. Commit or push only when requested, and preserve unrelated local or untracked work.
- Use [the personal taxi setup guide](../docs/TAXI-TEMPLATE.md) for the current repository imports and initializer settings. Preserve upstream provenance links when they describe the original source rather than the personal deployment entry point.
