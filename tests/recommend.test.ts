import assert from "node:assert/strict";
import test from "node:test";
import { hostArch, hostPlatform, recommendAsset } from "../src/recommend.js";
import type { Asset } from "../src/types.js";

const assets: Asset[] = [
  { name: "Tool-macos-arm64.dmg", size: 10, url: "https://example.test/arm" },
  { name: "Tool-macos-universal.dmg", size: 10, url: "https://example.test/universal" },
  { name: "Tool-windows-x64.exe", size: 10, url: "https://example.test/win" },
  { name: "Tool-linux-x86_64.AppImage", size: 10, url: "https://example.test/linux" },
];

test("recommends an exact platform and architecture asset", () => {
  const result = recommendAsset(assets, "windows", "x64");
  assert.equal(result.asset?.name, "Tool-windows-x64.exe");
  assert.equal(result.confidence, "exact");
});

test("uses a universal macOS build when the exact architecture is absent", () => {
  const result = recommendAsset(assets, "macos", "x86");
  assert.equal(result.asset?.name, "Tool-macos-universal.dmg");
  assert.equal(result.confidence, "universal");
});

test("maps runtime names for the CLI", () => {
  assert.equal(hostPlatform("darwin"), "macos");
  assert.equal(hostArch("arm64"), "arm64");
});
