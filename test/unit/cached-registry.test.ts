import { CachedRegistry } from "../../src/cache/cached-registry.ts";
import { readLockfile, cacheKey, DEFAULT_TTL } from "../../src/cache/lockfile.ts";
import { createHash } from "node:crypto";
import type { Registry, URLBuilder } from "../../src/core/types.ts";
import type { Lockfile } from "../../src/cache/lockfile.ts";

// Mock storage to avoid real file I/O
vi.mock("../../src/cache/storage.ts", () => {
  const storage = new Map<string, unknown>();
  const mockStorage = {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: unknown) => {
      storage.set(key, value);
    },
    clear: async () => {
      storage.clear();
    },
    dispose: async () => {
      storage.clear();
    },
  };
  return {
    getStorage: () => mockStorage,
    getEcosystemStorage: () => mockStorage,
    computeIntegrity: (value: unknown) => {
      const json = JSON.stringify(value);
      const hash = createHash("sha256").update(json).digest("hex");
      return `sha256-${hash}`;
    },
  };
});

// Mock lockfile I/O
let mockLockfile: Lockfile = { version: 1, entries: {} };

vi.mock("../../src/cache/lockfile.ts", async () => {
  const actual = await vi.importActual("../../src/cache/lockfile.ts");
  return {
    ...actual,
    readLockfile: async () => JSON.parse(JSON.stringify(mockLockfile)),
    writeLockfile: async (lockfile: Lockfile) => {
      mockLockfile = JSON.parse(JSON.stringify(lockfile));
    },
  };
});

function createMockRegistry(ecosystem: string, overrides?: Partial<Registry>): Registry {
  return {
    ecosystem: () => ecosystem,
    urls: (): URLBuilder => ({
      registry: () => `https://${ecosystem}.example.com`,
      download: () => `https://${ecosystem}.example.com/download`,
      documentation: () => `https://${ecosystem}.example.com/docs`,
      readme: () => `https://${ecosystem}.example.com/readme`,
      purl: () => `pkg:${ecosystem}/`,
    }),
    fetchPackage: async () => ({
      name: "test-package",
      description: "A test package",
      homepage: "https://example.com",
      repository: "https://github.com/example/test",
      licenses: "MIT",
      keywords: ["test"],
      namespace: "",
      latestVersion: "1.0.0",
      metadata: {},
    }),
    fetchVersions: async () => [
      {
        number: "1.0.0",
        publishedAt: new Date("2024-01-01"),
        licenses: "MIT",
        integrity: "sha256-abc123",
        status: "",
        metadata: {},
      },
    ],
    fetchDependencies: async () => [
      {
        name: "dep-package",
        requirements: "^1.0.0",
        scope: "runtime",
        optional: false,
      },
    ],
    fetchMaintainers: async () => [
      {
        uuid: "uuid-123",
        login: "testuser",
        name: "Test User",
        email: "test@example.com",
        url: "https://example.com/testuser",
        role: "owner",
      },
    ],
    ...overrides,
  };
}

describe("CachedRegistry", () => {
  beforeEach(() => {
    // Reset mock lockfile and storage before each test
    mockLockfile = { version: 1, entries: {} };
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("wraps a registry", () => {
      const inner = createMockRegistry("npm");
      const cached = new CachedRegistry(inner);
      expect(cached.inner).toBe(inner);
    });

    it("initializes storage for ecosystem", () => {
      const inner = createMockRegistry("npm");
      const cached = new CachedRegistry(inner);
      expect(cached.storage).toBeDefined();
    });
  });

  describe("ecosystem", () => {
    it("returns inner registry ecosystem", () => {
      const inner = createMockRegistry("npm");
      const cached = new CachedRegistry(inner);
      expect(cached.ecosystem()).toBe("npm");
    });

    it("works with different ecosystems", () => {
      const npm = new CachedRegistry(createMockRegistry("npm"));
      const cargo = new CachedRegistry(createMockRegistry("cargo"));
      expect(npm.ecosystem()).toBe("npm");
      expect(cargo.ecosystem()).toBe("cargo");
    });
  });

  describe("urls", () => {
    it("returns inner registry URLs", () => {
      const inner = createMockRegistry("npm");
      const cached = new CachedRegistry(inner);
      const urls = cached.urls();
      expect(urls.registry("pkg")).toBe("https://npm.example.com");
    });
  });

  describe("fetchPackage", () => {
    it("caches package on first fetch", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => {
          fetchCount++;
          return {
            name: "lodash",
            description: "Utility library",
            homepage: "https://lodash.com",
            repository: "https://github.com/lodash/lodash",
            licenses: "MIT",
            keywords: ["utility"],
            namespace: "",
            latestVersion: "4.17.21",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      const pkg1 = await cached.fetchPackage("lodash");
      expect(pkg1.name).toBe("lodash");
      expect(fetchCount).toBe(1);

      // Second fetch should use cache
      const pkg2 = await cached.fetchPackage("lodash");
      expect(pkg2.name).toBe("lodash");
      expect(fetchCount).toBe(1); // Not incremented
    });

    it("stores package in lockfile with latestVersion", async () => {
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => ({
          name: "react",
          description: "React library",
          homepage: "https://react.dev",
          repository: "https://github.com/facebook/react",
          licenses: "MIT",
          keywords: ["ui"],
          namespace: "",
          latestVersion: "18.2.0",
          metadata: {},
        }),
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchPackage("react");

      const lockfile = await readLockfile();
      const key = cacheKey("npm", "react", "package");
      const entry = lockfile.entries[key];
      expect(entry).toBeDefined();
      expect(entry?.latestVersion).toBe("18.2.0");
    });

    it("refetches on cache miss", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => {
          fetchCount++;
          return {
            name: "pkg",
            description: "Package",
            homepage: "",
            repository: "",
            licenses: "MIT",
            keywords: [],
            namespace: "",
            latestVersion: "1.0.0",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      // First fetch
      await cached.fetchPackage("pkg");
      expect(fetchCount).toBe(1);

      // Clear lockfile to simulate cache miss
      mockLockfile = { version: 1, entries: {} };

      // Second fetch should refetch
      await cached.fetchPackage("pkg");
      expect(fetchCount).toBe(2);
    });

    it("refetches on integrity mismatch", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => {
          fetchCount++;
          return {
            name: "pkg",
            description: "Package",
            homepage: "",
            repository: "",
            licenses: "MIT",
            keywords: [],
            namespace: "",
            latestVersion: "1.0.0",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      // First fetch
      await cached.fetchPackage("pkg");
      expect(fetchCount).toBe(1);

      // Corrupt the lockfile entry integrity
      const key = cacheKey("npm", "pkg", "package");
      const entry = mockLockfile.entries[key];
      if (entry) {
        entry.integrity = "sha256-corrupted";
      }

      // Second fetch should refetch due to integrity mismatch
      await cached.fetchPackage("pkg");
      expect(fetchCount).toBe(2);
    });
  });

  describe("fetchVersions", () => {
    it("caches versions on first fetch", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchVersions: async () => {
          fetchCount++;
          return [
            {
              number: "1.0.0",
              publishedAt: new Date("2024-01-01"),
              licenses: "MIT",
              integrity: "sha256-v1",
              status: "",
              metadata: {},
            },
            {
              number: "1.1.0",
              publishedAt: new Date("2024-02-01"),
              licenses: "MIT",
              integrity: "sha256-v2",
              status: "",
              metadata: {},
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      const versions1 = await cached.fetchVersions("pkg");
      expect(versions1).toHaveLength(2);
      expect(fetchCount).toBe(1);

      const versions2 = await cached.fetchVersions("pkg");
      expect(versions2).toHaveLength(2);
      expect(fetchCount).toBe(1); // Not incremented
    });

    it("respects versions TTL", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchVersions: async () => {
          fetchCount++;
          return [
            {
              number: "1.0.0",
              publishedAt: new Date("2024-01-01"),
              licenses: "MIT",
              integrity: "sha256-v1",
              status: "",
              metadata: {},
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchVersions("pkg");
      expect(fetchCount).toBe(1);

      // Manually expire the cache entry
      const key = cacheKey("npm", "pkg", "versions");
      const entry = mockLockfile.entries[key];
      if (entry) {
        entry.fetchedAt = Date.now() - 2000000; // Older than TTL
      }

      // Should refetch
      await cached.fetchVersions("pkg");
      expect(fetchCount).toBe(2);
    });

    it("revives publishedAt strings back to Date after cache round-trip", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchVersions: async () => {
          fetchCount++;
          return [
            {
              number: "1.0.0",
              publishedAt: new Date("2024-06-15T12:00:00Z"),
              licenses: "MIT",
              integrity: "sha256-v1",
              status: "",
              metadata: {},
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      // First fetch populates cache
      await cached.fetchVersions("pkg");
      expect(fetchCount).toBe(1);

      // Simulate JSON round-trip: replace cached Date with its ISO string
      // (this is what the real fs driver does via JSON.stringify/parse)
      const key = cacheKey("npm", "pkg", "versions");
      const stored = (await cached.storage.getItem(key)) as Array<Record<string, unknown>>;
      if (stored) {
        stored[0]["publishedAt"] = "2024-06-15T12:00:00.000Z";
        await cached.storage.setItem(key, stored as unknown as Record<string, unknown>);
      }

      // Second fetch reads from cache with string date
      const versions = await cached.fetchVersions("pkg");
      expect(fetchCount).toBe(1); // Still from cache
      expect(versions[0].publishedAt).toBeInstanceOf(Date);
      expect(versions[0].publishedAt!.toISOString()).toBe("2024-06-15T12:00:00.000Z");
    });
  });

  describe("fetchDependencies", () => {
    it("caches dependencies with version", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchDependencies: async () => {
          fetchCount++;
          return [
            {
              name: "lodash",
              requirements: "^4.17.0",
              scope: "runtime",
              optional: false,
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      const deps1 = await cached.fetchDependencies("pkg", "1.0.0");
      expect(deps1).toHaveLength(1);
      expect(fetchCount).toBe(1);

      const deps2 = await cached.fetchDependencies("pkg", "1.0.0");
      expect(deps2).toHaveLength(1);
      expect(fetchCount).toBe(1); // Not incremented
    });

    it("caches different versions separately", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchDependencies: async (name, version) => {
          fetchCount++;
          if (version === "1.0.0") {
            return [
              {
                name: "dep-v1",
                requirements: "^1.0.0",
                scope: "runtime",
                optional: false,
              },
            ];
          }
          return [
            {
              name: "dep-v2",
              requirements: "^2.0.0",
              scope: "runtime",
              optional: false,
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      const deps1 = await cached.fetchDependencies("pkg", "1.0.0");
      expect(deps1[0]?.name).toBe("dep-v1");
      expect(fetchCount).toBe(1);

      const deps2 = await cached.fetchDependencies("pkg", "2.0.0");
      expect(deps2[0]?.name).toBe("dep-v2");
      expect(fetchCount).toBe(2);

      // Fetch v1 again — should use cache
      const deps1Again = await cached.fetchDependencies("pkg", "1.0.0");
      expect(deps1Again[0]?.name).toBe("dep-v1");
      expect(fetchCount).toBe(2); // Not incremented
    });

    it("respects dependencies TTL (24 hours)", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchDependencies: async () => {
          fetchCount++;
          return [
            {
              name: "dep",
              requirements: "^1.0.0",
              scope: "runtime",
              optional: false,
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchDependencies("pkg", "1.0.0");
      expect(fetchCount).toBe(1);

      // Manually expire the cache entry
      const key = cacheKey("npm", "pkg", "dependencies", "1.0.0");
      const entry = mockLockfile.entries[key];
      if (entry) {
        entry.fetchedAt = Date.now() - 90000000; // Older than 24 hours
      }

      // Should refetch
      await cached.fetchDependencies("pkg", "1.0.0");
      expect(fetchCount).toBe(2);
    });
  });

  describe("fetchMaintainers", () => {
    it("caches maintainers on first fetch", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchMaintainers: async () => {
          fetchCount++;
          return [
            {
              uuid: "uuid-1",
              login: "user1",
              name: "User One",
              email: "user1@example.com",
              url: "https://example.com/user1",
              role: "owner",
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      const maintainers1 = await cached.fetchMaintainers("pkg");
      expect(maintainers1).toHaveLength(1);
      expect(fetchCount).toBe(1);

      const maintainers2 = await cached.fetchMaintainers("pkg");
      expect(maintainers2).toHaveLength(1);
      expect(fetchCount).toBe(1); // Not incremented
    });

    it("respects maintainers TTL (24 hours)", async () => {
      let fetchCount = 0;
      const inner = createMockRegistry("npm", {
        fetchMaintainers: async () => {
          fetchCount++;
          return [
            {
              uuid: "uuid-1",
              login: "user1",
              name: "User One",
              email: "user1@example.com",
              url: "https://example.com/user1",
              role: "owner",
            },
          ];
        },
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchMaintainers("pkg");
      expect(fetchCount).toBe(1);

      // Manually expire the cache entry
      const key = cacheKey("npm", "pkg", "maintainers");
      const entry = mockLockfile.entries[key];
      if (entry) {
        entry.fetchedAt = Date.now() - 90000000; // Older than 24 hours
      }

      // Should refetch
      await cached.fetchMaintainers("pkg");
      expect(fetchCount).toBe(2);
    });
  });

  describe("cache behavior", () => {
    it("handles multiple packages independently", async () => {
      let fetchCounts: Record<string, number> = { lodash: 0, react: 0 };
      const inner = createMockRegistry("npm", {
        fetchPackage: async (name) => {
          fetchCounts[name]++;
          return {
            name,
            description: `${name} package`,
            homepage: `https://${name}.com`,
            repository: `https://github.com/${name}/${name}`,
            licenses: "MIT",
            keywords: [],
            namespace: "",
            latestVersion: "1.0.0",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchPackage("lodash");
      await cached.fetchPackage("react");
      await cached.fetchPackage("lodash");

      expect(fetchCounts.lodash).toBe(1);
      expect(fetchCounts.react).toBe(1);
    });

    it("stores correct integrity hash", async () => {
      const testData = { name: "test", version: "1.0.0" };
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => ({
          name: "test",
          description: "Test",
          homepage: "",
          repository: "",
          licenses: "MIT",
          keywords: [],
          namespace: "",
          latestVersion: "1.0.0",
          metadata: testData,
        }),
      });
      const cached = new CachedRegistry(inner);

      await cached.fetchPackage("test");

      const key = cacheKey("npm", "test", "package");
      const entry = mockLockfile.entries[key];
      expect(entry?.integrity).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it("should not lose lockfile entries when concurrent fetches write different keys", async () => {
      const inner = createMockRegistry("npm", {
        fetchPackage: async (name) => {
          await new Promise((r) => setTimeout(r, 50));
          return {
            name,
            description: "",
            homepage: "",
            repository: "",
            licenses: "MIT",
            keywords: [],
            namespace: "",
            latestVersion: "1.0.0",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      // Concurrent fetches for different packages
      await Promise.all([cached.fetchPackage("alpha"), cached.fetchPackage("beta")]);

      const alphaKey = cacheKey("npm", "alpha", "package");
      const betaKey = cacheKey("npm", "beta", "package");
      expect(mockLockfile.entries[alphaKey]).toBeDefined();
      expect(mockLockfile.entries[betaKey]).toBeDefined();
    });

    it("uses correct TTL for each entry type", async () => {
      const inner = createMockRegistry("npm");
      const cached = new CachedRegistry(inner);

      await cached.fetchPackage("pkg");
      await cached.fetchVersions("pkg");
      await cached.fetchDependencies("pkg", "1.0.0");
      await cached.fetchMaintainers("pkg");

      const pkgEntry = mockLockfile.entries[cacheKey("npm", "pkg", "package")];
      const versionsEntry = mockLockfile.entries[cacheKey("npm", "pkg", "versions")];
      const depsEntry = mockLockfile.entries[cacheKey("npm", "pkg", "dependencies", "1.0.0")];
      const maintainersEntry = mockLockfile.entries[cacheKey("npm", "pkg", "maintainers")];

      expect(pkgEntry?.ttl).toBe(DEFAULT_TTL.package);
      expect(versionsEntry?.ttl).toBe(DEFAULT_TTL.versions);
      expect(depsEntry?.ttl).toBe(DEFAULT_TTL.dependencies);
      expect(maintainersEntry?.ttl).toBe(DEFAULT_TTL.maintainers);
    });
  });

  describe("ecosystem isolation", () => {
    it("does not collide when two ecosystems cache the same package name", async () => {
      const npmInner = createMockRegistry("npm", {
        fetchPackage: async () => ({
          name: "json",
          description: "npm json package",
          homepage: "",
          documentation: "",
          repository: "",
          licenses: "MIT",
          keywords: [],
          namespace: "",
          latestVersion: "1.0.0",
          metadata: {},
        }),
      });
      const cargoInner = createMockRegistry("cargo", {
        fetchPackage: async () => ({
          name: "json",
          description: "cargo json crate",
          homepage: "",
          documentation: "",
          repository: "",
          licenses: "Apache-2.0",
          keywords: [],
          namespace: "",
          latestVersion: "0.12.4",
          metadata: {},
        }),
      });

      const npmCached = new CachedRegistry(npmInner);
      const cargoCached = new CachedRegistry(cargoInner);

      const npmPkg = await npmCached.fetchPackage("json");
      const cargoPkg = await cargoCached.fetchPackage("json");

      expect(npmPkg.description).toBe("npm json package");
      expect(npmPkg.licenses).toBe("MIT");
      expect(cargoPkg.description).toBe("cargo json crate");
      expect(cargoPkg.licenses).toBe("Apache-2.0");

      const npmAgain = await npmCached.fetchPackage("json");
      const cargoAgain = await cargoCached.fetchPackage("json");

      expect(npmAgain.description).toBe("npm json package");
      expect(cargoAgain.description).toBe("cargo json crate");
    });
  });

  describe("error handling", () => {
    it("propagates fetch errors", async () => {
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => {
          throw new Error("Network error");
        },
      });
      const cached = new CachedRegistry(inner);

      await expect(cached.fetchPackage("pkg")).rejects.toThrow("Network error");
    });

    it("returns fetched data when storage write fails", async () => {
      const inner = createMockRegistry("npm", {
        fetchPackage: async () => ({
          name: "pkg",
          description: "Package",
          homepage: "",
          repository: "",
          licenses: "MIT",
          keywords: [],
          namespace: "",
          latestVersion: "1.0.0",
          metadata: {},
        }),
      });

      const failingStorage = {
        getItem: async () => null,
        setItem: async () => {
          throw new Error("Disk full");
        },
        clear: async () => {},
        dispose: async () => {},
      } as unknown as import("unstorage").Storage;

      const cached = new CachedRegistry(inner, failingStorage);
      const pkg = await cached.fetchPackage("pkg");
      expect(pkg.name).toBe("pkg");
      expect(pkg.latestVersion).toBe("1.0.0");
    });

    it("handles AbortSignal", async () => {
      const inner = createMockRegistry("npm", {
        fetchPackage: async (name, signal) => {
          if (signal?.aborted) {
            throw new Error("Aborted");
          }
          return {
            name,
            description: "",
            homepage: "",
            repository: "",
            licenses: "MIT",
            keywords: [],
            namespace: "",
            latestVersion: "1.0.0",
            metadata: {},
          };
        },
      });
      const cached = new CachedRegistry(inner);

      const controller = new AbortController();
      controller.abort();

      await expect(cached.fetchPackage("pkg", controller.signal)).rejects.toThrow("Aborted");
    });
  });
});
