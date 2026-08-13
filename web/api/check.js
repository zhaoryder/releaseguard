const PLATFORM_EXTENSIONS = {
  macos: ["dmg", "pkg", "zip"],
  windows: ["exe", "msi", "msix", "zip"],
  linux: ["appimage", "deb", "rpm", "snap", "tar.gz", "tar.xz"],
  other: ["zip", "tar.gz", "tar.xz"],
};

function platformOf(name) {
  const n = name.toLowerCase();
  if (/\.(dmg|pkg)$|(?:^|[-_.])(mac|macos|darwin)(?:[-_.]|$)/.test(n)) return "macos";
  if (/\.(exe|msi|msix)$|(?:^|[-_.])(win|windows|win32)(?:[-_.]|$)/.test(n)) return "windows";
  if (/\.(appimage|deb|rpm|snap)$|(?:^|[-_.])linux(?:[-_.]|$)/.test(n)) return "linux";
  if (/\.(apk|aab)$|(?:^|[-_.])android(?:[-_.]|$)/.test(n)) return "android";
  return "other";
}

function archOf(name) {
  const n = name.toLowerCase();
  if (/(?:^|[-_.])(universal|universal2|fat)(?:[-_.]|$)/.test(n)) return "universal";
  if (/(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(n)) return "arm64";
  if (/(?:^|[-_.])(armv[67]|armhf)(?:[-_.]|$)/.test(n)) return "armv7";
  if (/(?:^|[-_.])(x86_64|x86-64|amd64|x64)(?:[-_.]|$)/.test(n)) return "x64";
  if (/(?:^|[-_.])(ia32|386|i386|i686|x86|win32)(?:[-_.]|$)/.test(n)) return "x86";
  return "unknown";
}

function kindOf(name) {
  const n = name.toLowerCase();
  return [".tar.gz", ".tar.xz", ".appimage", ".dmg", ".pkg", ".exe", ".msi", ".msix", ".deb", ".rpm", ".zip", ".apk", ".aab"].find((suffix) => n.endsWith(suffix))?.slice(1) || (n.includes("checksum") || n.includes("sha256") ? "checksums" : "other");
}

function recommend(assets, userAgent, requestedPlatform, requestedArch) {
  const ua = String(userAgent || "").toLowerCase();
  const platform = requestedPlatform || (ua.includes("mac") ? "macos" : ua.includes("win") ? "windows" : ua.includes("linux") ? "linux" : "other");
  const arch = requestedArch || (ua.includes("arm") || ua.includes("aarch64") ? "arm64" : platform === "macos" ? "unknown" : "x64");
  const candidates = assets.filter((asset) => platformOf(asset.name) === platform && kindOf(asset.name) !== "checksums").map((asset) => {
    const declared = archOf(asset.name), kind = kindOf(asset.name), kinds = PLATFORM_EXTENSIONS[platform] || PLATFORM_EXTENSIONS.other;
    let score = kinds.includes(kind) ? 40 - kinds.indexOf(kind) * 3 : 0;
    if (declared === arch) score += 60;
    else if (declared === "universal" && platform === "macos") score += 55;
    else if (declared === "unknown") score += 20;
    else score -= 45;
    return { asset, declared, score };
  }).sort((a, b) => b.score - a.score || a.asset.name.localeCompare(b.asset.name));
  const best = candidates[0];
  if (!best || best.score < 0) return { platform, arch, asset: null, alternatives: [], confidence: "none", reason: `No downloadable ${platform} asset was detected.` };
  const confidence = best.declared === arch ? "exact" : best.declared === "universal" ? "universal" : "fallback";
  const reason = confidence === "exact" ? `Matches your ${platform} ${arch} runtime.` : confidence === "universal" ? "Universal build should run on both macOS architectures." : `No exact ${platform} ${arch} build was found; this is the safest available fallback.`;
  return { platform, arch, asset: best.asset, alternatives: candidates.slice(1).map((entry) => entry.asset), confidence, reason };
}

function parseTarget(value) {
  const cleaned = value.replace(/^https?:\/\/github\.com\//, "").replace(/\/releases\/tag\//, "@").replace(/\.git$/, "").replace(/\/$/, "");
  const [repository, tag] = cleaned.split("@", 2);
  if (!repository || repository.split("/").length !== 2) throw new Error("Expected owner/repo, owner/repo@tag, or a GitHub release URL.");
  return { repository, tag };
}

async function github(endpoint) {
  const response = await fetch(`https://api.github.com${endpoint}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "releaseguard-web" } });
  if (response.status === 404) throw new Error("No accessible release found for this repository.");
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
  return response.json();
}

module.exports = async function handler(request, response) {
  try {
    const url = new URL(request.url, "https://releaseguard.local");
    const target = String(request.query?.target || url.searchParams.get("target") || "");
    const platform = request.query?.platform || url.searchParams.get("platform") || undefined;
    const arch = request.query?.arch || url.searchParams.get("arch") || undefined;
    const { repository, tag } = parseTarget(target);
    const data = await github(`/repos/${repository}/releases/${tag ? `tags/${encodeURIComponent(tag)}` : "latest"}`);
    const assets = (data.assets || []).map((asset) => ({ name: String(asset.name), size: Number(asset.size || 0), url: String(asset.browser_download_url), contentType: String(asset.content_type || ""), downloadCount: Number(asset.download_count || 0) }));
    const findings = [];
    const checksums = assets.filter((asset) => /(sha(?:sum)?s?[-_]?256|checksums?)(?:\.|-|_|$)/i.test(asset.name));
    if (!assets.length) findings.push({ rule: "assets-present", level: "error", message: "Release has no downloadable assets." });
    if (data.draft) findings.push({ rule: "published-release", level: "error", message: "Release is still a draft." });
    if (data.prerelease) findings.push({ rule: "prerelease", level: "warning", message: "This is a prerelease." });
    if (!checksums.length) findings.push({ rule: "checksums", level: "warning", message: "No SHA-256 checksum manifest found." });
    else findings.push({ rule: "checksums", level: "pass", message: `Found ${checksums.length} checksum manifest${checksums.length === 1 ? "" : "s"}.` });
    for (const required of ["macos", "windows", "linux"]) findings.push(assets.some((asset) => platformOf(asset.name) === required) ? { rule: "platform-coverage", level: "pass", message: `${required} asset is present.` } : { rule: "platform-coverage", level: "warning", message: `No ${required} asset detected.` });
    for (const asset of assets) findings.push(asset.size === 0 ? { rule: "non-empty", level: "error", asset: asset.name, message: "Asset is empty." } : { rule: "non-empty", level: "pass", asset: asset.name, message: "Asset is non-empty." });
    const summary = { pass: findings.filter((item) => item.level === "pass").length, warning: findings.filter((item) => item.level === "warning").length, error: findings.filter((item) => item.level === "error").length };
    const score = Math.max(0, 100 - summary.error * 18 - summary.warning * 5);
    response.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    response.status(200).json({ schemaVersion: 1, generatedAt: new Date().toISOString(), release: { repository, tag: String(data.tag_name), name: String(data.name || data.tag_name), url: String(data.html_url), draft: Boolean(data.draft), prerelease: Boolean(data.prerelease), publishedAt: data.published_at ? String(data.published_at) : null, assets }, score, summary, findings, assets: assets.map((asset) => ({ asset, platform: platformOf(asset.name), declaredArch: archOf(asset.name), kind: kindOf(asset.name) })), recommendation: recommend(assets, request.headers?.["user-agent"], platform, arch), conclusion: summary.error ? "fail" : summary.warning ? "warning" : "pass" });
  } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : String(error) }); }
};
