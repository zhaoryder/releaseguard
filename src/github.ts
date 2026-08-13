import type { Asset, Release } from "./types.js";

export function parseTarget(value: string): { repository: string; tag?: string } {
  const cleaned = value.replace(/^https?:\/\/github\.com\//, "").replace(/\/releases\/tag\//, "@").replace(/\.git$/, "").replace(/\/$/, "");
  const [repository, tag] = cleaned.split("@", 2);
  if (!repository || repository.split("/").length !== 2) throw new Error("Expected owner/repo, owner/repo@tag, or a GitHub release URL.");
  return tag ? { repository, tag } : { repository };
}

export async function fetchRelease(target: string, token = process.env.GITHUB_TOKEN): Promise<Release> {
  const { repository, tag } = parseTarget(target);
  const endpoint = `https://api.github.com/repos/${repository}/releases/${tag ? `tags/${encodeURIComponent(tag)}` : "latest"}`;
  const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json", "User-Agent": "releaseguard/0.1.0", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (response.status === 404) throw new Error(`No accessible ${tag ? `release ${tag}` : "latest release"} found for ${repository}.`);
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
  const data = await response.json() as Record<string, unknown>;
  const assets = (data.assets as Array<Record<string, unknown>>).map((asset): Asset => ({ name: String(asset.name), size: Number(asset.size), url: String(asset.browser_download_url), contentType: String(asset.content_type ?? ""), downloadCount: Number(asset.download_count ?? 0) }));
  return { repository, tag: String(data.tag_name), name: String(data.name || data.tag_name), url: String(data.html_url), draft: Boolean(data.draft), prerelease: Boolean(data.prerelease), publishedAt: data.published_at ? String(data.published_at) : null, assets };
}

export async function fetchHeader(asset: Asset, maxBytes = 1_048_576): Promise<Uint8Array> {
  const end = Math.min(asset.size, maxBytes) - 1;
  if (end < 0) return new Uint8Array();
  const response = await fetch(asset.url, { headers: { Range: `bytes=0-${end}`, "User-Agent": "releaseguard/0.1.0" }, redirect: "follow" });
  if (!response.ok && response.status !== 206) throw new Error(`Download failed (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}
