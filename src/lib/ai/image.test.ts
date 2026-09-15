import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/ai/image";

const bytes = (...values: Array<number | string>) =>
  new Uint8Array(values.flatMap((value) => (typeof value === "string" ? [...value].map((c) => c.charCodeAt(0)) : [value])).concat(new Array(16).fill(0)));

describe("sniffImageType", () => {
  it("recognises the four supported containers", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 0x18, "ftyp", "heic"))).toBe("image/heic");
  });
  it("rejects HTML and truncated inputs", () => {
    expect(sniffImageType(bytes("<!DOCTYPE html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
