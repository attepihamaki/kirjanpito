#!/usr/bin/env bash
# Manages the per-person Claude tokens of the Claude workflow (CLAUDE.md §2d).
#
# Each person's token from `claude setup-token` is the secret
# CLAUDE_TOKEN_<SUFFIX>. The CLAUDE_USERS variable maps a GitHub login to that
# suffix and records when the token was added and when it expires; the
# workflow reads the mapping, and the token reminder reads the expiry dates.
# Requires gh, signed in as a repository admin (organization admin for --org),
# and jq.
#
# Usage:
#   scripts/claude-users.sh add    <github-login> [--suffix NAME] [--expires YYYY-MM-DD] <target>
#   scripts/claude-users.sh remove <github-login> <target>
#   scripts/claude-users.sh list   <target>
#
# Target, one of:
#   -R owner/repo              repository secret and variable
#   --org ORG [--repos r1,r2]  organization secret and variable, shared with
#                              exactly the given repositories (without
#                              --repos: all private repositories)
#
# `add` replaces an existing token and entry, so it also renews. The expiry
# date defaults to 365 days from today, the lifetime of a new token; pass
# --expires for a token created earlier. The token is read from the terminal
# without echo, or from standard input when piped, so it never reaches the
# shell history or the screen.
set -euo pipefail

die() {
  echo "error: $*" >&2
  exit 1
}
usage() {
  sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
}

command -v gh >/dev/null || die "gh (GitHub CLI) is required"
command -v jq >/dev/null || die "jq is required"

cmd="${1:-}"
shift || true
login="" suffix="" expires="" repo="" org="" repos=""

if [ "$cmd" = add ] || [ "$cmd" = remove ]; then
  login="${1:-}"
  shift || true
  [ -n "$login" ] || die "GitHub login missing"
  [[ "$login" =~ ^[A-Za-z0-9-]+$ ]] || die "invalid GitHub login: $login"
fi

while [ $# -gt 0 ]; do
  case "$1" in
    -R | --repo) repo="${2:?-R needs owner/repo}"; shift 2 ;;
    --org) org="${2:?--org needs a name}"; shift 2 ;;
    --repos) repos="${2:?--repos needs a list}"; shift 2 ;;
    --suffix) suffix="${2:?--suffix needs a name}"; shift 2 ;;
    --expires) expires="${2:?--expires needs a date}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

case "$cmd" in
  add | remove | list) ;;
  *) usage; exit 1 ;;
esac

[ -n "$repo" ] || [ -n "$org" ] || die "give a target: -R owner/repo or --org ORG"
[ -z "$repo" ] || [ -z "$org" ] || die "use either -R or --org, not both"

# `share` is empty for a repository, and bash 3.2 (macOS) treats an empty array as unset under `set -u`, hence ${share[@]+...}.
if [ -n "$repo" ]; then
  target=(--repo "$repo")
  share=()
else
  target=(--org "$org")
  if [ -n "$repos" ]; then
    share=(--visibility selected --repos "$repos")
  else
    share=(--visibility private)
  fi
fi

get_users() {
  local v
  v="$(gh variable get CLAUDE_USERS "${target[@]}" 2>/dev/null || true)"
  if [ -z "$v" ]; then
    echo "[]"
  else
    jq -ce 'if type == "array" then . else error("not an array") end' <<<"$v" 2>/dev/null ||
      die "CLAUDE_USERS is not a JSON array"
  fi
}

set_users() {
  gh variable set CLAUDE_USERS "${target[@]}" ${share[@]+"${share[@]}"} --body "$1" >/dev/null
}

case "$cmd" in
  add)
    [ -n "$suffix" ] || suffix="$(tr '[:lower:]-' '[:upper:]_' <<<"$login")"
    [[ "$suffix" =~ ^[A-Z0-9_]+$ ]] || die "the suffix must be A-Z, 0-9 and _ (got: $suffix)"

    today="$(date -u +%F)"
    if [ -n "$expires" ]; then
      [[ "$expires" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "--expires must be YYYY-MM-DD (got: $expires)"
    else
      expires="$(date -u -d '+365 days' +%F 2>/dev/null || date -u -v+365d +%F)"
    fi

    # Read the list first, so an unreadable CLAUDE_USERS stops before the secret is written.
    current="$(get_users)"

    if [ -t 0 ]; then
      read -r -s -p "Paste the Claude token for $login (from 'claude setup-token'): " token
      echo
    else
      read -r token || true
    fi
    token="$(tr -d '[:space:]' <<<"$token")"
    [ -n "$token" ] || die "empty token"

    printf '%s' "$token" | gh secret set "CLAUDE_TOKEN_${suffix}" "${target[@]}" ${share[@]+"${share[@]}"}
    unset token

    users="$(jq -c --arg g "$login" --arg s "$suffix" --arg a "$today" --arg e "$expires" '
      map(select((.github // "" | ascii_downcase) != ($g | ascii_downcase)))
      + [{github: $g, secret: $s, added: $a, expires: $e}]
      | sort_by(.github | ascii_downcase)' <<<"$current")"
    set_users "$users"
    echo "Added $login: secret CLAUDE_TOKEN_${suffix}, expires $expires."
    ;;

  remove)
    users="$(get_users)"
    suffix="$(jq -r --arg g "$login" '
      map(select((.github // "" | ascii_downcase) == ($g | ascii_downcase)))
      | first | .secret // empty' <<<"$users")"
    [ -n "$suffix" ] || die "$login is not in CLAUDE_USERS"
    gh secret delete "CLAUDE_TOKEN_${suffix}" "${target[@]}" ||
      echo "warning: the secret CLAUDE_TOKEN_${suffix} was not found" >&2
    set_users "$(jq -c --arg g "$login" 'map(select((.github // "" | ascii_downcase) != ($g | ascii_downcase)))' <<<"$users")"
    echo "Removed $login and the secret CLAUDE_TOKEN_${suffix}."
    ;;

  list)
    get_users | jq -r '
      if length == 0 then "No Claude users configured."
      else (["GITHUB", "SECRET", "ADDED", "EXPIRES"] | @tsv),
           (.[] | [.github, "CLAUDE_TOKEN_\(.secret)", (.added // "-"), (.expires // "-")] | @tsv)
      end' | if command -v column >/dev/null; then column -t -s $'\t'; else cat; fi
    ;;
esac
