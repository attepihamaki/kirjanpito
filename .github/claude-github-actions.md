# Claude on GitHub: each person on their own Claude seat

Mention `@claude` in an issue, a comment on an issue or pull request, or a pull request review, and Claude answers or makes the change. Each run uses the **Claude token of the person who mentioned `@claude`**, so it counts against that person's own Claude seat. There is no shared API key. How the workflow works as a whole is in `CLAUDE.md` §2d.

## How it works

```
@claude mentioned by GitHub user X
  └─ .github/workflows/claude.yml
       1. resolve: finds X in the CLAUDE_USERS variable → secret CLAUDE_TOKEN_<NAME>
       2. claude:  runs anthropics/claude-code-action with X's token
  X has no token yet → a comment points here, and Claude does not run
```

| What                     | Where                             | Example                                                                                          |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Each person's token      | secret `CLAUDE_TOKEN_<NAME>`      | `CLAUDE_TOKEN_ATTEPIHAMAKI`                                                                      |
| Who uses which token     | variable `CLAUDE_USERS` (JSON)    | `[{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-21","expires":"2027-11-21"}]` |
| Optional shared fallback | variable `CLAUDE_FALLBACK_SECRET` | `TEAM` → anyone not listed uses `CLAUDE_TOKEN_TEAM`. Unset (the default), everyone needs their own token. |

Only the repository's owner, members and collaborators can start a run, and the action checks write access again. Anyone else's mention is ignored.

The model is Sonnet unless the issue or pull request has the `model:opus` label (`CLAUDE.md` §2d).

## Getting your own Claude token (each person, about two minutes)

1. Install Claude Code if you don't have the command-line tool yet: `npm install -g @anthropic-ai/claude-code`
2. Run `claude setup-token`, sign in with your company Claude account in the browser, and copy the token it prints. The token is valid for one year.
3. Give the token and your GitHub username to a repository admin **through the password manager**, never by chat or email. An admin adds their own token with the script below.

Never paste the token into Claude, an issue, a commit or a chat.

## Adding, renewing and removing people (repository admin)

Needs `gh`, signed in as a repository admin (organization admin for `--org`), and `jq`.

```bash
# Add or renew a person; prompts for the token without showing it
scripts/claude-users.sh add attepihamaki -R attepihamaki/kirjanpito

# The same for a token created earlier: record its real expiry date
scripts/claude-users.sh add attepihamaki --expires 2027-11-19 -R attepihamaki/kirjanpito

# Who is set up, and when their tokens expire
scripts/claude-users.sh list -R attepihamaki/kirjanpito

# Someone leaves
scripts/claude-users.sh remove attepihamaki -R attepihamaki/kirjanpito
```

`add` stores the secret `CLAUDE_TOKEN_<LOGIN>` (upper case, `-` becomes `_`; `--suffix` sets another name) and adds or replaces the person's entry in `CLAUDE_USERS`, with an expiry date one year ahead unless `--expires` gives one. Running `add` again renews.

For an organization, `--org ORG --repos r1,r2` stores the secret and the variable at the organization and shares them with **exactly** the repositories listed, so always pass the full list. Organization secrets without `--repos` are shared with private repositories only; a public repository such as kirjanpito uses `-R`.

## Token expiry

`.github/workflows/claude-token-reminder.yml` runs every Monday and reads the `expires` dates in `CLAUDE_USERS`. While any token expires within 30 days, it keeps one open issue, "Claude tokens expiring soon", that mentions everyone who has to renew. The person creates a new token, the admin runs `add` again, and the issue closes itself once no token expires within 30 days. An entry without a valid date fails the reminder run, so it shows in the Actions tab.

## Usage limits

- A run uses the limits of the person who started it, shared with their own interactive Claude use.
- When someone reaches their limit, their runs fail with the error in Claude's comment. Other people's runs are unaffected.
- Every run also uses GitHub Actions minutes.

## Security

- **Anyone who can push a branch to this repository can read every stored token.** A workflow they add on their own branch runs with the repository's secrets, and CODEOWNERS or branch protection on `main` do not prevent that. Today only the owner can push here. Before adding a collaborator, or moving the tokens to the organization, decide how to protect them: for example a GitHub Environment that only `main` can use, which also means `@claude` in pull request reviews and line comments no longer runs.
- Remove a person's token the day they leave (`remove`), and have them revoke it at claude.ai.
- Claude works on branches; people open, review and merge the pull requests.

## Troubleshooting

| Symptom                                                    | Fix                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "you have no Claude token set up"                          | Add the person with `scripts/claude-users.sh add`.                                                         |
| "the secret `CLAUDE_TOKEN_X` is missing or not shared"     | The secret was deleted, or an organization secret is not shared with this repository. Run `add` again.     |
| The run fails with an authentication error                 | The token has expired or been revoked: renew it.                                                           |
| The run fails with a usage or rate limit                   | That person's seat limit is reached: wait, or have someone else mention `@claude`.                         |
| The resolve job fails: "CLAUDE_USERS is not a JSON array"  | The variable was edited by hand. Fix it, or rebuild it with `add`.                                          |
| Nothing happens at all                                     | The workflow is not on `main`, Actions are disabled, or the Claude GitHub App has no access to the repository. |
