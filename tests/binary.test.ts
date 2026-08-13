import assert from "node:assert/strict";
import test from "node:test";
import { detectBinary } from "../src/binary.js";

test("detects PE x64 and ELF arm64 headers", () => {
  const pe = new Uint8Array(256); pe[0] = 0x4d; pe[1] = 0x5a; new DataView(pe.buffer).setUint32(0x3c, 128, true); pe[128] = 0x50; pe[129] = 0x45; new DataView(pe.buffer).setUint16(132, 0x8664, true);
  assert.deepEqual(detectBinary(pe), { kind: "pe", arch: "x64" });
  const elf = new Uint8Array(64); elf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1]); new DataView(elf.buffer).setUint16(18, 183, true);
  assert.deepEqual(detectBinary(elf), { kind: "elf", arch: "arm64" });
});
