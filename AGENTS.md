# Agent Guidance

Agents working on this project **must**:

- Look for **work instructions and rules** in `./.agents/rules`.

- Look for available **agent skills** in `./.agents/skills` (skills externas) y en `./.skills` (skill interna).

- Look for the **project memory bank** in `./memory-bank` if the directory exists.

Before taking action (analyzing code, modifying files, or generating outputs), always review the latest files in these locations to ensure compliance with project conventions, context, and operational constraints.

## Applying skills

- Consult and apply a skill when the task falls within its documented scope. If a relevant recommendation is not followed, briefly explain why (for example, it is inapplicable, conflicts with a project rule, or is outside the requested scope).
- When skills overlap or conflict, follow the user's instructions and project rules first; among skills, prefer the one most specific to the task. Explain any material conflict and the choice made.

## Skill lifecycle

- Before installing a skill, review this registry and the existing `SKILL.md` files for scope overlap. Use `.agents/skills/<skill-name>/SKILL.md` as the canonical location for agent skills; use `.skills/<skill-name>/SKILL.md` for the internal skill (as required by the assignment).
- For a skill sourced from GitHub, record and verify its source, repository-relative skill path, and computed content hash in `skills-lock.json`.
- When updating or removing a skill, update `skills-lock.json` and the skill registry in `memory-bank/progress.md` in the same change. Preserve provenance and note the reason for removal or replacement.
