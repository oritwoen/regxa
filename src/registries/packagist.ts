import type { Client } from '../core/client.ts'
import type {
  Dependency,
  Maintainer,
  Package,
  Registry,
  RegistryFactory,
  URLBuilder,
  Version,
} from '../core/types.ts'
import { register } from '../core/registry.ts'
import { HTTPError, NotFoundError, InvalidPURLError } from '../core/errors.ts'
import { combineLicenses } from '../core/license.ts'
import { normalizeRepositoryURL } from '../core/repository.ts'

/** Packagist API response for a single package. */
interface PackagistPackageResponse {
  package: {
    name: string
    description: string
    repository?: string
    keywords?: string[]
    versions: Record<string, PackagistVersion>
  }
}

/** Packagist version data. */
interface PackagistVersion {
  name: string
  version: string
  license?: string | string[]
  keywords?: string[]
  authors?: Array<{
    name?: string
    email?: string
    homepage?: string
    role?: string
  }>
  require?: Record<string, string>
  'require-dev'?: Record<string, string>
  source?: {
    type?: string
    url?: string
    reference?: string
  }
  dist?: {
    type?: string
    url?: string
    reference?: string
    shasum?: string
  }
  time?: string
}

/** Packagist registry client. */
class PackagistRegistry implements Registry {
  constructor(
    baseURL: string,
    client: Client,
  ) {
    this.baseURL = baseURL
    this.client = client
  }

  readonly baseURL: string
  readonly client: Client

  ecosystem(): string {
    return 'composer'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const [vendor, pkg] = this.parseName(name)
    const url = `${this.baseURL}/packages/${vendor}/${pkg}.json`

    try {
      const data = await this.client.getJSON<PackagistPackageResponse>(url, signal)
      const packageData = data.package

      // Find latest version
      const versions = Object.keys(packageData.versions)
      const latestVersion = this.findLatestVersion(versions)

      // Get license from latest version
      const latestVersionData = packageData.versions[latestVersion]
      const licenses = this.extractLicenses(latestVersionData.license)

      return {
        name: packageData.name,
        description: packageData.description || '',
        homepage: '',
        documentation: '',
        repository: normalizeRepositoryURL(packageData.repository || latestVersionData.source?.url || ''),
        licenses,
        keywords: packageData.keywords || [],
        namespace: vendor,
        latestVersion,
        metadata: {},
      }
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('composer', name)
      }
      throw error
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const [vendor, pkg] = this.parseName(name)
    const url = `${this.baseURL}/packages/${vendor}/${pkg}.json`

    try {
      const data = await this.client.getJSON<PackagistPackageResponse>(url, signal)
      const versions: Version[] = []

      for (const [versionStr, versionData] of Object.entries(data.package.versions)) {
        const licenses = this.extractLicenses(versionData.license)
        const publishedAt = versionData.time ? new Date(versionData.time) : null

        versions.push({
          number: versionStr,
          publishedAt,
          licenses,
          integrity: versionData.dist?.shasum ? `sha1-${versionData.dist.shasum}` : '',
          status: '',
          metadata: {},
        })
      }

      return versions
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('composer', name)
      }
      throw error
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const [vendor, pkg] = this.parseName(name)
    const url = `${this.baseURL}/packages/${vendor}/${pkg}.json`

    try {
      const data = await this.client.getJSON<PackagistPackageResponse>(url, signal)
      const versionData = data.package.versions[version]

      if (!versionData) {
        throw new NotFoundError('composer', name, version)
      }

      const dependencies: Dependency[] = []

      // Runtime dependencies
      if (versionData.require) {
        for (const [depName, requirements] of Object.entries(versionData.require)) {
          if (!this.shouldSkipDependency(depName)) {
            dependencies.push({
              name: depName,
              requirements,
              scope: 'runtime',
              optional: false,
            })
          }
        }
      }

      // Development dependencies
      if (versionData['require-dev']) {
        for (const [depName, requirements] of Object.entries(versionData['require-dev'])) {
          if (!this.shouldSkipDependency(depName)) {
            dependencies.push({
              name: depName,
              requirements,
              scope: 'development',
              optional: false,
            })
          }
        }
      }

      return dependencies
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('composer', name, version)
      }
      throw error
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const [vendor, pkg] = this.parseName(name)
    const url = `${this.baseURL}/packages/${vendor}/${pkg}.json`

    try {
      const data = await this.client.getJSON<PackagistPackageResponse>(url, signal)
      const maintainers: Maintainer[] = []
      const seen = new Set<string>()

      // Collect authors from all versions
      for (const versionData of Object.values(data.package.versions)) {
        if (versionData.authors) {
          for (const author of versionData.authors) {
            const key = `${author.name}:${author.email}`
            if (!seen.has(key)) {
              seen.add(key)
              maintainers.push({
                uuid: '',
                login: author.email ? author.email.split('@')[0] : '',
                name: author.name || '',
                email: author.email || '',
                url: author.homepage || '',
                role: author.role || '',
              })
            }
          }
        }
      }

      return maintainers
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('composer', name)
      }
      throw error
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const [vendor, pkg] = this.parseName(name)
        const base = `https://packagist.org/packages/${vendor}/${pkg}`
        return version ? `${base}#${version}` : base
      },
      download: (name: string, version: string) => {
        const [vendor, pkg] = this.parseName(name)
        return `https://repo.packagist.org/p/${vendor}/${pkg}/${version}.json`
      },
      documentation: (name: string, _version?: string) => {
        const [vendor, pkg] = this.parseName(name)
        return `https://packagist.org/packages/${vendor}/${pkg}`
      },
      readme: (name: string, _version?: string) => {
        const [vendor, pkg] = this.parseName(name)
        return `https://packagist.org/packages/${vendor}/${pkg}`
      },
      purl: (name: string, version?: string) => {
        const versionSuffix = version ? `@${version}` : ''
        return `pkg:composer/${name}${versionSuffix}`
      },
    }
  }

  /** Parse "vendor/package" format. */
  private parseName(name: string): [string, string] {
    const parts = name.split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new InvalidPURLError(`pkg:composer/${name}`, 'invalid Composer package name, expected "vendor/package" format')
    }
    return [parts[0]!, parts[1]!]
  }

  /** Find the highest non-dev version. */
  private findLatestVersion(versions: string[]): string {
    // Filter out dev versions
    const stable = versions.filter(v => !v.startsWith('dev-'))
    if (stable.length === 0) {
      return versions[0] || ''
    }

    // Sort by semantic versioning (simplified)
    return stable.sort((a, b) => {
      // Remove 'v' prefix if present
      const aClean = a.replace(/^v/, '')
      const bClean = b.replace(/^v/, '')

      // Try numeric comparison for simple versions
      const aParts = aClean.split('.').map(p => Number.parseInt(p, 10))
      const bParts = bClean.split('.').map(p => Number.parseInt(p, 10))

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] ?? 0
        const bPart = bParts[i] ?? 0
        if (aPart !== bPart) {
          return bPart - aPart
        }
      }

      return 0
    })[0] || versions[0] || ''
  }

  /** Extract and normalize licenses. */
  private extractLicenses(raw: string | string[] | undefined): string {
    if (!raw) return ''

    const licenses = Array.isArray(raw) ? raw : [raw]
    return combineLicenses(licenses)
  }

  /** Skip PHP and extension dependencies. */
  private shouldSkipDependency(name: string): boolean {
    return name === 'php' || name.startsWith('ext-')
  }
}

/** Factory function for creating Packagist registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new PackagistRegistry(baseURL, client)
}

// Self-register on import
register('composer', 'https://packagist.org', factory)
