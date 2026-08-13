import { detectBinary } from "./binary.js";
import { fetchHeader } from "./github.js";
import { archOf, kindOf, platformOf, versionTokens } from "./names.js";
import type { Arch, AssetAnalysis, Finding, Policy, Release, Report } from "./types.js";

const checksumPattern = /(sha(?:sum)?s?[-_]?256|checksums?)(?:\.|-|_|$)/i;

export async function analyze(release: Release, policy: Policy): Promise<Report> {
  const findings: Finding[] = [];
  const checksumAssets = release.assets.filter((asset) => checksumPattern.test(asset.name));
  if (!release.assets.length) findings.push({ rule: "assets-present", level: "error", message: "Release has no downloadable assets." });
  if (release.draft) findings.push({ rule: "published-release", level: "error", message: "Release is still a draft." });
  if (release.prerelease && !policy.allowPrerelease) findings.push({ rule: "prerelease", level: "error", message: "Prereleases are not allowed by policy." });
  if (policy.requireChecksums && !checksumAssets.length) findings.push({ rule: "checksums", level: "error", message: "No SHA-256 checksum manifest found." });
  else if (checksumAssets.length) findings.push({ rule: "checksums", level: "pass", message: `Found ${checksumAssets.length} checksum manifest${checksumAssets.length === 1 ? "" : "s"}.` });

  const platforms = new Set(release.assets.map((asset) => platformOf(asset.name)));
  for (const platform of policy.requiredPlatforms) {
    findings.push(platforms.has(platform)
      ? { rule: "platform-coverage", level: "pass", message: `${platform} asset is present.` }
      : { rule: "platform-coverage", level: "error", message: `Required ${platform} asset is missing.` });
  }

  const analyses: AssetAnalysis[] = await Promise.all(release.assets.map(async (asset) => {
    const platform = platformOf(asset.name), declaredArch = archOf(asset.name), kind = kindOf(asset.name);
    const local: Finding[] = [];
    if (asset.size === 0) local.push({ rule: "non-empty", level: "error", asset: asset.name, message: "Asset is empty." });
    else local.push({ rule: "non-empty", level: "pass", asset: asset.name, message: "Asset is non-empty." });
    if (asset.size > policy.maxAssetBytes) local.push({ rule: "asset-size", level: "warning", asset: asset.name, message: "Asset exceeds configured maximum size.", evidence: String(asset.size) });
    if (policy.requireVersionInAssets && kind !== "checksums" && !versionTokens(release.tag).some((token) => asset.name.toLowerCase().includes(token))) {
      local.push({ rule: "version-name", level: "warning", asset: asset.name, message: `Asset name does not include release version ${release.tag}.` });
    }
    let detectedArch: Arch = "unknown";
    if (["exe", "appimage"].includes(kind) && asset.size > 0) {
      try {
        const detected = detectBinary(await fetchHeader(asset));
        detectedArch = detected.arch;
        if (declaredArch !== "unknown" && detected.arch !== "unknown" && declaredArch !== detected.arch) local.push({ rule: "architecture", level: "error", asset: asset.name, message: `Filename says ${declaredArch}, binary says ${detected.arch}.`, evidence: detected.kind });
        else if (detected.arch !== "unknown") local.push({ rule: "architecture", level: "pass", asset: asset.name, message: `Detected ${detected.arch} binary.`, evidence: detected.kind });
      } catch (error) { local.push({ rule: "download", level: "warning", asset: asset.name, message: "Could not inspect binary header.", evidence: error instanceof Error ? error.message : String(error) }); }
    }
    findings.push(...local);
    return { asset, platform, declaredArch, detectedArch, kind, findings: local };
  }));

  const summary = { pass: findings.filter((x) => x.level === "pass").length, warning: findings.filter((x) => x.level === "warning").length, error: findings.filter((x) => x.level === "error").length };
  const weighted = summary.error * 18 + summary.warning * 5;
  const score = Math.max(0, 100 - weighted);
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), release, policy, score, summary, findings, assets: analyses, conclusion: summary.error ? "fail" : summary.warning ? "warning" : "pass" };
}
