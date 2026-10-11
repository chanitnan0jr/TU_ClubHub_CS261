# Commit Message Rules

This repository follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) with the project rules below. Use English commit messages so the history stays consistent across contributors.

## Message format

```text
<type>(<scope>): <summary>

[optional body]

[optional footer(s)]
```

The scope is optional. Add `!` before the colon when the commit introduces a breaking change:

```text
feat(api)!: replace the club lookup response
```

## Types

| Type | Use it for |
|---|---|
| `feat` | A new user-facing capability |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Formatting changes without behavior changes |
| `refactor` | Code restructuring without behavior changes |
| `perf` | A performance improvement |
| `test` | Adding or changing tests |
| `build` | Build tools, dependencies, and packaging |
| `ci` | Continuous integration configuration |
| `chore` | Repository maintenance that does not fit another type |
| `revert` | Reverting an earlier commit |

Use `feat` and `fix` for application behavior. Use `build` for build wrappers and build configuration, and `docs` for contracts and project documentation.

## Scope and summary

- Use a short, lowercase scope when it helps identify the affected area. Common scopes include `api`, `architecture`, `backend`, `database`, `docs`, `frontend`, `repo`, and `ci`.
- Write the summary in the imperative mood, such as `add`, `fix`, or `document`.
- Keep the entire first line at 50 characters or fewer.
- Do not end the summary with a period.
- Describe the change, not the act of making the change. For example, use `docs(api): clarify session handling` instead of `docs(api): update API document`.

## Body and footers

Add a body after a blank line when context is needed. Explain why the change was made or any important implementation detail; avoid repeating the summary.

Use footers to reference work items or explain compatibility changes:

```text
Closes #42
Refs #57
BREAKING CHANGE: clients must send the new session cookie
```

A breaking change must be marked with `!` in the header or a `BREAKING CHANGE:` footer. Include a concise description of what consumers need to change.

## Keep commits focused

- Put one coherent change in each commit.
- Split unrelated work into separate commits, such as API contract changes, architecture documents, database design, and frontend implementation.
- Keep files that describe the same change together. For example, update the Markdown API contract and OpenAPI specification in the same commit.
- Stage explicit paths and review the staged diff before committing. Do not include secrets, generated build output, or unrelated in-progress work.
- Run the relevant project checks for the change before committing when they are available.

## Examples

```text
feat(frontend): add club detail page
fix(api): reject malformed application IDs
docs(api): clarify session authentication
build(backend): add Maven wrapper
chore(repo): ignore local build output
```

```text
feat(api)!: replace the club lookup response

BREAKING CHANGE: clients must read the club identifier from `id` instead of `clubId`.
```
