#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { analyze } from "./analyze.js";
import { fetchRelease } from "./github.js";
import { loadPolicy } from "./policy.js";
import { size, writeReports } from "./report.js";
import { hostArch, hostPlatform, recommendAsset } from "./recommend.js";

const program = new Command();
program.name("releaseguard").description("Verify GitHub Release assets and tell users which download fits their device.").version("0.1.0");
program.command("check <release>")
  .description("Check owner/repo, owner/repo@tag, or a GitHub release URL")
  .option("--policy <path>", "YAML policy file")
  .option("--html <path>", "write a shareable HTML report")
  .option("--json <path>", "write a stable JSON report")
  .option("--format <format>", "terminal output: human or json", "human")
  .option("--fail-on <level>", "exit non-zero on error, warning, or never", "error")
  .action(async (target: string, options: { policy?: string; html?: string; json?: string; format: string; failOn: string }) => {
    const policy = await loadPolicy(options.policy);
    const report = await analyze(await fetchRelease(target), policy);
    await writeReports(report, { ...(options.html ? { html: options.html } : {}), ...(options.json ? { json: options.json } : {}) });
    if (options.format === "json") console.log(JSON.stringify(report, null, 2));
    else {
      const color = report.conclusion === "fail" ? pc.red : report.conclusion === "warning" ? pc.yellow : pc.green;
      console.log(`${pc.bold(report.release.repository)} ${pc.cyan(report.release.tag)}  ${color(`${report.score}/100 ${report.conclusion.toUpperCase()}`)}`);
      console.log(`${report.assets.length} assets · ${pc.green(`${report.summary.pass} passed`)} · ${pc.yellow(`${report.summary.warning} warnings`)} · ${pc.red(`${report.summary.error} errors`)}\n`);
      for (const finding of report.findings) {
        const mark = finding.level === "pass" ? pc.green("✓") : finding.level === "warning" ? pc.yellow("!") : pc.red("×");
        console.log(`${mark} ${finding.message}${finding.asset ? pc.dim(` — ${finding.asset}`) : ""}`);
      }
      console.log("\nAssets");
      for (const item of report.assets) console.log(`${item.platform.padEnd(8)} ${item.declaredArch.padEnd(10)} ${size(item.asset.size).padStart(9)}  ${item.asset.name}`);
      const recommendation = recommendAsset(report.release.assets, hostPlatform(), hostArch());
      console.log(`\nRecommended download for ${hostPlatform()} ${hostArch()}`);
      if (recommendation.asset) {
        console.log(`${pc.green("→")} ${recommendation.asset.name}`);
        console.log(pc.dim(recommendation.reason));
        if (recommendation.alternatives.length) console.log(pc.dim(`Alternatives: ${recommendation.alternatives.map((asset) => asset.name).join(", ")}`));
      } else console.log(pc.yellow(recommendation.reason));
      if (options.html) console.log(pc.dim(`\nHTML report: ${options.html}`));
    }
    if (options.failOn === "warning" && (report.summary.warning || report.summary.error)) process.exitCode = 1;
    else if (options.failOn === "error" && report.summary.error) process.exitCode = 1;
    else if (!['error','warning','never'].includes(options.failOn)) throw new Error("--fail-on must be error, warning, or never");
  });

program.parseAsync().catch((error: unknown) => { console.error(pc.red(`ReleaseGuard: ${error instanceof Error ? error.message : String(error)}`)); process.exitCode = 2; });
