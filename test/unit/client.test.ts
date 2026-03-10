import { parseRetryAfter } from "../../src/core/client.ts";

describe("parseRetryAfter", () => {
  it("parses numeric seconds", () => {
    expect(parseRetryAfter("120")).toBe(120);
  });

  it("parses zero", () => {
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("returns 60 for null", () => {
    expect(parseRetryAfter(null)).toBe(60);
  });

  it("returns 60 for undefined", () => {
    expect(parseRetryAfter(undefined)).toBe(60);
  });

  it("returns 60 for empty string", () => {
    expect(parseRetryAfter("")).toBe(60);
  });

  it("parses HTTP-date in the future", () => {
    const future = new Date(Date.now() + 90_000);
    const result = parseRetryAfter(future.toUTCString());
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(90);
  });

  it("falls back to 60 for HTTP-date in the past", () => {
    expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT")).toBe(60);
  });

  it("returns 60 for garbage input", () => {
    expect(parseRetryAfter("not-a-number-or-date")).toBe(60);
  });

  it("handles large numeric values", () => {
    expect(parseRetryAfter("3600")).toBe(3600);
  });
});
