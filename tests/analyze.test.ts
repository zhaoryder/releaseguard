import assert from "node:assert/strict";
import { createServer } from "node:http";
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

test("recognizes SHA256SUMS manifests", async () => {
  const release: Release = { repository: "acme/app", tag: "v1.2.0", name: "1.2.0", url: "https://example.test", draft: false, prerelease: false, publishedAt: null, assets: [{ name: "SHA256SUMS.txt", size: 42, url: "https://example.test/checksums" }] };
  const report = await analyze(release, { ...defaultPolicy, requireChecksums: true });
  assert(report.findings.some((item) => item.rule === "checksums" && item.level === "pass"));
  assert(!report.findings.some((item) => item.rule === "checksums" && item.level === "error"));
});

test("does not reject an x86 NSIS installer stub for an x64 package", async (t) => {
  const server = createServer((_request, response) => {
    const pe = new Uint8Array(160);
    pe[0] = 0x4d; pe[1] = 0x5a;
    new DataView(pe.buffer).setUint32(0x3c, 128, true);
    pe[128] = 0x50; pe[129] = 0x45;
    new DataView(pe.buffer).setUint16(132, 0x14c, true);
    response.writeHead(206, { "Content-Range": `bytes 0-${pe.length - 1}/${pe.length}`, "Content-Length": pe.length });
    response.end(pe);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  const release: Release = { repository: "acme/app", tag: "v1.2.0", name: "1.2.0", url: "https://example.test", draft: false, prerelease: false, publishedAt: null, assets: [{ name: "ReleaseGuard-1.2.0-win-x64.exe", size: 160, url: `http://127.0.0.1:${address.port}/installer` }] };
  const report = await analyze(release, { ...defaultPolicy, requireChecksums: false });
  const architecture = report.findings.find((item) => item.rule === "architecture");
  assert.equal(architecture?.level, "warning");
  assert.match(architecture?.message ?? "", /Installer stub/);
});
