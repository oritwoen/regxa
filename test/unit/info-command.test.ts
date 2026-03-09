import consola from "consola";
import type { Package, Registry } from "../../src/core/types.ts";
import { outputPackageInfo } from "../../src/commands/info.ts";

function createPackage(overrides: Partial<Package> = {}): Package {
  return {
    name: "serde",
    description: "Serialization framework",
    homepage: "",
    documentation: "",
    repository: "",
    licenses: "MIT OR Apache-2.0",
    keywords: [],
    namespace: "",
    latestVersion: "1.0.220",
    metadata: {},
    ...overrides,
  };
}

function createRegistry(registryUrl: string, docsUrl: string): Registry {
  return {
    ecosystem: () => "cargo",
    fetchPackage: async () => createPackage(),
    fetchVersions: async () => [],
    fetchDependencies: async () => [],
    fetchMaintainers: async () => [],
    urls: () => ({
      registry: () => registryUrl,
      download: () => "",
      documentation: () => docsUrl,
      readme: () => "",
      purl: () => "",
    }),
  };
}

function loggedLines(log: ReturnType<typeof vi.spyOn>): string[] {
  return log.mock.calls.map(([message]) => String(message));
}

describe("outputPackageInfo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints docs when documentation url adds new information", () => {
    const log = vi.spyOn(consola, "log").mockImplementation(() => undefined);
    const pkg = createPackage({
      homepage: "https://serde.rs",
      documentation: "https://docs.rs/serde",
      repository: "https://github.com/serde-rs/serde",
    });

    outputPackageInfo(
      pkg,
      "serde",
      createRegistry("https://crates.io/crates/serde", "https://docs.rs/serde/1.0.220"),
    );

    expect(loggedLines(log)).toContain("  \x1b[90mDocs:\x1b[0m       https://docs.rs/serde");
  });

  it("skips docs when the resolved url falls back to homepage", () => {
    const log = vi.spyOn(consola, "log").mockImplementation(() => undefined);
    const pkg = createPackage({
      name: "requests",
      homepage: "https://requests.readthedocs.io",
      latestVersion: "2.32.0",
    });

    outputPackageInfo(
      pkg,
      "requests",
      createRegistry("https://pypi.org/project/requests", "https://pypi.org/project/requests"),
    );

    expect(loggedLines(log).some((line) => line.includes("Docs:"))).toBe(false);
  });

  it("skips docs when the fallback matches the registry page", () => {
    const log = vi.spyOn(consola, "log").mockImplementation(() => undefined);
    const pkg = createPackage({
      name: "lodash",
      latestVersion: "4.17.21",
      licenses: "MIT",
    });

    outputPackageInfo(
      pkg,
      "lodash",
      createRegistry(
        "https://www.npmjs.com/package/lodash",
        "https://www.npmjs.com/package/lodash",
      ),
    );

    expect(loggedLines(log).some((line) => line.includes("Docs:"))).toBe(false);
  });

  it("skips docs when documentation matches repository", () => {
    const log = vi.spyOn(consola, "log").mockImplementation(() => undefined);
    const pkg = createPackage({
      documentation: "https://github.com/serde-rs/serde",
      repository: "https://github.com/serde-rs/serde",
    });

    outputPackageInfo(
      pkg,
      "serde",
      createRegistry("https://crates.io/crates/serde", "https://docs.rs/serde/1.0.220"),
    );

    expect(loggedLines(log).some((line) => line.includes("Docs:"))).toBe(false);
  });
});
