# Claude on GitHub: setup guide

Mention `@claude` in an issue, a comment on an issue or pull request, or a pull request review, and Claude answers or makes the change. Each run uses the **Claude token of the person who mentioned `@claude`**, so it counts against that person's own Claude plan. There is no shared API key and no shared token: someone without their own token gets a comment pointing here, and Claude does not run.

This guide covers everything from creating your token to using Claude, renewing the token and stopping. How the workflow itself behaves is in `CLAUDE.md` §2d.

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

- **A Claude account on a plan that includes Claude Code**, such as Pro or Max. The token is tied to your account, and every run uses your plan's limits.
- **A GitHub account with write access** to this repository. The repository owner adds you as a collaborator.
- **A safe way to hand the token to the repository owner**, such as a password manager you both use or an end-to-end encrypted message.

The **repository owner**, `attepihamaki`, stores the tokens and edits the user list. Only the owner can change a repository's secrets and variables.

## Setup at a glance

| Step | Who                  | What                                         | Time          |
| ---- | -------------------- | -------------------------------------------- | ------------- |
| 1    | you                  | Create your Claude token                     | 2 minutes     |
| 2    | you                  | Hand it to the repository owner safely       | 1 minute      |
| 3    | the repository owner | Store the token and add you to the user list | 2 minutes     |
| 4    | you                  | Test with an issue that mentions `@claude`   | a few minutes |

If you are the repository owner setting up your own token, do steps 1, 3 and 4 and skip the handover.

## Step 1: create your Claude token (you)

1. **Install Claude Code** if you don't have the command-line tool yet:

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Create the token:**

   ```bash
   claude setup-token
   ```

   A browser window opens. Sign in with the **Claude account whose plan the runs should use**. When you approve, the terminal prints the token.

3. **Copy the token** straight into wherever you hand it over in step 2. Also note **today's date**: the token is valid for one year from today, and that date goes into the user list.

Never paste the token into Claude, an issue, a pull request, a commit, a chat message or an email. Anyone holding it can use your Claude plan.

## Step 2: hand the token over (you)

1. Send the repository owner, through a safe channel such as a shared password manager item or an end-to-end encrypted message:
   - **the token**
   - **your GitHub login**, exactly as on github.com
   - **the date you created the token**, `YYYY-MM-DD`
2. Never use ordinary chat, email, an issue or a commit for the token itself.

Once the owner confirms the token is stored, delete the item or the message. GitHub then holds the only copy you need: a token can always be replaced by creating a new one.

## Step 3: store the token (repository owner)

The owner adds the person's secret `CLAUDE_TOKEN_<NAME>` and their entry in `CLAUDE_USERS`, then confirms to the person that the token is stored, so they can delete the handover item or message. The exact steps, with examples, are in "For the repository owner" below.

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
2. **Owner:** replace the secret and update `expires`, as in "Renewing a token" below.

An entry without a valid `expires` date fails the reminder run, so it shows in the Actions tab.

## Stopping

When someone no longer works on the repository, the repository owner removes their secret and list entry, as in "Removing a person" below, and removes their access to the repository if it is no longer needed.

## For the repository owner

Everything is done by hand on the repository's **Settings → Secrets and variables → Actions** page: <https://github.com/attepihamaki/kirjanpito/settings/secrets/actions>. Each person needs exactly two things there:

1. a **secret** `CLAUDE_TOKEN_<NAME>` holding their token, on the **Secrets** tab, and
2. an **entry** in the variable `CLAUDE_USERS`, on the **Variables** tab, that maps their GitHub login to that secret and records when the token expires.

The workflow finds the person in `CLAUDE_USERS` and reads the secret named there. If either is missing or the names do not match, Claude does not run for that person and comments why.

### The secret name

`CLAUDE_TOKEN_` followed by the person's GitHub login in upper case, with `-` written as `_`:

| GitHub login   | secret name                   | `secret` value in `CLAUDE_USERS` |
| -------------- | ----------------------------- | -------------------------------- |
| `attepihamaki` | `CLAUDE_TOKEN_ATTEPIHAMAKI`   | `ATTEPIHAMAKI`                   |
| `atte-p`       | `CLAUDE_TOKEN_ATTE_P`         | `ATTE_P`                         |
| `Maria-Dev2`   | `CLAUDE_TOKEN_MARIA_DEV2`     | `MARIA_DEV2`                     |

Only upper-case letters, digits and `_` are allowed in a secret name.

### The CLAUDE_USERS fields

`CLAUDE_USERS` is a JSON list with one entry per person:

```json
{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}
```

| field     | what it holds                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------- |
| `github`  | the person's GitHub login; upper or lower case does not matter                                 |
| `secret`  | the secret's name after `CLAUDE_TOKEN_`, exactly                                               |
| `added`   | the date the person was added, `YYYY-MM-DD`; for information only                              |
| `expires` | the date the token was created plus one year, `YYYY-MM-DD`; the token reminder reads this date |

Write the whole value on one line, with straight double quotes (`"`). An editor that turns them into curly quotes breaks the list, and the workflow then stops with "CLAUDE_USERS is not a JSON array". Paste the value into any JSON validator first if unsure.

### Adding the first person

The person `attepihamaki` created their token on 2026-11-20.

1. **Secrets** tab → **New repository secret**:
   - **Name:** `CLAUDE_TOKEN_ATTEPIHAMAKI`
   - **Secret:** the token the person handed over, without spaces or line breaks
   - **Add secret**
2. **Variables** tab → **New repository variable**:
   - **Name:** `CLAUDE_USERS`
   - **Value:**

     ```json
     [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}]
     ```

   - **Add variable**
3. Tell the person their token is stored.

### Adding another person

The person `atte-p` created their token on 2026-12-01.

1. **Secrets** tab → **New repository secret**: name `CLAUDE_TOKEN_ATTE_P`, the token as the secret.
2. **Variables** tab → the pencil icon next to `CLAUDE_USERS`. Add the new entry before the closing `]`, separated from the previous one by a comma.

   Before:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}]
   ```

   After:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2026-12-01","expires":"2027-12-01"}]
   ```

3. **Update variable**, and tell the person their token is stored.

### Renewing a token

`atte-p` created a new token on 2027-11-25.

1. **Secrets** tab → the pencil icon next to `CLAUDE_TOKEN_ATTE_P` → paste the new token → **Update secret**. The name stays the same.
2. **Variables** tab → the pencil icon next to `CLAUDE_USERS` → change only that person's `expires` (and `added`, if you like):

   Before:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2026-12-01","expires":"2027-12-01"}]
   ```

   After:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2027-11-25","expires":"2028-11-25"}]
   ```

### Removing a person

`atte-p` no longer works on the repository.

1. **Secrets** tab → the trash icon next to `CLAUDE_TOKEN_ATTE_P` → confirm.
2. **Variables** tab → the pencil icon next to `CLAUDE_USERS` → delete the person's entry together with the comma before it:

   Before:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"},{"github":"atte-p","secret":"ATTE_P","added":"2026-12-01","expires":"2027-12-01"}]
   ```

   After:

   ```json
   [{"github":"attepihamaki","secret":"ATTEPIHAMAKI","added":"2026-11-20","expires":"2027-11-20"}]
   ```

If the last person is removed, the value is `[]`.

### Checking the setup

- The **Secrets** tab lists every `CLAUDE_TOKEN_<NAME>`; values are never shown.
- The **Variables** tab shows `CLAUDE_USERS`. Every `secret` in it needs a secret named `CLAUDE_TOKEN_` plus that value, and every secret should have an entry.
- After the person's first `@claude`, the run's summary in the **Actions** tab says "Claude runs on <login>'s request using CLAUDE_TOKEN_<NAME>".

## Usage limits

- A run uses the limits of the person who started it, shared with their own interactive Claude use.
- When someone reaches their limit, their runs fail with the error in Claude's comment. Other people's runs are unaffected.
- Every run also uses GitHub Actions minutes.

## Security

- **Every collaborator who can push a branch to this repository can read every stored token.** A workflow they add on their own branch runs with the repository's secrets, and CODEOWNERS or branch protection on `main` do not prevent that. Give push access only to people you would trust with your token. If that ever stops being enough, a GitHub Environment that only `main` can use protects the tokens, at the cost of `@claude` no longer running from pull request reviews and line comments.
- Tokens travel only through a safe handover channel and GitHub's secret settings, never through ordinary chat, email, issues, commits or Claude.
- Claude works on branches; people open, review and merge the pull requests.

## Troubleshooting

| Symptom                                                   | Fix                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "you have no Claude token set up"                         | Your entry is missing from `CLAUDE_USERS`, or its `github` login is misspelled. Do steps 1 to 3.             |
| "the secret `CLAUDE_TOKEN_X` is missing"                  | The secret was deleted, or its name does not match the `secret` value in `CLAUDE_USERS`.                     |
| The run fails with an authentication error                | The token has expired or been revoked: renew it.                                                             |
| The run fails with a usage or rate limit                  | That person's plan limit is reached: wait, or have someone else mention `@claude`.                           |
| The resolve job fails: "CLAUDE_USERS is not a JSON array" | A quote, comma or bracket is wrong. Check the value in a JSON validator and fix it.                          |
| Nothing happens at all                                    | You have no write access, the workflow is not on `main`, Actions are disabled, or the Claude GitHub App has no access to the repository. |
