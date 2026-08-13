const form = document.querySelector("#scan-form");
const button = document.querySelector("#scan");
const empty = document.querySelector("#empty");
const result = document.querySelector("#result");
const errorBox = document.querySelector("#error");
let releaseUrl = "";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = "Checking…";
  errorBox.classList.add("hidden");
  try {
    const report = await window.releaseguard.scan(document.querySelector("#target").value);
    releaseUrl = report.release.url;
    empty.classList.add("hidden");
    result.classList.remove("hidden");
    document.querySelector("#repo").textContent = `${report.release.repository} · ${report.release.tag}`;
    document.querySelector("#release-name").textContent = report.release.name;
    const score = document.querySelector("#score");
    score.textContent = report.score;
    score.className = `score ${report.conclusion}`;
    document.querySelector("#counts").innerHTML = `<span class="pass">${report.summary.pass} passed</span><span class="warning">${report.summary.warning} warnings</span><span class="fail">${report.summary.error} errors</span><span>${report.assets.length} assets</span>`;
    document.querySelector("#findings").innerHTML = report.findings.map((finding) => `<article class="finding ${finding.level}"><b>${finding.level === "pass" ? "✓" : finding.level === "warning" ? "!" : "×"}</b><div><strong>${escapeHtml(finding.message)}</strong>${finding.asset ? `<small>${escapeHtml(finding.asset)}</small>` : ""}</div></article>`).join("");
  } catch (error) {
    errorBox.textContent = error.message || String(error);
    errorBox.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Check release";
  }
});
document.querySelector("#open-release").addEventListener("click", () => window.releaseguard.open(releaseUrl));
