import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "../../src/core/client.ts";
import { NotFoundError, HTTPError } from "../../src/core/errors.ts";
import { create } from "../../src/core/registry.ts";
import "../../src/registries/index.ts";

/** Helper — minimal Arch official search response. */
function archSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    results: [
      {
        pkgname: "pacman",
        pkgbase: "pacman",
        repo: "Core",
        arch: "x86_64",
        pkgver: "6.1.0",
        pkgrel: "3",
        epoch: 0,
        pkgdesc: "A library-based package manager with dependency support",
        url: "https://www.archlinux.org/pacman/",
        filename: "pacman-6.1.0-3-x86_64.pkg.tar.zst",
        compressed_size: 500000,
        installed_size: 2000000,
        build_date: "2025-11-10T10:00:00Z",
        last_update: "2025-11-10T12:00:00Z",
        flag_date: null,
        maintainers: ["Allan"],
        packager: "Allan",
        groups: ["base-devel"],
        licenses: ["GPL-3.0-or-later"],
        conflicts: [],
        provides: ["libalpm.so=14-64"],
        replaces: [],
        depends: ["bash", "glibc", "libarchive", "curl>=7.55"],
        optdepends: ["perl-locale-gettext: translation support in makepkg-template"],
        makedepends: ["meson"],
        checkdepends: ["python", "fakechroot"],
        ...overrides,
      },
    ],
  };
}

/** Helper — minimal AUR info response. */
function aurInfoResponse(overrides: Record<string, unknown> = {}) {
  return {
    resultcount: 1,
    type: "multiinfo",
    version: 5,
    results: [
      {
        ID: 1234,
        Name: "yay",
        PackageBase: "yay",
        PackageBaseID: 5678,
        Version: "12.4.2-1",
        Description: "Yet another yogurt - An AUR Helper written in Go",
        URL: "https://github.com/Jguer/yay",
        NumVotes: 2500,
        Popularity: 25.5,
        OutOfDate: null,
        Maintainer: "Jguer",
        FirstSubmitted: 1500000000,
        LastModified: 1700000000,
        URLPath: "/cgit/aur.git/snapshot/yay.tar.gz",
        Depends: ["pacman>=5.2", "git"],
        OptDepends: ["sudo: privilege elevation"],
        MakeDepends: ["go>=1.21"],
        CheckDepends: [],
        License: ["GPL-3.0-or-later"],
        Keywords: ["aur", "helper"],
        ...overrides,
      },
    ],
  };
}

describe("alpm registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("official packages", () => {
    it("should fetch and normalize official package", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("arch/pacman");

      expect(pkg.name).toBe("pacman");
      expect(pkg.description).toBe("A library-based package manager with dependency support");
      expect(pkg.homepage).toBe("https://www.archlinux.org/pacman/");
      expect(pkg.licenses).toBe("GPL-3.0-or-later");
      expect(pkg.namespace).toBe("arch");
      expect(pkg.latestVersion).toBe("6.1.0-3");
      expect(pkg.keywords).toContain("base-devel");
      expect(pkg.metadata.repo).toBe("Core");
      expect(pkg.metadata.arch).toBe("x86_64");
    });

    it("should format version with epoch when > 0", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(
        archSearchResponse({ epoch: 2, pkgver: "1.0.0", pkgrel: "1" }),
      );

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("arch/some-pkg");

      expect(pkg.latestVersion).toBe("2:1.0.0-1");
    });

    it("should prefer x86_64 result when multiple archs exist", async () => {
      const client = new Client();
      const response = {
        results: [
          { ...archSearchResponse().results[0], arch: "any", pkgver: "1.0.0" },
          { ...archSearchResponse().results[0], arch: "x86_64", pkgver: "2.0.0" },
        ],
      };
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(response);

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("arch/pacman");

      expect(pkg.metadata.arch).toBe("x86_64");
    });

    it("should throw NotFoundError for missing official package", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce({ results: [] });

      const registry = create("alpm", undefined, client);

      await expect(registry.fetchPackage("arch/nonexistent-pkg-xyz")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw NotFoundError on HTTP 404", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("alpm", undefined, client);

      await expect(registry.fetchPackage("arch/nonexistent-pkg-xyz")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should fetch versions (single current version)", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const versions = await registry.fetchVersions("arch/pacman");

      expect(versions).toHaveLength(1);
      expect(versions[0].number).toBe("6.1.0-3");
      expect(versions[0].licenses).toBe("GPL-3.0-or-later");
      expect(versions[0].status).toBe("");
      expect(versions[0].publishedAt).toBeInstanceOf(Date);
    });

    it("should mark flagged package version as deprecated", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(
        archSearchResponse({ flag_date: "2025-12-01T00:00:00Z" }),
      );

      const registry = create("alpm", undefined, client);
      const versions = await registry.fetchVersions("arch/old-pkg");

      expect(versions[0].status).toBe("deprecated");
    });

    it("should parse dependencies with version constraints", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const deps = await registry.fetchDependencies("arch/pacman", "6.1.0-3");

      // Runtime deps
      const bash = deps.find((d) => d.name === "bash");
      expect(bash).toBeDefined();
      expect(bash!.scope).toBe("runtime");
      expect(bash!.optional).toBe(false);

      // Dep with version constraint
      const curl = deps.find((d) => d.name === "curl");
      expect(curl).toBeDefined();
      expect(curl!.requirements).toBe(">=7.55");

      // Build dep
      const meson = deps.find((d) => d.name === "meson");
      expect(meson).toBeDefined();
      expect(meson!.scope).toBe("build");

      // Optional dep (description stripped)
      const perl = deps.find((d) => d.name === "perl-locale-gettext");
      expect(perl).toBeDefined();
      expect(perl!.scope).toBe("optional");
      expect(perl!.optional).toBe(true);
      expect(perl!.requirements).toBe("");

      // Check dep
      const python = deps.find((d) => d.name === "python");
      expect(python).toBeDefined();
      expect(python!.scope).toBe("test");
    });

    it("should enforce exact version for official dependency lookups", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);

      await expect(registry.fetchDependencies("arch/pacman", "6.1.0-2")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should parse optional dependency requirements", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(
        archSearchResponse({
          depends: [],
          makedepends: [],
          checkdepends: [],
          optdepends: ["foo>=1.2: optional runtime integration"],
        }),
      );

      const registry = create("alpm", undefined, client);
      const deps = await registry.fetchDependencies("arch/pacman", "6.1.0-3");

      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe("foo");
      expect(deps[0].requirements).toBe(">=1.2");
      expect(deps[0].scope).toBe("optional");
      expect(deps[0].optional).toBe(true);
    });

    it("should fetch maintainers", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const maintainers = await registry.fetchMaintainers("arch/pacman");

      expect(maintainers).toHaveLength(1);
      expect(maintainers[0].login).toBe("Allan");
      expect(maintainers[0].role).toBe("maintainer");
    });
  });

  describe("AUR packages", () => {
    it("should fetch and normalize AUR package", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("aur/yay");

      expect(pkg.name).toBe("yay");
      expect(pkg.description).toContain("AUR Helper");
      expect(pkg.homepage).toBe("https://github.com/Jguer/yay");
      expect(pkg.licenses).toBe("GPL-3.0-or-later");
      expect(pkg.namespace).toBe("aur");
      expect(pkg.latestVersion).toBe("12.4.2-1");
      expect(pkg.keywords).toContain("aur");
      expect(pkg.metadata.votes).toBe(2500);
      expect(pkg.metadata.popularity).toBe(25.5);
    });

    it("should throw NotFoundError for missing AUR package", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce({
        resultcount: 0,
        results: [],
        type: "multiinfo",
        version: 5,
      });

      const registry = create("alpm", undefined, client);

      await expect(registry.fetchPackage("aur/nonexistent-pkg-xyz")).rejects.toThrow(NotFoundError);
    });

    it("should fetch AUR versions with timestamp conversion", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);
      const versions = await registry.fetchVersions("aur/yay");

      expect(versions).toHaveLength(1);
      expect(versions[0].number).toBe("12.4.2-1");
      expect(versions[0].publishedAt).toBeInstanceOf(Date);
      // AUR timestamps are unix seconds — verify correct ms conversion
      expect(versions[0].publishedAt!.getTime()).toBe(1700000000 * 1000);
    });

    it("should mark out-of-date AUR package as deprecated", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse({ OutOfDate: 1700000000 }));

      const registry = create("alpm", undefined, client);
      const versions = await registry.fetchVersions("aur/old-pkg");

      expect(versions[0].status).toBe("deprecated");
    });

    it("should parse AUR dependencies", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);
      const deps = await registry.fetchDependencies("aur/yay", "12.4.2-1");

      const pacman = deps.find((d) => d.name === "pacman");
      expect(pacman).toBeDefined();
      expect(pacman!.scope).toBe("runtime");
      expect(pacman!.requirements).toBe(">=5.2");

      const go = deps.find((d) => d.name === "go");
      expect(go).toBeDefined();
      expect(go!.scope).toBe("build");
      expect(go!.requirements).toBe(">=1.21");

      const sudo = deps.find((d) => d.name === "sudo");
      expect(sudo).toBeDefined();
      expect(sudo!.scope).toBe("optional");
      expect(sudo!.optional).toBe(true);
    });

    it("should enforce exact version for AUR dependency lookups", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);

      await expect(registry.fetchDependencies("aur/yay", "12.4.2-0")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should parse AUR optional dependency requirements", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(
        aurInfoResponse({
          Depends: [],
          MakeDepends: [],
          CheckDepends: [],
          OptDepends: ["bar>=2: optional helper"],
        }),
      );

      const registry = create("alpm", undefined, client);
      const deps = await registry.fetchDependencies("aur/yay", "12.4.2-1");

      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe("bar");
      expect(deps[0].requirements).toBe(">=2");
      expect(deps[0].scope).toBe("optional");
      expect(deps[0].optional).toBe(true);
    });

    it("should return empty maintainers for orphaned AUR package", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse({ Maintainer: null }));

      const registry = create("alpm", undefined, client);
      const maintainers = await registry.fetchMaintainers("aur/orphaned-pkg");

      expect(maintainers).toHaveLength(0);
    });

    it("should fetch AUR maintainer", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);
      const maintainers = await registry.fetchMaintainers("aur/yay");

      expect(maintainers).toHaveLength(1);
      expect(maintainers[0].login).toBe("Jguer");
      expect(maintainers[0].role).toBe("maintainer");
    });
  });

  describe("namespace routing", () => {
    it("should reject unsupported namespaces", async () => {
      const client = new Client();
      const registry = create("alpm", undefined, client);

      await expect(registry.fetchPackage("manjaro/pacman")).rejects.toThrow(NotFoundError);
    });

    it("should normalize input casing and whitespace", async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("  Arch/Pacman  ");

      expect(pkg.name).toBe("pacman");
      expect(client.getJSON).toHaveBeenCalledWith(
        expect.stringContaining("name=pacman"),
        undefined,
      );
    });

    it('should default to "arch" namespace when no slash in name', async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(archSearchResponse());

      const registry = create("alpm", undefined, client);
      const pkg = await registry.fetchPackage("pacman");

      expect(pkg.namespace).toBe("arch");
      expect(client.getJSON).toHaveBeenCalledWith(
        expect.stringContaining("archlinux.org/packages/search/json"),
        undefined,
      );
    });

    it('should route "aur/..." to AUR API', async () => {
      const client = new Client();
      vi.spyOn(client, "getJSON").mockResolvedValueOnce(aurInfoResponse());

      const registry = create("alpm", undefined, client);
      await registry.fetchPackage("aur/yay");

      expect(client.getJSON).toHaveBeenCalledWith(
        expect.stringContaining("aur.archlinux.org/rpc/v5/info"),
        undefined,
      );
    });
  });

  describe("URL builder", () => {
    it("should generate official package URLs", () => {
      const registry = create("alpm");
      const urls = registry.urls();

      expect(urls.registry("arch/pacman")).toContain("archlinux.org/packages");
      expect(urls.download("arch/pacman", "6.1.0-3")).toBe(
        "https://archive.archlinux.org/packages/p/pacman/",
      );
      expect(urls.documentation("arch/pacman")).toContain("wiki.archlinux.org");
      expect(urls.purl("arch/pacman", "6.1.0-3")).toBe("pkg:alpm/arch/pacman@6.1.0-3");
    });

    it("should generate AUR package URLs", () => {
      const registry = create("alpm");
      const urls = registry.urls();

      expect(urls.registry("aur/yay")).toContain("aur.archlinux.org/packages/yay");
      expect(urls.download("aur/yay", "12.4.2-1")).toContain("snapshot/yay.tar.gz");
      expect(urls.purl("aur/yay", "12.4.2-1")).toBe("pkg:alpm/aur/yay@12.4.2-1");
    });

    it("should point download URL to archive directory without hardcoded arch", () => {
      const registry = create("alpm");
      const urls = registry.urls();

      const url = urls.download("arch/some-pkg", "2:1.0.0-1");
      expect(url).toBe("https://archive.archlinux.org/packages/s/some-pkg/");
      expect(url).not.toContain("x86_64");
      expect(url).not.toContain("any");
    });
  });
});
