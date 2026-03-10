import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "../../src/core/client.ts";
import { NotFoundError, HTTPError } from "../../src/core/errors.ts";
import { create } from "../../src/core/registry.ts";
import "../../src/registries/index.ts";

describe("Registry Modules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("npm registry", () => {
    it("should fetch and normalize npm package", async () => {
      const client = new Client();
      const mockResponse = {
        name: "lodash",
        description: "Lodash modular utilities.",
        homepage: "https://lodash.com/",
        repository: {
          type: "git",
          url: "https://github.com/lodash/lodash.git",
        },
        license: "MIT",
        keywords: ["util", "functional", "server", "client", "browser"],
        "dist-tags": {
          latest: "4.17.21",
        },
        versions: {
          "4.17.21": {
            name: "lodash",
            version: "4.17.21",
            license: "MIT",
            dist: {
              integrity:
                "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XAx56XwKQ==",
              shasum: "679591c564c3bffaae8164502b8503b4cc5ae34e",
              tarball: "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
            },
          },
        },
        time: {
          "4.17.21": "2021-02-17T17:30:39.963Z",
        },
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("npm", undefined, client);
      const pkg = await registry.fetchPackage("lodash");

      expect(pkg.name).toBe("lodash");
      expect(pkg.description).toBe("Lodash modular utilities.");
      expect(pkg.licenses).toBe("MIT");
      expect(pkg.repository).toContain("github.com/lodash/lodash");
      expect(pkg.keywords).toContain("util");
      expect(pkg.latestVersion).toBe("4.17.21");
      expect(pkg.namespace).toBe("");
    });

    it("should throw NotFoundError for missing npm package", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("npm", undefined, client);

      await expect(registry.fetchPackage("nonexistent-package-xyz")).rejects.toThrow(NotFoundError);
    });

    it("should fetch npm versions with integrity hashes", async () => {
      const client = new Client();
      const mockResponse = {
        name: "lodash",
        "dist-tags": {
          latest: "4.17.21",
        },
        versions: {
          "4.17.20": {
            name: "lodash",
            version: "4.17.20",
            dist: {
              integrity:
                "sha512-xHjhDr3cJBLUHRv7T7XcUVwrExis2P9KqLDcWQcYNyX4hD0e6lSuQkluyU9OY+bOj7wCZDDu4BDxAstd3/cFTw==",
              shasum: "718870b8574a11dba7a37366a8e154136f529c0f",
            },
          },
          "4.17.21": {
            name: "lodash",
            version: "4.17.21",
            dist: {
              integrity:
                "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XAx56XwKQ==",
              shasum: "679591c564c3bffaae8164502b8503b4cc5ae34e",
            },
            deprecated: false,
          },
        },
        time: {
          "4.17.20": "2021-02-15T10:00:00.000Z",
          "4.17.21": "2021-02-17T17:30:39.963Z",
        },
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("npm", undefined, client);
      const versions = await registry.fetchVersions("lodash");

      expect(versions).toHaveLength(2);
      expect(versions[0].number).toBe("4.17.20");
      expect(versions[0].integrity).toContain("sha512");
      expect(versions[1].number).toBe("4.17.21");
      expect(versions[1].status).toBe("");
    });
  });

  describe("cargo registry", () => {
    it("should fetch and normalize cargo crate", async () => {
      const client = new Client();
      const mockResponse = {
        crate: {
          id: 1,
          name: "serde",
          updated_at: "2024-01-15T10:00:00Z",
          created_at: "2014-12-20T02:35:07Z",
          downloads: 500000000,
          recent_downloads: 5000000,
          max_version: "1.0.197",
          max_stable_version: "1.0.197",
          newest_version: "1.0.197",
          description: "A generic serialization/deserialization framework",
          homepage: "https://serde.rs",
          documentation: "https://docs.rs/serde",
          repository: "https://github.com/serde-rs/serde",
          keywords: ["serialization", "deserialization"],
          categories: [],
          badges: [],
          links: {},
        },
        versions: [
          {
            id: 1,
            num: "1.0.197",
            dl_path: "/api/v1/crates/serde/1.0.197/download",
            readme_path: "/api/v1/crates/serde/1.0.197/readme",
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-01-15T10:00:00Z",
            downloads: 50000000,
            features: {},
            yanked: false,
            license: "MIT OR Apache-2.0",
            links: {},
            crate_size: 100000,
            published_by: {
              id: 1,
              login: "dtolnay",
              name: "David Tolnay",
              avatar: "https://avatars.githubusercontent.com/u/1617736?v=4",
              url: "https://github.com/dtolnay",
            },
            checksum: "abc123def456",
          },
        ],
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("cargo", undefined, client);
      const pkg = await registry.fetchPackage("serde");

      expect(pkg.name).toBe("serde");
      expect(pkg.description).toBe("A generic serialization/deserialization framework");
      expect(pkg.repository).toContain("github.com/serde-rs/serde");
      expect(pkg.latestVersion).toBe("1.0.197");
      expect(pkg.keywords).toContain("serialization");
      expect(pkg.namespace).toBe("");
      expect(pkg.documentation).toBe("https://docs.rs/serde");
      expect(pkg.metadata.downloads).toBe(500000000);
      expect(pkg.metadata.recentDownloads).toBe(5000000);
      expect(pkg.metadata.newestVersion).toBe("1.0.197");
      expect(pkg.metadata.updatedAt).toBe("2024-01-15T10:00:00Z");
      expect(pkg.metadata.createdAt).toBe("2014-12-20T02:35:07Z");
    });

    it("should use license from latest stable version, not newest version", async () => {
      const client = new Client();
      const mockResponse = {
        crate: {
          id: 1,
          name: "example",
          updated_at: "2024-02-01T10:00:00Z",
          created_at: "2024-01-01T10:00:00Z",
          downloads: 1000,
          recent_downloads: 100,
          max_version: "2.0.0-alpha.1",
          max_stable_version: "1.0.0",
          newest_version: "2.0.0-alpha.1",
          description: "Example crate",
          homepage: "",
          documentation: "",
          repository: "",
          keywords: [],
          categories: [],
          badges: [],
          links: {},
        },
        versions: [
          {
            id: 2,
            num: "2.0.0-alpha.1",
            dl_path: "/api/v1/crates/example/2.0.0-alpha.1/download",
            readme_path: "/api/v1/crates/example/2.0.0-alpha.1/readme",
            created_at: "2024-02-01T10:00:00Z",
            updated_at: "2024-02-01T10:00:00Z",
            downloads: 100,
            features: {},
            yanked: false,
            license: "MIT",
            links: {},
            crate_size: 50000,
            published_by: {
              id: 1,
              login: "author",
              name: "Author",
              avatar: "",
              url: "",
            },
            checksum: "aaa111",
          },
          {
            id: 1,
            num: "1.0.0",
            dl_path: "/api/v1/crates/example/1.0.0/download",
            readme_path: "/api/v1/crates/example/1.0.0/readme",
            created_at: "2024-01-01T10:00:00Z",
            updated_at: "2024-01-01T10:00:00Z",
            downloads: 900,
            features: {},
            yanked: false,
            license: "MIT OR Apache-2.0",
            links: {},
            crate_size: 50000,
            published_by: {
              id: 1,
              login: "author",
              name: "Author",
              avatar: "",
              url: "",
            },
            checksum: "bbb222",
          },
        ],
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("cargo", undefined, client);
      const pkg = await registry.fetchPackage("example");

      expect(pkg.latestVersion).toBe("1.0.0");
      expect(pkg.licenses).toBe("MIT OR Apache-2.0");
    });

    it("should throw NotFoundError for missing cargo crate", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("cargo", undefined, client);

      await expect(registry.fetchPackage("nonexistent-crate-xyz")).rejects.toThrow(NotFoundError);
    });

    it("should fetch cargo versions with yanked status", async () => {
      const client = new Client();
      const mockResponse = {
        crate: {
          id: 1,
          name: "serde",
          updated_at: "2024-01-15T10:00:00Z",
          created_at: "2014-12-20T02:35:07Z",
          downloads: 500000000,
          recent_downloads: 5000000,
          max_version: "1.0.197",
          max_stable_version: "1.0.197",
          newest_version: "1.0.197",
          description: "A generic serialization/deserialization framework",
          homepage: "https://serde.rs",
          documentation: "https://docs.rs/serde",
          repository: "https://github.com/serde-rs/serde",
          keywords: [],
          categories: [],
          badges: [],
          links: {},
        },
        versions: [
          {
            id: 1,
            num: "1.0.196",
            dl_path: "/api/v1/crates/serde/1.0.196/download",
            readme_path: "/api/v1/crates/serde/1.0.196/readme",
            created_at: "2024-01-10T10:00:00Z",
            updated_at: "2024-01-10T10:00:00Z",
            downloads: 40000000,
            features: {},
            yanked: true,
            license: "MIT OR Apache-2.0",
            links: {},
            crate_size: 100000,
            published_by: {
              id: 1,
              login: "dtolnay",
              name: "David Tolnay",
              avatar: "https://avatars.githubusercontent.com/u/1617736?v=4",
              url: "https://github.com/dtolnay",
            },
            checksum: "abc123def455",
          },
          {
            id: 2,
            num: "1.0.197",
            dl_path: "/api/v1/crates/serde/1.0.197/download",
            readme_path: "/api/v1/crates/serde/1.0.197/readme",
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-01-15T10:00:00Z",
            downloads: 50000000,
            features: {},
            yanked: false,
            license: "MIT OR Apache-2.0",
            links: {},
            crate_size: 100000,
            published_by: {
              id: 1,
              login: "dtolnay",
              name: "David Tolnay",
              avatar: "https://avatars.githubusercontent.com/u/1617736?v=4",
              url: "https://github.com/dtolnay",
            },
            checksum: "abc123def456",
          },
        ],
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("cargo", undefined, client);
      const versions = await registry.fetchVersions("serde");

      expect(versions).toHaveLength(2);
      expect(versions[0].number).toBe("1.0.196");
      expect(versions[0].status).toBe("yanked");
      expect(versions[0].integrity).toContain("sha256");
      expect(versions[1].number).toBe("1.0.197");
      expect(versions[1].status).toBe("");
      expect(versions[0].metadata.crateSize).toBe(100000);
      expect(versions[0].metadata.downloads).toBe(40000000);
      expect(versions[1].metadata.crateSize).toBe(100000);
    });
  });

  describe("pypi registry", () => {
    it("should fetch and normalize pypi package", async () => {
      const client = new Client();
      const mockResponse = {
        info: {
          name: "requests",
          version: "2.31.0",
          summary: "Python HTTP for Humans.",
          description: "Requests is a simple, yet elegant, HTTP library.",
          license: "Apache 2.0",
          keywords: "requests, urllib, httplib",
          author: "Kenneth Reitz",
          author_email: "me@kennethreitz.org",
          project_urls: {
            Homepage: "https://requests.readthedocs.io",
            "Source Code": "https://github.com/psf/requests",
            Documentation: "https://requests.readthedocs.io",
          },
          requires_dist: [
            "charset-normalizer (<4,>=2)",
            "idna (<4,>=2.5)",
            "urllib3 (<3,>=1.21.1)",
            "certifi (>=2017.4.17)",
          ],
        },
        releases: {
          "2.30.0": [
            {
              filename: "requests-2.30.0-py3-none-any.whl",
              url: "https://files.pythonhosted.org/packages/requests-2.30.0-py3-none-any.whl",
              upload_time_iso_8601: "2023-05-15T10:00:00Z",
              yanked: false,
              digests: {
                sha256: "abc123def456",
              },
            },
          ],
          "2.31.0": [
            {
              filename: "requests-2.31.0-py3-none-any.whl",
              url: "https://files.pythonhosted.org/packages/requests-2.31.0-py3-none-any.whl",
              upload_time_iso_8601: "2023-10-15T10:00:00Z",
              yanked: false,
              digests: {
                sha256: "def456ghi789",
              },
            },
          ],
        },
        urls: [],
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("pypi", undefined, client);
      const pkg = await registry.fetchPackage("requests");

      expect(pkg.name).toBe("requests");
      expect(pkg.description).toContain("Python HTTP");
      expect(pkg.licenses).toBe("Apache-2.0");
      expect(pkg.repository).toContain("github.com/psf/requests");
      expect(pkg.latestVersion).toBe("2.31.0");
      expect(pkg.namespace).toBe("");
      expect(pkg.documentation).toBe("https://requests.readthedocs.io");
    });

    it("should throw NotFoundError for missing pypi package", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("pypi", undefined, client);

      await expect(registry.fetchPackage("nonexistent-package-xyz")).rejects.toThrow(NotFoundError);
    });

    it("should fetch pypi versions with yanked status", async () => {
      const client = new Client();
      const mockResponse = {
        info: {
          name: "requests",
          version: "2.31.0",
          summary: "Python HTTP for Humans.",
          description: "Requests is a simple, yet elegant, HTTP library.",
          license: "Apache 2.0",
          keywords: "requests, urllib, httplib",
          author: "Kenneth Reitz",
          author_email: "me@kennethreitz.org",
          project_urls: {
            Homepage: "https://requests.readthedocs.io",
          },
          requires_dist: null,
        },
        releases: {
          "2.30.0": [
            {
              filename: "requests-2.30.0-py3-none-any.whl",
              url: "https://files.pythonhosted.org/packages/requests-2.30.0-py3-none-any.whl",
              upload_time_iso_8601: "2023-05-15T10:00:00Z",
              yanked: false,
              digests: {
                sha256: "abc123def456",
              },
            },
          ],
          "2.31.0": [
            {
              filename: "requests-2.31.0-py3-none-any.whl",
              url: "https://files.pythonhosted.org/packages/requests-2.31.0-py3-none-any.whl",
              upload_time_iso_8601: "2023-10-15T10:00:00Z",
              yanked: true,
              digests: {
                sha256: "def456ghi789",
              },
            },
          ],
        },
        urls: [],
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("pypi", undefined, client);
      const versions = await registry.fetchVersions("requests");

      expect(versions).toHaveLength(2);
      expect(versions[0].number).toBe("2.30.0");
      expect(versions[0].status).toBe("");
      expect(versions[0].integrity).toContain("sha256");
      expect(versions[1].number).toBe("2.31.0");
      expect(versions[1].status).toBe("yanked");
    });
  });

  describe("rubygems registry", () => {
    it("should fetch and normalize rubygems gem", async () => {
      const client = new Client();
      const mockResponse = {
        name: "rails",
        description: "Ruby on Rails is a web-application framework",
        homepage_uri: "https://rubyonrails.org",
        source_code_uri: "https://github.com/rails/rails",
        licenses: ["MIT"],
        metadata: {
          homepage_uri: "https://rubyonrails.org",
          source_code_uri: "https://github.com/rails/rails",
        },
        dependencies: {
          runtime: [
            {
              name: "actioncable",
              requirements: "= 7.0.0",
            },
            {
              name: "actionmailbox",
              requirements: "= 7.0.0",
            },
          ],
          development: [
            {
              name: "bundler",
              requirements: ">= 1.15.0",
            },
          ],
        },
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("gem", undefined, client);
      const pkg = await registry.fetchPackage("rails");

      expect(pkg.name).toBe("rails");
      expect(pkg.description).toContain("Ruby on Rails");
      expect(pkg.licenses).toBe("MIT");
      expect(pkg.repository).toContain("github.com/rails/rails");
      expect(pkg.namespace).toBe("");
    });

    it("should throw NotFoundError for missing rubygems gem", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("gem", undefined, client);

      await expect(registry.fetchPackage("nonexistent-gem-xyz")).rejects.toThrow(NotFoundError);
    });

    it("should fetch rubygems versions with yanked status", async () => {
      const client = new Client();
      const mockResponse = [
        {
          number: "7.0.0",
          sha: "abc123def456",
          created_at: "2021-12-15T10:00:00Z",
          yanked: false,
        },
        {
          number: "7.0.1",
          sha: "def456ghi789",
          created_at: "2021-12-20T10:00:00Z",
          yanked: true,
        },
        {
          number: "7.0.2",
          sha: "ghi789jkl012",
          created_at: "2021-12-25T10:00:00Z",
          yanked: false,
        },
      ];

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("gem", undefined, client);
      const versions = await registry.fetchVersions("rails");

      expect(versions).toHaveLength(3);
      expect(versions[0].number).toBe("7.0.0");
      expect(versions[0].status).toBe("");
      expect(versions[0].integrity).toContain("sha256");
      expect(versions[1].number).toBe("7.0.1");
      expect(versions[1].status).toBe("yanked");
      expect(versions[2].number).toBe("7.0.2");
      expect(versions[2].status).toBe("");
    });

    it("should fetch version-specific dependencies via v2 API", async () => {
      const client = new Client();
      const mockResponse = {
        name: "rails",
        version: "5.0.0",
        description: "Ruby on Rails is a web-application framework",
        licenses: ["MIT"],
        dependencies: {
          runtime: [
            { name: "actioncable", requirements: "= 5.0.0" },
            { name: "activesupport", requirements: "= 5.0.0" },
          ],
          development: [{ name: "bundler", requirements: ">= 1.15.0" }],
        },
      };

      const spy = vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("gem", undefined, client);
      const deps = await registry.fetchDependencies("rails", "5.0.0");

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/rubygems/rails/versions/5.0.0.json"),
        undefined,
      );

      expect(deps).toHaveLength(3);
      expect(deps[0].name).toBe("actioncable");
      expect(deps[0].requirements).toBe("= 5.0.0");
      expect(deps[0].scope).toBe("runtime");
      expect(deps[1].name).toBe("activesupport");
      expect(deps[1].scope).toBe("runtime");
      expect(deps[2].name).toBe("bundler");
      expect(deps[2].scope).toBe("development");
    });

    it("should throw NotFoundError for missing gem version", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("gem", undefined, client);

      await expect(registry.fetchDependencies("rails", "0.0.0")).rejects.toThrow(NotFoundError);
    });
  });

  describe("packagist registry", () => {
    it("should fetch and normalize packagist package", async () => {
      const client = new Client();
      const mockResponse = {
        package: {
          name: "laravel/framework",
          description: "The Laravel Framework.",
          repository: "https://github.com/laravel/framework",
          keywords: ["framework", "laravel"],
          versions: {
            "10.0.0": {
              name: "laravel/framework",
              version: "10.0.0",
              license: ["MIT"],
              keywords: ["framework", "laravel"],
              authors: [
                {
                  name: "Taylor Otwell",
                  email: "taylor@laravel.com",
                  homepage: "https://github.com/taylorotwell",
                  role: "creator",
                },
              ],
              require: {
                php: "^8.1",
                "laravel/serializable-closure": "^1.3",
              },
              "require-dev": {
                "phpunit/phpunit": "^10.0",
              },
              source: {
                type: "git",
                url: "https://github.com/laravel/framework.git",
                reference: "abc123def456",
              },
              dist: {
                type: "zip",
                url: "https://api.github.com/repos/laravel/framework/zipball/abc123def456",
                reference: "abc123def456",
                shasum: "abc123def456789",
              },
              time: "2023-02-14T10:00:00Z",
            },
            "10.1.0": {
              name: "laravel/framework",
              version: "10.1.0",
              license: ["MIT"],
              keywords: ["framework", "laravel"],
              authors: [
                {
                  name: "Taylor Otwell",
                  email: "taylor@laravel.com",
                  homepage: "https://github.com/taylorotwell",
                  role: "creator",
                },
              ],
              require: {
                php: "^8.1",
              },
              "require-dev": {},
              source: {
                type: "git",
                url: "https://github.com/laravel/framework.git",
                reference: "def456ghi789",
              },
              dist: {
                type: "zip",
                url: "https://api.github.com/repos/laravel/framework/zipball/def456ghi789",
                reference: "def456ghi789",
                shasum: "def456ghi789012",
              },
              time: "2023-03-14T10:00:00Z",
            },
          },
        },
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("composer", undefined, client);
      const pkg = await registry.fetchPackage("laravel/framework");

      expect(pkg.name).toBe("laravel/framework");
      expect(pkg.description).toBe("The Laravel Framework.");
      expect(pkg.licenses).toBe("MIT");
      expect(pkg.repository).toContain("github.com/laravel/framework");
      expect(pkg.namespace).toBe("laravel");
      expect(pkg.latestVersion).toBe("10.1.0");
    });

    it("should throw NotFoundError for missing packagist package", async () => {
      const client = new Client();

      vi.spyOn(client, "getJSON").mockRejectedValueOnce(
        new HTTPError(404, "https://mock/not-found", "Not Found"),
      );

      const registry = create("composer", undefined, client);

      await expect(registry.fetchPackage("nonexistent/package")).rejects.toThrow(NotFoundError);
    });

    it("should fetch packagist versions with licenses", async () => {
      const client = new Client();
      const mockResponse = {
        package: {
          name: "laravel/framework",
          description: "The Laravel Framework.",
          repository: "https://github.com/laravel/framework",
          keywords: ["framework", "laravel"],
          versions: {
            "10.0.0": {
              name: "laravel/framework",
              version: "10.0.0",
              license: ["MIT"],
              keywords: ["framework", "laravel"],
              authors: [],
              require: {},
              "require-dev": {},
              source: {
                type: "git",
                url: "https://github.com/laravel/framework.git",
                reference: "abc123def456",
              },
              dist: {
                type: "zip",
                url: "https://api.github.com/repos/laravel/framework/zipball/abc123def456",
                reference: "abc123def456",
                shasum: "abc123def456789",
              },
              time: "2023-02-14T10:00:00Z",
            },
            "10.1.0": {
              name: "laravel/framework",
              version: "10.1.0",
              license: ["MIT", "Apache-2.0"],
              keywords: ["framework", "laravel"],
              authors: [],
              require: {},
              "require-dev": {},
              source: {
                type: "git",
                url: "https://github.com/laravel/framework.git",
                reference: "def456ghi789",
              },
              dist: {
                type: "zip",
                url: "https://api.github.com/repos/laravel/framework/zipball/def456ghi789",
                reference: "def456ghi789",
                shasum: "def456ghi789012",
              },
              time: "2023-03-14T10:00:00Z",
            },
          },
        },
      };

      vi.spyOn(client, "getJSON").mockResolvedValueOnce(mockResponse);

      const registry = create("composer", undefined, client);
      const versions = await registry.fetchVersions("laravel/framework");

      expect(versions).toHaveLength(2);
      expect(versions[0].number).toBe("10.0.0");
      expect(versions[0].licenses).toBe("MIT");
      expect(versions[0].integrity).toContain("sha1");
      expect(versions[1].number).toBe("10.1.0");
      expect(versions[1].licenses).toContain("MIT");
      expect(versions[1].licenses).toContain("Apache-2.0");
    });
  });
});
