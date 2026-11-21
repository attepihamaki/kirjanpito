# Claude on GitHub: each person on their own Claude seat

Mention `@claude` in an issue, a comment on an issue or pull request, or a pull request review, and Claude answers or makes the change. Each run uses the **Claude token of the person who mentioned `@claude`**, so it counts against that person's own Claude seat. There is no shared API key and no shared token: someone without their own token is told how to add one. How the workflow works as a whole is in `CLAUDE.md` §2d.

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
| Who uses which token     | variable `CLAUDE_USERS` (JSON)    | `[{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}]` |

Only the repository's owner, members and collaborators can start a run, and the action checks write access again. Anyone else's mention is ignored.

The model is Sonnet unless the issue or pull request has the `model:opus` label (`CLAUDE.md` §2d).

## Getting your own Claude token (each person, about two minutes)

1. Install Claude Code if you don't have the command-line tool yet: `npm install -g @anthropic-ai/claude-code`
2. Run `claude setup-token`, sign in with your company Claude account in the browser, and copy the token it prints. The token is valid for one year.
3. Give the token and your GitHub username to a repository admin **through the password manager**, never by chat or email. An admin adds their own token the same way, following the steps below.

Never paste the token into Claude, an issue, a commit or a chat.

## Adding, renewing and removing people (repository admin)

Everything is done by hand on the repository's **Settings → Secrets and variables → Actions** page: <https://github.com/attepihamaki/kirjanpito/settings/secrets/actions>. A person needs two things there: their own secret, and an entry in the `CLAUDE_USERS` list.

### Adding a person

1. **The secret.** On the **Secrets** tab, click **New repository secret**.
   - **Name:** `CLAUDE_TOKEN_` followed by the person's GitHub login in upper case, with `-` written as `_`. For `attepihamaki` that is `CLAUDE_TOKEN_ATTEPIHAMAKI`; for `atte-p` it would be `CLAUDE_TOKEN_ATTE_P`.
   - **Secret:** the token, without spaces or line breaks.
2. **The list entry.** On the **Variables** tab, open `CLAUDE_USERS` (pencil icon), or create it with **New repository variable** if it does not exist yet. Add the person's entry:

   ```json
   {"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}
   ```

   The variable is a JSON list, so the entries sit between `[` and `]`, separated by commas. With two people:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2026-12-01","expires":"2027-12-01"}]
   ```

The fields:

| field     | what it holds                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `github`  | the person's GitHub login; upper or lower case does not matter                                             |
| `secret`  | the secret's name after `CLAUDE_TOKEN_`, exactly: upper-case letters, digits and `_` only                  |
| `added`   | the date the person was added, `YYYY-MM-DD`; for information only                                          |
| `expires` | the date the token was created plus one year, `YYYY-MM-DD`; the token reminder reads this date             |

Use straight double quotes (`"`). An editor that turns them into curly quotes breaks the list, and the workflow then stops with "CLAUDE_USERS is not a JSON array". Paste the value into any JSON validator first if unsure.

### Renewing a token

1. The person runs `claude setup-token` again and hands the new token over through the password manager.
2. On the **Secrets** tab, update `CLAUDE_TOKEN_<NAME>` (pencil icon) with the new token.
3. In `CLAUDE_USERS`, change the person's `expires` to the new token's creation date plus one year.

### Removing a person

1. On the **Secrets** tab, delete `CLAUDE_TOKEN_<NAME>`.
2. In `CLAUDE_USERS`, delete the person's entry, together with the comma that separated it from the next one.

### Checking

The **Secrets** tab lists every `CLAUDE_TOKEN_<NAME>` (values are never shown), and the **Variables** tab shows `CLAUDE_USERS`. Every `secret` in the list needs a matching secret. A run also writes "Claude runs on X's request using CLAUDE_TOKEN_Y" to its summary in the Actions tab.

### For an organization (later)

The same steps work on the organization's **Settings → Secrets and variables → Actions** page, with **Repository access** set to the repositories that use Claude. Keep that list complete on the secrets and on `CLAUDE_USERS` alike. A public repository such as kirjanpito keeps repository secrets; read the security note below before moving tokens to the organization.

## Token expiry

`.github/workflows/claude-token-reminder.yml` runs every Monday and reads the `expires` dates in `CLAUDE_USERS`. While any token expires within 30 days, it keeps one open issue, "Claude tokens expiring soon", that mentions everyone who has to renew. The person creates a new token, the admin renews it as described above, and the issue closes itself once no token expires within 30 days. An entry without a valid date fails the reminder run, so it shows in the Actions tab.

## Usage limits

- A run uses the limits of the person who started it, shared with their own interactive Claude use.
- When someone reaches their limit, their runs fail with the error in Claude's comment. Other people's runs are unaffected.
- Every run also uses GitHub Actions minutes.

## Security

- **Anyone who can push a branch to this repository can read every stored token.** A workflow they add on their own branch runs with the repository's secrets, and CODEOWNERS or branch protection on `main` do not prevent that. Today only the owner can push here. Before adding a collaborator, or moving the tokens to the organization, decide how to protect them: for example a GitHub Environment that only `main` can use, which also means `@claude` in pull request reviews and line comments no longer runs.
- Remove a person's secret and list entry the day they leave.
- Claude works on branches; people open, review and merge the pull requests.

## Troubleshooting

| Symptom                                                    | Fix                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "you have no Claude token set up"                          | Add the person's secret and list entry, as described above.                                                |
| "the secret `CLAUDE_TOKEN_X` is missing or not shared"     | The secret was deleted or misnamed, or an organization secret is not shared with this repository.          |
| The run fails with an authentication error                 | The token has expired or been revoked: renew it.                                                           |
| The run fails with a usage or rate limit                   | That person's seat limit is reached: wait, or have someone else mention `@claude`.                         |
| The resolve job fails: "CLAUDE_USERS is not a JSON array"  | A quote, comma or bracket is wrong. Check the value in a JSON validator and fix it.                        |
| Nothing happens at all                                     | The workflow is not on `main`, Actions are disabled, or the Claude GitHub App has no access to the repository. |
