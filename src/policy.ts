import { readFile } from "node:fs/promises";
import YAML from "yaml";
import type { Platform, Policy } from "./types.js";

export const defaultPolicy: Policy = { requiredPlatforms: [], requireChecksums: true, requireVersionInAssets: true, maxAssetBytes: 1_073_741_824, allowPrerelease: true };

export async function loadPolicy(path?: string): Promise<Policy> {
  if (!path) return defaultPolicy;
  const data = YAML.parse(await readFile(path, "utf8")) as Partial<Policy>;
  const platforms = data.requiredPlatforms ?? defaultPolicy.requiredPlatforms;
  const valid: Platform[] = ["macos", "windows", "linux", "android", "other"];
  if (!platforms.every((item) => valid.includes(item))) throw new Error("requiredPlatforms contains an unknown platform.");
  return { ...defaultPolicy, ...data, requiredPlatforms: platforms };
}
