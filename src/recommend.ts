import { archOf, kindOf, platformOf } from "./names.js";
import type { Arch, Asset, Platform, Recommendation } from "./types.js";

const installKinds: Record<Platform, string[]> = { macos: ["dmg", "pkg", "zip"], windows: ["exe", "msi", "msix", "zip"], linux: ["appimage", "deb", "rpm", "snap", "tar.gz", "tar.xz"], android: ["apk", "aab"], other: ["zip", "tar.gz", "tar.xz"] };

export function hostPlatform(platform: string = process.platform): Platform {
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  if (platform === "linux") return "linux";
  return "other";
}

export function hostArch(arch: string = process.arch): Arch {
  if (["arm64", "aarch64"].includes(arch)) return "arm64";
  if (["x64", "amd64"].includes(arch)) return "x64";
  if (["ia32", "x86", "i386"].includes(arch)) return "x86";
  return "unknown";
}

export function resolvePlatform(value?: string): Platform {
  if (value === "macos" || value === "darwin") return "macos";
  if (value === "windows" || value === "win32") return "windows";
  if (value === "linux") return "linux";
  if (value === "android") return "android";
  return hostPlatform(value);
}

export function resolveArch(value?: string): Arch {
  if (value === "x64" || value === "amd64") return "x64";
  if (value === "arm64" || value === "aarch64") return "arm64";
  if (value === "x86" || value === "ia32" || value === "i386") return "x86";
  if (value === "armv7" || value === "armhf") return "armv7";
  return hostArch(value);
}

function score(asset: Asset, platform: Platform, arch: Arch): number {
  const assetPlatform = platformOf(asset.name);
  if (assetPlatform !== platform) return -1;
  const declared = archOf(asset.name);
  const kind = kindOf(asset.name);
  const kinds = installKinds[platform];
  let value = kinds.indexOf(kind) >= 0 ? 40 - kinds.indexOf(kind) * 3 : 0;
  if (declared === arch) value += 60;
  else if (declared === "universal" && platform === "macos") value += 55;
  else if (declared === "unknown") value += 20;
  else value -= 45;
  return value;
}

export function recommendAsset(assets: Asset[], platform: Platform, arch: Arch): Recommendation {
  const candidates = assets.filter((asset) => platformOf(asset.name) === platform && kindOf(asset.name) !== "checksums");
  const ranked = candidates.map((asset) => ({ asset, value: score(asset, platform, arch) })).sort((a, b) => b.value - a.value || a.asset.name.localeCompare(b.asset.name));
  const best = ranked[0];
  if (!best || best.value < 0) return { platform, arch, asset: null, alternatives: [], confidence: "none", reason: `No downloadable ${platform} asset was detected.` };
  const declared = archOf(best.asset.name);
  const confidence = declared === arch ? "exact" : declared === "universal" ? "universal" : "fallback";
  const reason = confidence === "exact" ? `Matches your ${platform} ${arch} runtime.` : confidence === "universal" ? `Universal build should run on both macOS architectures.` : `No exact ${platform} ${arch} build was found; this is the safest available fallback.`;
  return { platform, arch, asset: best.asset, alternatives: ranked.slice(1).map((entry) => entry.asset), confidence, reason };
}
