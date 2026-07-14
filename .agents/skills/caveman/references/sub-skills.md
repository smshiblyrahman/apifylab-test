# Caveman Sub-Skills Reference

---

## COMMIT — caveman-commit

Trigger: "write a commit", "commit message", "generate commit", "/caveman-commit".

Write terse, exact commit messages. Conventional Commits format. No fluff. Why over what.

### Subject line
- `<type>(<scope>): <imperative summary>` — scope optional
- Types: `feat` `fix` `refactor` `perf` `docs` `test` `chore` `build` `ci` `style` `revert`
- Imperative mood: "add", "fix", "remove" — not "added"
- ≤50 chars preferred, hard cap 72. No trailing period.

### Body (only if needed)
- Skip when subject is self-explanatory
- Add for: non-obvious *why*, breaking changes, migration notes, linked issues
- Wrap at 72 chars. Bullets `-`. References at end: `Closes #42`

### Never include
- "This commit does X", "I", "we", "now", "currently"
- "Generated with Claude" or any AI attribution
- Restating file name when scope already says it

### Examples

❌ "feat: add a new endpoint to get user profile information from the database"

✅
```
feat(api): add GET /users/:id/profile

Mobile client needs profile data without full user payload
to reduce LTE bandwidth on cold-launch screens.

Closes #128
```

Breaking change:
```
feat(api)!: rename /v1/orders to /v1/checkout

BREAKING CHANGE: clients on /v1/orders must migrate before 2026-06-01.
Old route returns 410 after that date.
```

### Auto-Clarity
Always include body for: breaking changes, security fixes, data migrations, reverts.

Output as code block ready to paste. Does not run `git commit`.

---

## REVIEW — caveman-review

Trigger: "review this PR", "code review", "review the diff", "/caveman-review".

One line per finding. Location, problem, fix. No throat-clearing.

### Format
`L<line>: <problem>. <fix>.`
`<file>:L<line>: ...` for multi-file diffs.

### Severity prefix (when mixed)
- `🔴 bug:` — broken, will cause incident
- `🟡 risk:` — works but fragile
- `🔵 nit:` — style/naming, author can ignore
- `❓ q:` — genuine question

### Drop
- "I noticed that...", "It seems like...", "You might want to consider..."
- "Great work!" per comment
- Restating what the line does
- Hedging — use `q:` if unsure

### Keep
- Exact line numbers
- Exact symbol names in backticks
- Concrete fix, not "consider refactoring"
- The *why* if fix isn't obvious

### Examples

❌ "I noticed on line 42 you're not checking if user is null before accessing email..."

✅ `L42: 🔴 bug: user can be null after .find(). Add guard before .email.`

❌ "This function is doing a lot of things..."

✅ `L88-140: 🔵 nit: 50-line fn does 4 things. Extract validate/normalize/persist.`

### Auto-Clarity
Drop terse for: CVE-class security findings, architectural disagreements, onboarding contexts.
Resume terse after.

Output comments ready to paste into PR. Does not approve/request-changes.

---

## COMPRESS — caveman-compress

Trigger: "compress memory file", "compress this file", "/caveman-compress <file>".

Compress natural language files (.md, .txt) to caveman prose to save input tokens.
**Note: claude.ai has no filesystem access by default.** User must paste file content.

### Process (claude.ai)
1. User pastes file content.
2. Apply compression rules below.
3. Return compressed version ready to copy-paste back.

### Remove
- Articles: a, an, the
- Filler: just, really, basically, actually, simply, essentially
- Pleasantries: "sure", "certainly", "of course", "happy to"
- Hedging: "it might be worth", "you could consider"
- Redundant phrases: "in order to"→"to", "make sure to"→"ensure"
- Connectives: "however", "furthermore", "additionally"

### Preserve EXACTLY
- Code blocks (``` fenced and indented)
- Inline code (`backtick content`)
- URLs, file paths, commands, technical terms, proper nouns
- Dates, version numbers, numeric values, env vars

### Preserve Structure
- All markdown headings (compress body, keep headings exact)
- Bullet hierarchy, numbered lists, tables, frontmatter

### Pattern

Original:
> You should always make sure to run the test suite before pushing any changes to the main branch. This is important because it helps catch bugs early.

Compressed:
> Run tests before push to main. Catch bugs early.

### Boundaries
- ONLY compress .md, .txt, .typ, .tex, extensionless natural language files
- NEVER modify: .py, .js, .ts, .json, .yaml, .toml, .env, .sh
- Mixed content: compress prose sections only, leave code untouched
- CRITICAL: code blocks are read-only. Copy exactly.
