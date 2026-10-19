import { describe, expect, it } from "vitest";

import { defaultShortCode, normaliseEmail } from "./teams";

describe("normaliseEmail", () => {
  it("trims and lower-cases a valid address", () => {
    expect(normaliseEmail("  Deepak.M@Example.COM ")).toBe("deepak.m@example.com");
  });

  it("treats blank as no email", () => {
    expect(normaliseEmail("")).toBeNull();
    expect(normaliseEmail("   ")).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
  });

  it("rejects malformed addresses", () => {
    expect(() => normaliseEmail("not-an-email")).toThrow(/valid email/);
    expect(() => normaliseEmail("a@b")).toThrow(/valid email/);
    expect(() => normaliseEmail("a b@c.com")).toThrow(/valid email/);
  });
});

describe("defaultShortCode", () => {
  it("uses initials, up to three", () => {
    expect(defaultShortCode("Riverside XI")).toBe("RX");
    expect(defaultShortCode("North East Valley Rovers")).toBe("NEV");
  });
});
