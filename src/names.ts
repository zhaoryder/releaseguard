import type { Arch, Platform } from "./types.js";

export function platformOf(name: string): Platform {
  const n = name.toLowerCase();
  if (/\.(dmg|pkg)$|(?:^|[-_.])(mac|macos|darwin)(?:[-_.]|$)/.test(n)) return "macos";
  if (/\.(exe|msi|msix)$|(?:^|[-_.])(win|windows|win32)(?:[-_.]|$)/.test(n)) return "windows";
  if (/\.(appimage|deb|rpm|snap)$|(?:^|[-_.])linux(?:[-_.]|$)/.test(n)) return "linux";
  if (/\.(apk|aab)$|(?:^|[-_.])android(?:[-_.]|$)/.test(n)) return "android";
  return "other";
}

export function archOf(name: string): Arch {
  const n = name.toLowerCase();
  if (/(?:^|[-_.])(universal|universal2|fat)(?:[-_.]|$)/.test(n)) return "universal";
  if (/(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(n)) return "arm64";
  if (/(?:^|[-_.])(armv[67]|armhf)(?:[-_.]|$)/.test(n)) return "armv7";
  if (/(?:^|[-_.])(x86_64|x86-64|amd64|x64)(?:[-_.]|$)/.test(n)) return "x64";
  if (/(?:^|[-_.])(ia32|386|i386|i686|x86|win32)(?:[-_.]|$)/.test(n)) return "x86";
  return "unknown";
}

export function kindOf(name: string): string {
  const lower = name.toLowerCase();
  const known = [".tar.gz", ".tar.xz", ".appimage", ".dmg", ".pkg", ".exe", ".msi", ".msix", ".deb", ".rpm", ".zip", ".apk", ".aab"];
  return known.find((suffix) => lower.endsWith(suffix))?.slice(1) ?? (lower.includes("checksum") || lower.includes("sha256") ? "checksums" : "other");
}

export function versionTokens(tag: string): string[] {
  const raw = tag.replace(/^v/i, "");
  return [...new Set([tag.toLowerCase(), raw.toLowerCase()])].filter(Boolean);
}
