# Claude on GitHub: setup guide

Mention `@claude` in an issue, a comment on an issue or pull request, or a pull request review, and Claude answers or makes the change. Each run uses the **Claude token of the person who mentioned `@claude`**, so it counts against that person's own Claude seat. There is no shared API key and no shared token: someone without their own token gets a comment pointing here, and Claude does not run.

This guide covers everything from creating your token to using Claude, renewing the token and leaving the team. How the workflow itself behaves is in `CLAUDE.md` §2d.

## How it works

```
@claude mentioned by GitHub user X
  └─ .github/workflows/claude.yml
       1. resolve: finds X in the CLAUDE_USERS variable → secret CLAUDE_TOKEN_<NAME>
       2. claude:  runs anthropics/claude-code-action with X's token
  X has no token yet → a comment points here, and Claude does not run
```

| What                 | Where                          | Example                                                                                           |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Each person's token  | secret `CLAUDE_TOKEN_<NAME>`   | `CLAUDE_TOKEN_ATTEPIHAMAKI`                                                                       |
| Who uses which token | variable `CLAUDE_USERS` (JSON) | `[{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}]` |

Only the repository's owner, members and collaborators can start a run, and the action checks write access again. Anyone else's mention is ignored.

## Before you start

You need:

- **A Claude seat** on the company's Claude account. The token is tied to it, and every run uses its limits.
- **A GitHub account with write access** to this repository. The repository owner adds you as a collaborator.
- **Access to the team's password manager**, to hand the token over.

The **repository admin** stores tokens and edits the user list. Today that is the repository owner, `attepihamaki`.

## Setup at a glance

| Step | Who                   | What                                                    | Time        |
| ---- | --------------------- | ------------------------------------------------------- | ----------- |
| 1    | you                   | Create your Claude token                                | 2 minutes   |
| 2    | you                   | Hand it to the repository admin in the password manager | 1 minute    |
| 3    | the repository admin  | Store the token and add you to the user list            | 2 minutes   |
| 4    | you                   | Test with an issue that mentions `@claude`              | a few minutes |

If you are the repository admin setting up your own token, do steps 1, 3 and 4 and skip the handover.

## Step 1: create your Claude token (you)

1. **Install Claude Code** if you don't have the command-line tool yet:

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Create the token:**

   ```bash
   claude setup-token
   ```

   A browser window opens. Sign in with your **company Claude account**, the one that holds your seat, not a personal one. When you approve, the terminal prints the token.

3. **Copy the token** straight into the password manager item of step 2. Also note **today's date**: the token is valid for one year from today, and that date goes into the user list.

Never paste the token into Claude, an issue, a pull request, a commit, a chat message or an email. Anyone holding it can use your Claude seat.

## Step 2: hand the token over (you)

1. In the team's password manager, create a new item, for example a secure note, titled **"Claude token for GitHub: <your GitHub login>"**, with:
   - **the token**
   - **your GitHub login**, exactly as on github.com
   - **the date you created the token**, `YYYY-MM-DD`
2. **Share the item with the repository admin only.**
3. Tell the admin it is there, by chat or in person, without the token itself.

Once the admin confirms the token is stored, delete the item or stop sharing it. GitHub then holds the only copy you need: a token can always be replaced by creating a new one.

## Step 3: store the token (repository admin)

Everything is done by hand on the repository's **Settings → Secrets and variables → Actions** page: <https://github.com/attepihamaki/kirjanpito/settings/secrets/actions>. Each person needs two things there: their own secret, and an entry in the `CLAUDE_USERS` list.

1. **The secret.** On the **Secrets** tab, click **New repository secret**.
   - **Name:** `CLAUDE_TOKEN_` followed by the person's GitHub login in upper case, with `-` written as `_`. For `attepihamaki` that is `CLAUDE_TOKEN_ATTEPIHAMAKI`; for `atte-p` it would be `CLAUDE_TOKEN_ATTE_P`.
   - **Secret:** the token from the password manager, without spaces or line breaks.
2. **The list entry.** On the **Variables** tab, open `CLAUDE_USERS` (pencil icon), or create it with **New repository variable** if it does not exist yet. Add the person's entry:

   ```json
   {"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}
   ```

   The variable is a JSON list, so the entries sit between `[` and `]`, separated by commas. With two people:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2026-12-01","expires":"2027-12-01"}]
   ```

3. **Confirm** to the person that the token is stored, so they can clean up the password manager item.

The fields:

| field     | what it holds                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------- |
| `github`  | the person's GitHub login; upper or lower case does not matter                                 |
| `secret`  | the secret's name after `CLAUDE_TOKEN_`, exactly: upper-case letters, digits and `_` only      |
| `added`   | the date the person was added, `YYYY-MM-DD`; for information only                              |
| `expires` | the date the token was created plus one year, `YYYY-MM-DD`; the token reminder reads this date |

Use straight double quotes (`"`). An editor that turns them into curly quotes breaks the list, and the workflow then stops with "CLAUDE_USERS is not a JSON array". Paste the value into any JSON validator first if unsure.

To check the setup: the **Secrets** tab lists every `CLAUDE_TOKEN_<NAME>` (values are never shown), and the **Variables** tab shows `CLAUDE_USERS`. Every `secret` in the list needs a matching secret.

## Step 4: test it (you)

1. Open a new issue titled `@claude explain the structure of this project`.
2. Within a minute or two, Claude comments that it is working, then answers.
3. To see whose token was used, open the run in the **Actions** tab. Its summary says "Claude runs on <you>'s request using CLAUDE_TOKEN_<NAME>".

If Claude comments that you have no token set up, or that your secret is missing, see Troubleshooting below.

## Using Claude

- **Start a task:** open an issue with `@claude` in the title or body, or mention `@claude` in a comment on an issue. Say what should change and why, how to tell it is done, and the spec section if you know it. One issue is one change.
- **Model:** Claude runs on Sonnet. Add the `model:opus` label to the issue or pull request before mentioning `@claude` for calculations, tax rules, stored data, file formats, changes across several modules and bugs without an obvious cause. A pull request does not inherit its issue's label.
- **Questions:** when the task is unclear, Claude asks numbered questions and commits nothing. Answer in a comment that mentions `@claude`.
- **Pull requests:** Claude works on its own `claude/issue-…` branch and ends its comment with a "Create PR" link. You open the pull request when the work is worth reviewing; Claude never opens or merges one.
- **Changes after review:** mention `@claude` on the pull request: in a comment, a line comment or a review summary. Claude continues on the same branch. A mention back on the issue starts a new branch from `main` instead.
- **Reviews:** put `@claude` in the review summary only. Every line comment that mentions it starts its own run, and the summary's run sees all your line comments anyway.

## Renewing your token

A token lasts one year. From 30 days before it expires, `.github/workflows/claude-token-reminder.yml` keeps an issue titled "Claude tokens expiring soon" open, mentioning everyone who has to renew. It is updated every Monday and closes itself once every token is renewed.

1. **You:** run `claude setup-token` again and hand the new token over as in step 2.
2. **Admin:** on the **Secrets** tab, update `CLAUDE_TOKEN_<NAME>` (pencil icon) with the new token.
3. **Admin:** in `CLAUDE_USERS`, change the person's `expires` to the new token's creation date plus one year.

An entry without a valid `expires` date fails the reminder run, so it shows in the Actions tab.

## Leaving the team

On the day someone leaves, the repository admin:

1. deletes their `CLAUDE_TOKEN_<NAME>` on the **Secrets** tab,
2. deletes their entry in `CLAUDE_USERS`, together with the comma that separated it from the next one,
3. removes their access to the repository if it is no longer needed.

## Usage limits

- A run uses the limits of the person who started it, shared with their own interactive Claude use.
- When someone reaches their limit, their runs fail with the error in Claude's comment. Other people's runs are unaffected.
- Every run also uses GitHub Actions minutes.

## For an organization (later)

The same steps work on the organization's **Settings → Secrets and variables → Actions** page, with **Repository access** set to the repositories that use Claude. Keep that list complete on the secrets and on `CLAUDE_USERS` alike. A public repository such as kirjanpito keeps repository secrets; read the security note below before moving tokens to the organization.

## Security

- **Anyone who can push a branch to this repository can read every stored token.** A workflow they add on their own branch runs with the repository's secrets, and CODEOWNERS or branch protection on `main` do not prevent that. Today only the owner can push here. Before adding a collaborator, or moving the tokens to the organization, decide how to protect them: for example a GitHub Environment that only `main` can use, which also means `@claude` in pull request reviews and line comments no longer runs.
- Tokens travel only through the password manager and GitHub's secret settings, never through chat, email, issues, commits or Claude.
- Claude works on branches; people open, review and merge the pull requests.

## Troubleshooting

| Symptom                                                   | Fix                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "you have no Claude token set up"                         | Your entry is missing from `CLAUDE_USERS`, or its `github` login is misspelled. Do steps 1 to 3.             |
| "the secret `CLAUDE_TOKEN_X` is missing or not shared"    | The secret was deleted or misnamed, or an organization secret is not shared with this repository.            |
| The run fails with an authentication error                | The token has expired or been revoked: renew it.                                                             |
| The run fails with a usage or rate limit                  | That person's seat limit is reached: wait, or have someone else mention `@claude`.                           |
| The resolve job fails: "CLAUDE_USERS is not a JSON array" | A quote, comma or bracket is wrong. Check the value in a JSON validator and fix it.                          |
| Nothing happens at all                                    | You have no write access, the workflow is not on `main`, Actions are disabled, or the Claude GitHub App has no access to the repository. |
