export type Level = "pass" | "warning" | "error";
export type Platform = "macos" | "windows" | "linux" | "android" | "other";
export type Arch = "x64" | "arm64" | "x86" | "armv7" | "universal" | "unknown";

export interface Asset { name: string; size: number; url: string; contentType?: string; downloadCount?: number; }
export interface Release { repository: string; tag: string; name: string; url: string; draft: boolean; prerelease: boolean; publishedAt: string | null; assets: Asset[]; }
export interface Finding { rule: string; level: Level; message: string; asset?: string; evidence?: string; }
export interface AssetAnalysis { asset: Asset; platform: Platform; declaredArch: Arch; detectedArch: Arch; kind: string; findings: Finding[]; }
export interface Policy { requiredPlatforms: Platform[]; requireChecksums: boolean; requireVersionInAssets: boolean; maxAssetBytes: number; allowPrerelease: boolean; }
export interface Report { schemaVersion: 1; generatedAt: string; release: Release; policy: Policy; score: number; summary: Record<Level, number>; findings: Finding[]; assets: AssetAnalysis[]; conclusion: "pass" | "warning" | "fail"; }
