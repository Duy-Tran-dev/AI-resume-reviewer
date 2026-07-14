# Fix: docker-entrypoint.sh crash-loops on Windows checkouts (CRLF line endings)

**Type:** Fix
**Status:** complete

## The problem

`docker compose up` crash-looped the `app` container:

```
exec ./docker-entrypoint.sh: no such file or directory
```

This is the classic symptom of a shell script with CRLF line endings: the
kernel reads the shebang line as `#!/bin/sh\r`, which doesn't resolve to a real
interpreter, so `exec` fails with "no such file or directory" even though the
file plainly exists.

Confirmed root cause: this repo had no `.gitattributes`, and this machine's
Git for Windows has `core.autocrlf=true` (the common default), which silently
rewrites LF to CRLF on checkout for any text file. `docker-entrypoint.sh` was
authored with LF and worked the first time (before it had gone through a git
checkout as a committed file); after the dockerize fix was committed and
merged, a later checkout normalized it to CRLF, breaking the container. `git
add` had already warned about this ("LF will be replaced by CRLF") when the
file was staged, but the warning is easy to miss and describes normal default
Git-for-Windows behavior, not a bug in git.

This was a real correctness gap in the dockerize fix, not a one-off local
accident: anyone cloning this repo on Windows with default Git settings would
hit the same crash loop.

## The fix

- Added `.gitattributes` forcing LF for the files that run as scripts inside
  Linux containers or execute as build tooling, regardless of the
  checking-out platform's line-ending settings:
  - `docker-entrypoint.sh text eol=lf`
  - `Dockerfile text eol=lf`, `.dockerignore text eol=lf`
- Re-normalized the currently-checked-out `docker-entrypoint.sh` to LF on disk.
- **Defense in depth in the `Dockerfile` itself:** strip any `\r` from
  `docker-entrypoint.sh` at image-build time (`sed -i 's/\r$//'`) before
  `chmod +x`, so the image is correct even if a future contributor's local git
  config, editor, or a merge tool reintroduces CRLF.

**Must not break:** everything already verified in the dockerize fix - the
image still builds, migrations still run at startup, and the standalone
server still serves traffic.

## Build steps

- [x] 1. Add `.gitattributes`, re-normalize `docker-entrypoint.sh` to LF on disk, and add the `sed` line-ending strip to the `Dockerfile`'s runner stage before `chmod +x`.

## Verify

- Rebuilt and restarted the compose stack: `app` container stayed `Up` (not
  restarting), logs showed `No pending migrations to apply` and a clean
  server start, `curl localhost:3000/` returned `HTTP 200`.
- Exec'd into the running container and dumped the entrypoint's raw bytes:
  only `\n`, no `\r` - confirms the Dockerfile-level fix works independent of
  the `.gitattributes` rule.
