import type { Arch } from "./types.js";

export function detectBinary(buffer: Uint8Array): { kind: string; arch: Arch } {
  if (buffer.length < 20) return { kind: "unknown", arch: "unknown" };
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (buffer[0] === 0x4d && buffer[1] === 0x5a && buffer.length > 0x40) {
    const pe = view.getUint32(0x3c, true);
    if (pe + 6 <= buffer.length && buffer[pe] === 0x50 && buffer[pe + 1] === 0x45) {
      const machine = view.getUint16(pe + 4, true);
      return { kind: "pe", arch: machine === 0x8664 ? "x64" : machine === 0xaa64 ? "arm64" : machine === 0x14c ? "x86" : machine === 0x1c4 ? "armv7" : "unknown" };
    }
  }
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    const little = buffer[5] === 1;
    const machine = view.getUint16(18, little);
    return { kind: "elf", arch: machine === 62 ? "x64" : machine === 183 ? "arm64" : machine === 3 ? "x86" : machine === 40 ? "armv7" : "unknown" };
  }
  const magic = view.getUint32(0, false);
  if ([0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca].includes(magic)) return { kind: "macho-fat", arch: "universal" };
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic)) {
    const little = magic === 0xcefaedfe || magic === 0xcffaedfe;
    const cpu = view.getUint32(4, little);
    return { kind: "macho", arch: cpu === 0x01000007 ? "x64" : cpu === 0x0100000c ? "arm64" : cpu === 7 ? "x86" : cpu === 12 ? "armv7" : "unknown" };
  }
  return { kind: "unknown", arch: "unknown" };
}
