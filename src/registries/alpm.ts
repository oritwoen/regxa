import type { Client } from "../core/client.ts";
import type {
  Dependency,
  Maintainer,
  Package,
  Registry,
  RegistryFactory,
  URLBuilder,
  Version,
} from "../core/types.ts";
import { register } from "../core/registry.ts";
import { HTTPError, NotFoundError } from "../core/errors.ts";
import { combineLicenses } from "../core/license.ts";
import { buildPURL } from "../core/purl.ts";

const AUR_BASE_URL = "https://aur.archlinux.org";

/** Arch Linux official package search response. */
interface ArchSearchResponse {
  results: ArchPackageResult[];
}

/** Arch Linux official package data from search/detail endpoints. */
interface ArchPackageResult {
  pkgname: string;
  pkgbase: string;
  repo: string;
  arch: string;
  pkgver: string;
  pkgrel: string;
  epoch: number;
  pkgdesc: string;
  url: string;
  filename: string;
  compressed_size: number;
  installed_size: number;
  build_date: string;
  last_update: string;
  flag_date: string | null;
  maintainers: string[];
  packager: string;
  groups: string[];
  licenses: string[];
  conflicts: string[];
  provides: string[];
  replaces: string[];
  depends: string[];
  optdepends: string[];
  makedepends: string[];
  checkdepends: string[];
}

/** AUR RPC v5 response wrapper. */
interface AurResponse {
  resultcount: number;
  results: AurPackageResult[];
  type: string;
  version: number;
}

/** AUR package data. */
interface AurPackageResult {
  ID: number;
  Name: string;
  PackageBase: string;
  PackageBaseID: number;
  Version: string;
  Description: string;
  URL: string;
  NumVotes: number;
  Popularity: number;
  OutOfDate: number | null;
  Maintainer: string | null;
  FirstSubmitted: number;
  LastModified: number;
  URLPath: string;
  Depends?: string[];
  OptDepends?: string[];
  MakeDepends?: string[];
  CheckDepends?: string[];
  License?: string[];
  Keywords?: string[];
}

/** ALPM registry client — routes to Arch Linux official repos or AUR based on namespace. */
class AlpmRegistry implements Registry {
  constructor(baseURL: string, client: Client) {
    this.baseURL = baseURL;
    this.client = client;
  }

  readonly baseURL: string;
  readonly client: Client;

  ecosystem(): string {
    return "alpm";
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const { namespace, pkgName } = this.parseName(name);
    this.assertSupportedNamespace(namespace, name);

    if (namespace === "aur") {
      return this.fetchAurPackage(pkgName, signal);
    }

    return this.fetchOfficialPackage(pkgName, signal);
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const { namespace, pkgName } = this.parseName(name);
    this.assertSupportedNamespace(namespace, name);

    if (namespace === "aur") {
      return this.fetchAurVersions(pkgName, signal);
    }

    return this.fetchOfficialVersions(pkgName, signal);
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const { namespace, pkgName } = this.parseName(name);
    this.assertSupportedNamespace(namespace, name);

    if (namespace === "aur") {
      return this.fetchAurDependencies(pkgName, version, signal);
    }

    return this.fetchOfficialDependencies(pkgName, version, signal);
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const { namespace, pkgName } = this.parseName(name);
    this.assertSupportedNamespace(namespace, name);

    if (namespace === "aur") {
      return this.fetchAurMaintainers(pkgName, signal);
    }

    return this.fetchOfficialMaintainers(pkgName, signal);
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, _version?: string) => {
        const { namespace, pkgName } = this.parseName(name);
        if (namespace === "aur") {
          return `https://aur.archlinux.org/packages/${pkgName}`;
        }
        return `https://archlinux.org/packages/?name=${pkgName}`;
      },
      download: (name: string, _version: string) => {
        const { namespace, pkgName } = this.parseName(name);
        if (namespace === "aur") {
          return `https://aur.archlinux.org/cgit/aur.git/snapshot/${pkgName}.tar.gz`;
        }
        const letter = pkgName.charAt(0);
        return `https://archive.archlinux.org/packages/${letter}/${pkgName}/`;
      },
      documentation: (name: string, _version?: string) => {
        const { namespace, pkgName } = this.parseName(name);
        if (namespace === "aur") {
          return `https://aur.archlinux.org/packages/${pkgName}`;
        }
        return `https://wiki.archlinux.org/title/${pkgName}`;
      },
      readme: (_name: string, _version?: string) => {
        return "";
      },
      purl: (name: string, version?: string) => {
        const { namespace, pkgName } = this.parseName(name);
        return buildPURL({ type: "alpm", namespace, name: pkgName, version });
      },
    };
  }

  // --- Official Arch Linux API ---

  private async fetchOfficialPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const result = await this.searchOfficial(name, signal);

    return {
      name: result.pkgname,
      description: result.pkgdesc || "",
      homepage: result.url || "",
      documentation: "",
      repository: "",
      licenses: combineLicenses(result.licenses),
      keywords: result.groups,
      namespace: "arch",
      latestVersion: this.formatVersion(result),
      metadata: {
        repo: result.repo,
        arch: result.arch,
        pkgbase: result.pkgbase,
        compressedSize: result.compressed_size,
        installedSize: result.installed_size,
        buildDate: result.build_date,
        lastUpdate: result.last_update,
        flagDate: result.flag_date,
        packager: result.packager,
        provides: result.provides,
        conflicts: result.conflicts,
        replaces: result.replaces,
      },
    };
  }

  private async fetchOfficialVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const result = await this.searchOfficial(name, signal);

    return [
      {
        number: this.formatVersion(result),
        publishedAt: result.last_update ? new Date(result.last_update) : null,
        licenses: combineLicenses(result.licenses),
        integrity: "",
        status: result.flag_date ? "deprecated" : "",
        metadata: {
          repo: result.repo,
          arch: result.arch,
        },
      },
    ];
  }

  private async fetchOfficialDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const result = await this.searchOfficial(name, signal);
    const currentVersion = this.formatVersion(result);
    this.assertVersionMatches(name, version, currentVersion);

    return this.buildDependencies(
      result.depends,
      result.makedepends,
      result.optdepends,
      result.checkdepends,
    );
  }

  private async fetchOfficialMaintainers(
    name: string,
    signal?: AbortSignal,
  ): Promise<Maintainer[]> {
    const result = await this.searchOfficial(name, signal);

    return result.maintainers.map((m) => ({
      uuid: "",
      login: m,
      name: m,
      email: "",
      url: "",
      role: "maintainer",
    }));
  }

  /** Search official repos by exact package name. Prefers x86_64 results. */
  private async searchOfficial(name: string, signal?: AbortSignal): Promise<ArchPackageResult> {
    const url = `${this.baseURL}/packages/search/json/?name=${encodeURIComponent(name)}`;

    try {
      const data = await this.client.getJSON<ArchSearchResponse>(url, signal);

      if (!data.results || data.results.length === 0) {
        throw new NotFoundError("alpm", name);
      }

      // Prefer x86_64 arch, fall back to first result
      return data.results.find((r) => r.arch === "x86_64") || data.results[0]!;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError("alpm", name);
      }
      throw error;
    }
  }

  // --- AUR API ---

  private async fetchAurPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const result = await this.fetchAurInfo(name, signal);

    return {
      name: result.Name,
      description: result.Description || "",
      homepage: result.URL || "",
      documentation: "",
      repository: "",
      licenses: combineLicenses(result.License || []),
      keywords: result.Keywords || [],
      namespace: "aur",
      latestVersion: result.Version,
      metadata: {
        votes: result.NumVotes,
        popularity: result.Popularity,
        outOfDate: result.OutOfDate,
        pkgbase: result.PackageBase,
        firstSubmitted: result.FirstSubmitted,
        lastModified: result.LastModified,
      },
    };
  }

  private async fetchAurVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const result = await this.fetchAurInfo(name, signal);

    return [
      {
        number: result.Version,
        publishedAt: result.LastModified ? new Date(result.LastModified * 1000) : null,
        licenses: combineLicenses(result.License || []),
        integrity: "",
        status: result.OutOfDate ? "deprecated" : "",
        metadata: {
          votes: result.NumVotes,
          popularity: result.Popularity,
        },
      },
    ];
  }

  private async fetchAurDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const result = await this.fetchAurInfo(name, signal);
    this.assertVersionMatches(`aur/${name}`, version, result.Version);

    return this.buildDependencies(
      result.Depends || [],
      result.MakeDepends || [],
      result.OptDepends || [],
      result.CheckDepends || [],
    );
  }

  private async fetchAurMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const result = await this.fetchAurInfo(name, signal);

    if (!result.Maintainer) return [];

    return [
      {
        uuid: "",
        login: result.Maintainer,
        name: result.Maintainer,
        email: "",
        url: "",
        role: "maintainer",
      },
    ];
  }

  /** Fetch package info from AUR RPC v5. */
  private async fetchAurInfo(name: string, signal?: AbortSignal): Promise<AurPackageResult> {
    const url = `${AUR_BASE_URL}/rpc/v5/info/${encodeURIComponent(name)}`;

    try {
      const data = await this.client.getJSON<AurResponse>(url, signal);

      if (!data.results || data.results.length === 0) {
        throw new NotFoundError("alpm", `aur/${name}`);
      }

      return data.results[0]!;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError("alpm", `aur/${name}`);
      }
      throw error;
    }
  }

  // --- Shared helpers ---

  /** Parse "namespace/name" into components. Defaults to "arch" namespace. */
  private parseName(fullName: string): { namespace: string; pkgName: string } {
    const normalized = fullName.trim().toLowerCase();
    const slashIdx = normalized.indexOf("/");
    if (slashIdx === -1) {
      return { namespace: "arch", pkgName: normalized };
    }
    return {
      namespace: normalized.slice(0, slashIdx),
      pkgName: normalized.slice(slashIdx + 1),
    };
  }

  private assertSupportedNamespace(namespace: string, requestedName: string): void {
    if (namespace !== "arch" && namespace !== "aur") {
      throw new NotFoundError("alpm", requestedName);
    }
  }

  private assertVersionMatches(name: string, requested: string, current: string): void {
    if (requested && requested !== current) {
      throw new NotFoundError("alpm", name, requested);
    }
  }

  /** Format ALPM version: epoch:pkgver-pkgrel (epoch omitted when 0). */
  private formatVersion(result: ArchPackageResult): string {
    const epoch = result.epoch && result.epoch > 0 ? `${result.epoch}:` : "";
    return `${epoch}${result.pkgver}-${result.pkgrel}`;
  }

  /** Build normalized dependency list from ALPM dependency arrays. */
  private buildDependencies(
    depends: string[],
    makedepends: string[],
    optdepends: string[],
    checkdepends: string[],
  ): Dependency[] {
    const dependencies: Dependency[] = [];

    for (const dep of depends) {
      const parsed = this.parseDep(dep);
      dependencies.push({
        name: parsed.name,
        requirements: parsed.requirements,
        scope: "runtime",
        optional: false,
      });
    }

    for (const dep of makedepends) {
      const parsed = this.parseDep(dep);
      dependencies.push({
        name: parsed.name,
        requirements: parsed.requirements,
        scope: "build",
        optional: false,
      });
    }

    for (const dep of optdepends) {
      const parsed = this.parseOptDep(dep);
      dependencies.push({
        name: parsed.name,
        requirements: parsed.requirements,
        scope: "optional",
        optional: true,
      });
    }

    for (const dep of checkdepends) {
      const parsed = this.parseDep(dep);
      dependencies.push({
        name: parsed.name,
        requirements: parsed.requirements,
        scope: "test",
        optional: false,
      });
    }

    return dependencies;
  }

  /** Parse a dependency string like "glibc>=2.33" or "bash". */
  private parseDep(dep: string): { name: string; requirements: string } {
    const match = dep.match(/^([a-zA-Z0-9@._+-]+)(.*)$/);
    if (!match) return { name: dep, requirements: "" };
    return {
      name: match[1]!,
      requirements: match[2]!.trim(),
    };
  }

  /** Parse optional dependency like "perl-locale-gettext: translation support". */
  private parseOptDep(dep: string): { name: string; requirements: string; description: string } {
    const colonIdx = dep.indexOf(":");
    if (colonIdx === -1) {
      const parsed = this.parseDep(dep.trim());
      return { name: parsed.name, requirements: parsed.requirements, description: "" };
    }
    const parsed = this.parseDep(dep.slice(0, colonIdx).trim());

    return {
      name: parsed.name,
      requirements: parsed.requirements,
      description: dep.slice(colonIdx + 1).trim(),
    };
  }
}

/** Factory function for creating ALPM registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new AlpmRegistry(baseURL, client);
};

// Self-register on import
register("alpm", "https://archlinux.org", factory);
