# Launch kit

Use the message that fits the community. Do not cross-post all versions at once or ask for stars without asking for feedback.

## Hacker News

**Title:** Show HN: ReleaseGuard – check whether GitHub Release downloads are actually ready

I kept seeing release workflows go green while the files users downloaded were incomplete or mislabeled: a missing platform, an arm64 filename around an x64 binary, stale version numbers, or no checksums.

ReleaseGuard checks the published GitHub Release rather than the build directory. It currently verifies asset coverage, names, versions, sizes, checksum manifests, and PE/ELF architectures, then produces a terminal, JSON, or standalone HTML report.

It found a useful contrast on its first real run: GitHub CLI v2.97.0 scored 100/100, while bat v0.26.1 scored 82 because its Release had no SHA-256 manifest. That score is about release hygiene, not project security.

No telemetry, no model calls, and it never executes downloaded installers.

Try it from npm: `npx --yes releaseguard check sharkdp/bat`

Repo: https://github.com/zhaoryder/releaseguard
Online demo: https://releaseguard.vercel.app/

I’d especially like feedback from people shipping DMG, EXE, AppImage, DEB, or RPM assets. Which post-build failure has bitten your users?

## Reddit / developer communities

**Title:** CI passed. Did your downloads? I made a quality gate for GitHub Releases

ReleaseGuard inspects the files users actually download and catches missing platforms, stale version names, empty assets, absent checksums, and architecture mismatches.

```bash
npx --yes releaseguard check owner/repo
```

It’s read-only, local, and doesn’t execute installers. The first real comparison was GitHub CLI at 100/100 versus bat at 82/100 because the latter had no SHA-256 manifest attached at scan time.

I’m looking for real ugly Release examples to turn into regression fixtures. I’m the author, and I’ll disclose that when posting: https://github.com/zhaoryder/releaseguard

## X / short post

CI passed. The arm64 download was x64.

So I built ReleaseGuard: a quality gate for the files in GitHub Releases—not the files you meant to upload.

Checks platforms, versions, architecture labels, empty assets and checksums. Generates a shareable report. Read-only; never runs installers.

https://github.com/zhaoryder/releaseguard

Install: `npx --yes releaseguard check owner/repo`

## Direct maintainer message

Hi — I’m testing a small open-source Release quality checker and used your public Release as a compatibility sample. It only reads metadata and bounded binary headers; it does not execute or upload anything.

If the result looks wrong, I’d value a bug report. I won’t open an issue on your repo just to promote the tool: https://github.com/zhaoryder/releaseguard
