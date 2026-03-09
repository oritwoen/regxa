/**
 * E2E smoke tests — real API calls to each registry.
 * Run manually: pnpm vitest run test/e2e/smoke.test.ts
 *
 * These tests hit live APIs and may fail due to rate limiting or network issues.
 */
import { create, ecosystems, has } from "../../src/core/registry.ts";
import "../../src/registries/index.ts";

describe("registry smoke tests", () => {
  it("all 6 ecosystems are registered", () => {
    const registered = ecosystems();
    expect(registered).toContain("npm");
    expect(registered).toContain("cargo");
    expect(registered).toContain("pypi");
    expect(registered).toContain("gem");
    expect(registered).toContain("composer");
    expect(registered).toContain("alpm");
    expect(registered).toHaveLength(6);
  });

  it("has() returns correct values", () => {
    expect(has("npm")).toBe(true);
    expect(has("cargo")).toBe(true);
    expect(has("unknown")).toBe(false);
  });

  describe("npm — lodash", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("npm");
      const pkg = await reg.fetchPackage("lodash");
      expect(pkg.name).toBe("lodash");
      expect(pkg.licenses).toBeTruthy();
      expect(pkg.repository).toContain("github.com");
      expect(pkg.latestVersion).toBeTruthy();
    });

    it("fetchVersions", async () => {
      const reg = create("npm");
      const versions = await reg.fetchVersions("lodash");
      expect(versions.length).toBeGreaterThan(10);
      expect(versions[0]!.number).toBeTruthy();
    });

    it("urls", () => {
      const reg = create("npm");
      const urls = reg.urls();
      expect(urls.registry("lodash")).toContain("npmjs.com");
      expect(urls.purl("lodash", "4.17.21")).toBe("pkg:npm/lodash@4.17.21");
    });
  });

  describe("cargo — serde", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("cargo");
      const pkg = await reg.fetchPackage("serde");
      expect(pkg.name).toBe("serde");
      expect(pkg.licenses).toBeTruthy();
      expect(pkg.repository).toContain("github.com");
    });
  });

  describe("pypi — requests", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("pypi");
      const pkg = await reg.fetchPackage("requests");
      expect(pkg.name).toBe("requests");
      expect(pkg.licenses).toBeTruthy();
      expect(pkg.repository).toContain("github.com");
    });
  });

  describe("gem — rails", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("gem");
      const pkg = await reg.fetchPackage("rails");
      expect(pkg.name).toBe("rails");
      expect(pkg.licenses).toBeTruthy();
    });
  });

  describe("composer — laravel/framework", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("composer");
      const pkg = await reg.fetchPackage("laravel/framework");
      expect(pkg.name).toBe("laravel/framework");
      expect(pkg.licenses).toBeTruthy();
      expect(pkg.namespace).toBe("laravel");
    });
  });

  describe("alpm — pacman (official)", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("alpm");
      const pkg = await reg.fetchPackage("arch/pacman");
      expect(pkg.name).toBe("pacman");
      expect(pkg.licenses).toBeTruthy();
      expect(pkg.namespace).toBe("arch");
      expect(pkg.latestVersion).toBeTruthy();
    });
  });

  describe("alpm — yay (AUR)", { timeout: 15_000 }, () => {
    it("fetchPackage", async () => {
      const reg = create("alpm");
      const pkg = await reg.fetchPackage("aur/yay");
      expect(pkg.name).toBe("yay");
      expect(pkg.namespace).toBe("aur");
      expect(pkg.latestVersion).toBeTruthy();
    });
  });
});
