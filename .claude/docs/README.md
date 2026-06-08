# .claude/docs — Documentation Convention
# Do not delete. Do not reorganize. Claude reads these at session start.
# All files in this folder are updated automatically by /session-end.
# Manual updates: /docs-update

---

## Files in This Folder

| File | Purpose | Projects |
|------|---------|----------|
| architecture.md | Stack in use, patterns, ADR index | all |
| decisions.md | Running log of all decisions made | all |
| components.md | UI component catalog with props summary | frontend only |
| api.md | API endpoints with method, path, auth, description | backend/fullstack only |
| data-models.md | Database schema, entities, key relationships | backend/fullstack only |

---

## Format Rules

**No prose paragraphs.** Tables and bullet lists only. These files are read by
Claude at session start to re-establish context fast — they must be scannable
in under 10 seconds.

Each file starts with:
```
<!-- Last updated: YYYY-MM-DD by /session-end -->
```

---

## Entry Formats

### decisions.md
```markdown
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| YYYY-MM-DD | design/tech/ux | [topic] | [what was chosen] | [why] | yes/no |
```

### components.md
```markdown
| Component | Location | Key Props | States Handled | Notes |
|-----------|----------|-----------|----------------|-------|
| [Name] | src/components/... | [prop: type] | default, hover, error | [anything non-obvious] |
```

### api.md
```markdown
| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | /api/... | public | — | { id, name } | [anything non-obvious] |
| POST | /api/... | bearer | { name: string } | { id } | |
```

### architecture.md
```markdown
## Stack
[framework, database, auth, hosting — one line each]

## Patterns in Use
- [pattern name]: [where it applies]

## ADR Index
| ADR | Decision | Status | Date |
|-----|----------|--------|------|
| ADR-001 | [decision title] | accepted | YYYY-MM-DD |
```

### data-models.md
```markdown
## [EntityName]
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| [field] | [type] | [nullable/unique/FK→table] | [non-obvious] |
```

---

## What Never Goes Here

- Code snippets (use inline comments in source)
- Long explanations (use ADRs in .adr/)
- Session notes (use .claude/sessions/)
- Task progress (use .claude/tasks/)
- Anything with "TODO" — write the actual content or leave it out
