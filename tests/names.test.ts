import assert from "node:assert/strict";
import test from "node:test";
import { archOf, kindOf, platformOf } from "../src/names.js";

test("detects common platform and architecture names", () => {
  assert.equal(platformOf("App-1.2.0-mac-arm64.dmg"), "macos");
  assert.equal(archOf("App-1.2.0-mac-arm64.dmg"), "arm64");
  assert.equal(platformOf("App-win32-x64.exe"), "windows");
  assert.equal(archOf("App-win32-x64.exe"), "x64");
  assert.equal(platformOf("App-linux-x86_64.AppImage"), "linux");
  assert.equal(kindOf("App-linux-x86_64.AppImage"), "appimage");
  assert.equal(archOf("gh_linux_386.zip"), "x86");
  assert.equal(archOf("gh_linux_armv6.tar.gz"), "armv7");
});
