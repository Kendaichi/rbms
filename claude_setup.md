# Claude Agent Setup — Reusable Blueprint

A portable way to make Claude work consistently on any project. It uses **three layers** that form a
closed loop:

1. **Standing instructions** (`CLAUDE.md` + memory) — load automatically every session and set the rules.
2. **Knowledge base** (`.claude/` folder) — supplies depth on demand (architecture, stack, data model, decisions).
3. **Running journal** (`handoff.md`) — supplies current state; updated at the end of every change.

> Loop: rules load at session start → knowledge base gives *why/what* → journal gives *where we are*
> → the Session-End contract writes updates back so the next session is oriented.

To adopt this in a new project, create the files below and replace every `<PLACEHOLDER>`. Delete any
section that doesn't apply.

---

## Files to create

```
<project-root>/
├── CLAUDE.md            # standing rulebook (auto-loaded)
├── handoff.md           # running journal (newest-first)
└── .claude/
    ├── architecture.md  # topology / how the parts connect
    ├── stack.md         # exact dependencies & versions
    ├── data-model.md    # entities / schema summary
    ├── decisions.md     # why things are the way they are (ADR-ish)
    ├── settings.local.json   # local permission allowlist (optional)
    ├── agents/          # custom subagents (optional)
    └── skills/          # project-scoped skills (optional)
```

---

## 1. `CLAUDE.md` — the standing rulebook

Keep it tight. This is injected into **every** session and overrides default behavior, so it should
be rules and orientation, not prose.

```markdown
# <PROJECT NAME> — <one-line description>

## Overview
<2–4 sentences: what this system does and who it's for.>

## Stack (high level)
- **Backend**: <language / framework / db / auth>
- **Frontend**: <framework / state / UI libs>
- **Other services**: <queues, PDF, workers, etc.>

## Structure
<tree of the top 2–3 levels, with a one-line note per key dir>

## Current Focus (as of <YYYY-MM>)
- <what's in flight, dated; link back to handoff.md entries>

## Rules
- <hard convention #1 — a landmine someone already hit, stated as a rule>
- <naming conventions that aren't obvious from the code>
- <security / auth invariants that must always hold>
- <UI/library gotchas and their fixes>
- <"never do X / always do Y" items>

## Session End
- After every change, append a dated entry to `handoff.md` (newest-first).
- Update `.claude/decisions.md` for any architectural call.
- Update `.claude/data-model.md` if entities/relationships change.
- <migration / deploy / build rules, e.g. "new migrations only, never edit existing">
```

**Tips**
- The **Rules** section is the highest-value part. Every time you correct Claude on something
  non-obvious, add it here as a one-line rule — that's how the file earns its keep.
- Keep **Current Focus** dated and short; push detail into `handoff.md` and link to it.

## 2. Memory (cross-session facts) — optional but recommended

If your Claude harness supports a persistent memory store, use it for facts that aren't derivable
from the code: team/staffing norms, what's deployed vs. merely present in the repo, already-seeded
data, environment quirks, and recurring bug patterns. Keep each fact to one file/one idea with a
short description, and index them so they load each session. These complement `CLAUDE.md` Rules but
persist independently of the repo.

## 3. `.claude/` knowledge base

Depth that doesn't belong in the always-loaded rulebook. Claude reads these on demand.

**`architecture.md`** — how the parts connect. An ASCII topology diagram plus a few notes beats paragraphs.

```markdown
# Architecture
## Topology
<ASCII diagram: services, protocols, data stores, who-calls-whom>

## Notes
- <non-obvious boundary or data-flow decision>
```

**`stack.md`** — exact dependencies and versions, grouped by service. Lets Claude match existing idioms instead of guessing.

**`data-model.md`** — entities and relationships (model count, key tables, domains). Summary, not a schema dump.

**`decisions.md`** — the *why*. Short ADR-style entries: the decision, and the reasoning or trade-off.

```markdown
# Decisions
> Mark entries "inferred" if reconstructed from code rather than recorded at the time.

## <Area>
- **<Decision>** — <why / trade-off / what was rejected>
```

**`settings.local.json`** — local permission allowlist so routine commands don't re-prompt. Example:

```json
{
  "permissions": {
    "allow": [
      "Bash(<frequently-run read-only command>)"
    ]
  }
}
```

**`agents/<name>.md`** *(optional)* — a custom subagent. Frontmatter (`name`, `description`, `model`,
`color`) + a system prompt defining its role. Use for a recurring specialized task (e.g. a
planning/strategy advisor).

**`skills/<name>/SKILL.md`** *(optional)* — a project-scoped skill: a named, triggerable procedure
Claude follows for a specific repeatable task. State its **scope guardrails** explicitly (e.g.
"analysis only, never writes").

## 4. `handoff.md` — the running journal

The project's working memory. **Newest-first.** Every implementation appends a dated block; plans
for in-flight work live at the top.

```markdown
# Handoff — <PROJECT NAME>

## <YYYY-MM-DD> — <short title of what shipped>
- **What**: <the change, in a sentence or two>
- **Files**: <key files touched>
- **Verified**: <how — build / tests / live run — and the result>
- **Gotchas**: <anything the next session should know>
```

This is what `CLAUDE.md`'s "Current Focus" summarizes and links back to. It's the single place to
answer "where are we?"

---

## Adoption checklist

- [ ] Create `CLAUDE.md` with Overview / Stack / Structure / Current Focus / Rules / Session End.
- [ ] Seed `.claude/` with `architecture.md`, `stack.md`, `data-model.md`, `decisions.md`.
- [ ] Start `handoff.md` with the first dated entry (even just "project setup").
- [ ] Add `settings.local.json` allow-list entries as routine commands come up.
- [ ] (Optional) Add custom agents/skills under `.claude/`.
- [ ] Add a pointer to this file from `CLAUDE.md` so the setup is discoverable.
- [ ] Grow the **Rules** section continuously — every correction becomes a rule.

> Keep `decisions.md` / `data-model.md` honest: if they were reconstructed from code rather than
> recorded live, mark them "inferred" and verify against the code before relying on specifics.
