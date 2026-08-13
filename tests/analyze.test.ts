import assert from "node:assert/strict";
import test from "node:test";
import { analyze } from "../src/analyze.js";
import { defaultPolicy } from "../src/policy.js";
import type { Release } from "../src/types.js";

test("flags missing checksums and required platforms", async () => {
  const release: Release = { repository: "acme/app", tag: "v1.2.0", name: "1.2.0", url: "https://example.test", draft: false, prerelease: false, publishedAt: null, assets: [{ name: "app-1.2.0-linux-x64.tar.gz", size: 42, url: "https://example.test/app" }] };
  const report = await analyze(release, { ...defaultPolicy, requiredPlatforms: ["linux", "macos"] });
  assert.equal(report.conclusion, "fail");
  assert(report.findings.some((item) => item.rule === "checksums" && item.level === "error"));
  assert(report.findings.some((item) => item.message.includes("macos asset is missing")));
});
