const form = document.querySelector("#scan-form");
const button = document.querySelector("#scan");
const empty = document.querySelector("#empty");
const result = document.querySelector("#result");
const errorBox = document.querySelector("#error");
const languageSelect = document.querySelector("#language");
let releaseUrl = "";
let currentReport = null;
let currentPlatform = null;
const platformReady = window.releaseguard.platform().then((value) => { currentPlatform = value; return value; });

const translations = {
  en: { subtitle: "Release asset inspection", eyebrow: "PRE-FLIGHT CHECK", headline: "Ship the files you meant to ship.", intro: "Inspect a public GitHub Release for missing platforms, mismatched architecture, stale versions, and absent checksums.", targetLabel: "GitHub repository or Release URL", check: "Check release", checking: "Checking…", hint: "Public repositories need no token. ReleaseGuard never runs installers.", emptyTitle: "No release loaded", emptyText: "Enter a repository above to begin the inspection.", openRelease: "Open Release ↗", downloadCurrent: "Download for this computer", download: "Download", assetsTitle: "Release assets", noMatch: "No asset matches this computer", saved: "Saved", passed: "passed", warnings: "warnings", errors: "errors", assets: "assets", error: "Download failed" },
  zh: { subtitle: "Release 产物检查", eyebrow: "发布前检查", headline: "只发布你真正想发布的文件。", intro: "检查公开 GitHub Release，找出缺失平台、架构不符、版本过期和缺少校验文件等问题。", targetLabel: "GitHub 仓库或 Release 链接", check: "检查 Release", checking: "检查中…", hint: "公开仓库无需 Token。ReleaseGuard 不会运行安装程序。", emptyTitle: "还没有加载 Release", emptyText: "在上方输入仓库地址，开始检查。", openRelease: "打开 Release ↗", downloadCurrent: "下载当前电脑版本", download: "下载", assetsTitle: "Release 产物", noMatch: "没有匹配当前电脑的产物", saved: "已保存", passed: "通过", warnings: "警告", errors: "错误", assets: "个产物", error: "下载失败" },
};
const t = (key) => translations[languageSelect.value][key] || key;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const platformName = () => `${currentPlatform.platform === "darwin" ? "macOS" : currentPlatform.platform === "win32" ? "Windows" : "Linux"} · ${currentPlatform.arch}`;

function isMatch(name) {
  const lower = name.toLowerCase();
  const platform = currentPlatform.platform === "darwin" ? /(mac|darwin|apple)/.test(lower) : currentPlatform.platform === "win32" ? /(win|windows)/.test(lower) : /(linux|appimage|deb|rpm)/.test(lower);
  const arch = currentPlatform.arch === "arm64" ? /(arm64|aarch64|universal)/.test(lower) : currentPlatform.arch === "x64" ? /(x64|x86_64|amd64|universal)/.test(lower) : /(ia32|x86|i386|386)/.test(lower);
  return platform && arch;
}

function applyLanguage() {
  document.documentElement.lang = languageSelect.value === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelector("#target").placeholder = languageSelect.value === "zh" ? "owner/repo 或 GitHub Release 链接" : "owner/repo or a GitHub Release URL";
  if (currentReport) renderReport(currentReport);
}

function renderReport(report) {
  document.querySelector("#repo").textContent = `${report.release.repository} · ${report.release.tag}`;
  document.querySelector("#release-name").textContent = report.release.name;
  document.querySelector("#platform-label").textContent = platformName();
  const score = document.querySelector("#score"); score.textContent = report.score; score.className = `score ${report.conclusion}`;
  document.querySelector("#counts").innerHTML = `<span class="pass">${report.summary.pass} ${t("passed")}</span><span class="warning">${report.summary.warning} ${t("warnings")}</span><span class="fail">${report.summary.error} ${t("errors")}</span><span>${report.assets.length} ${t("assets")}</span>`;
  const matches = report.release.assets.filter((asset) => isMatch(asset.name));
  document.querySelector("#download-current").disabled = matches.length === 0;
  document.querySelector("#download-current").title = matches.length ? matches[0].name : t("noMatch");
  document.querySelector("#assets").innerHTML = report.release.assets.map((asset) => `<article class="asset ${isMatch(asset.name) ? "recommended" : ""}"><div><strong>${escapeHtml(asset.name)}</strong><small>${(asset.size / 1048576).toFixed(1)} MB${isMatch(asset.name) ? " · " + (languageSelect.value === "zh" ? "匹配当前电脑" : "matches this computer") : ""}</small></div><button class="asset-download" data-url="${escapeHtml(asset.url)}" data-name="${escapeHtml(asset.name)}">${t("download")}</button></article>`).join("");
  document.querySelector("#findings").innerHTML = report.findings.map((finding) => `<article class="finding ${finding.level}"><b>${finding.level === "pass" ? "✓" : finding.level === "warning" ? "!" : "×"}</b><div><strong>${escapeHtml(finding.message)}</strong>${finding.asset ? `<small>${escapeHtml(finding.asset)}</small>` : ""}</div></article>`).join("");
  document.querySelectorAll(".asset-download").forEach((downloadButton) => downloadButton.addEventListener("click", () => download(downloadButton.dataset.url, downloadButton.dataset.name)));
}

async function download(url, name) {
  try { const response = await window.releaseguard.download(url, name); if (response?.canceled) return; } catch (error) { errorBox.textContent = `${t("error")}: ${error.message || error}`; errorBox.classList.remove("hidden"); }
}

languageSelect.value = localStorage.getItem("releaseguard-language") || "en";
languageSelect.addEventListener("change", () => { localStorage.setItem("releaseguard-language", languageSelect.value); applyLanguage(); });
applyLanguage();

form.addEventListener("submit", async (event) => {
  event.preventDefault(); button.disabled = true; button.textContent = t("checking"); errorBox.classList.add("hidden");
  try { await platformReady; currentReport = await window.releaseguard.scan(document.querySelector("#target").value); releaseUrl = currentReport.release.url; empty.classList.add("hidden"); result.classList.remove("hidden"); renderReport(currentReport); }
  catch (error) { errorBox.textContent = error.message || String(error); errorBox.classList.remove("hidden"); }
  finally { button.disabled = false; button.textContent = t("check"); }
});
document.querySelector("#open-release").addEventListener("click", () => window.releaseguard.open(releaseUrl));
document.querySelector("#download-current").addEventListener("click", () => { const asset = currentReport?.release.assets.find((item) => isMatch(item.name)); if (asset) download(asset.url, asset.name); });
