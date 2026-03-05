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
import { HTTPError, NotFoundError } from '../core/errors.ts'
import { normalizeLicense } from '../core/license.ts'
import { normalizeRepositoryURL } from '../core/repository.ts'

/** PyPI JSON API response for a package. */
interface PyPIPackageResponse {
  info: {
    name: string
    version: string
    summary: string
    description: string
    license: string
    keywords: string
    author: string
    author_email: string
    project_urls: Record<string, string>
    requires_dist: string[] | null
  }
  releases: Record<string, PyPIRelease[]>
  urls: PyPIFile[]
}

/** PyPI release file information. */
interface PyPIRelease {
  filename: string
  url: string
  upload_time_iso_8601: string
  yanked: boolean
  digests: {
    sha256: string
  }
}

/** PyPI file information. */
interface PyPIFile {
  filename: string
  url: string
  upload_time_iso_8601: string
  yanked: boolean
  digests: {
    sha256: string
  }
}

/** PyPI registry client. */
class PyPIRegistry implements Registry {
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
    return 'pypi'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const normalized = this.normalizeName(name)
    const url = `${this.baseURL}/pypi/${normalized}/json`

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal)
      const info = data.info

      const licenses = normalizeLicense(info.license)
      const repository = this.extractRepository(info.project_urls)
      const keywords = this.parseKeywords(info.keywords)

      return {
        name: info.name,
        description: info.summary || info.description || '',
        homepage: info.project_urls?.['Homepage'] || '',
        documentation: info.project_urls?.['Documentation'] || '',
        repository,
        licenses,
        keywords,
        namespace: '',
        latestVersion: info.version,
        metadata: {},
      }
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('pypi', name)
      }
      throw error
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const normalized = this.normalizeName(name)
    const url = `${this.baseURL}/pypi/${normalized}/json`

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal)
      const versions: Version[] = []

      for (const [versionStr, releases] of Object.entries(data.releases)) {
        if (releases.length === 0) continue

        const release = releases[0]!
        const publishedAt = release.upload_time_iso_8601
          ? new Date(release.upload_time_iso_8601)
          : null
        const integrity = release.digests?.sha256
          ? `sha256-${release.digests.sha256}`
          : ''
        const status = release.yanked ? 'yanked' : ''

        versions.push({
          number: versionStr,
          publishedAt,
          licenses: '',
          integrity,
          status,
          metadata: {},
        })
      }

      return versions
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('pypi', name)
      }
      throw error
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const normalized = this.normalizeName(name)
    const url = `${this.baseURL}/pypi/${normalized}/${version}/json`

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal)
      const dependencies: Dependency[] = []

      if (data.info.requires_dist) {
        for (const depStr of data.info.requires_dist) {
          const dep = this.parsePEP508(depStr)
          if (dep) {
            dependencies.push(dep)
          }
        }
      }

      return dependencies
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('pypi', name, version)
      }
      throw error
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const normalized = this.normalizeName(name)
    const url = `${this.baseURL}/pypi/${normalized}/json`

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal)
      const maintainers: Maintainer[] = []

      if (data.info.author || data.info.author_email) {
        maintainers.push({
          uuid: '',
          login: data.info.author_email
            ? data.info.author_email.split('@')[0]
            : '',
          name: data.info.author || '',
          email: data.info.author_email || '',
          url: '',
          role: 'author',
        })
      }

      return maintainers
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('pypi', name)
      }
      throw error
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const normalized = this.normalizeName(name)
        const base = `https://pypi.org/project/${normalized}`
        return version ? `${base}/${version}` : base
      },
      download: (name: string, version: string) => {
        const normalized = this.normalizeName(name)
        return `https://pypi.org/pypi/${normalized}/${version}`
      },
      documentation: (name: string, _version?: string) => {
        const normalized = this.normalizeName(name)
        return `https://pypi.org/project/${normalized}`
      },
      readme: (name: string, version?: string) => {
        const normalized = this.normalizeName(name)
        return version
          ? `https://pypi.org/project/${normalized}/${version}/`
          : `https://pypi.org/project/${normalized}/`
      },
      purl: (name: string, version?: string) => {
        const normalized = this.normalizeName(name)
        const versionSuffix = version ? `@${version}` : ''
        return `pkg:pypi/${normalized}${versionSuffix}`
      },
    }
  }

  /** Normalize package name per PEP 503. */
  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/_/g, '-')
  }

  /** Extract repository URL from project_urls. */
  private extractRepository(projectUrls: Record<string, string> | undefined): string {
    if (!projectUrls) return ''

    const keys = ['Repository', 'Source', 'Source Code', 'GitHub', 'Homepage']
    for (const key of keys) {
      const url = projectUrls[key]
      if (url) {
        return normalizeRepositoryURL(url)
      }
    }

    return ''
  }

  /** Parse comma-separated keywords. */
  private parseKeywords(keywords: string | undefined): string[] {
    if (!keywords) return []
    return keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
  }

  /** Parse PEP 508 dependency string. */
  private parsePEP508(depStr: string): Dependency | null {
    // Basic parsing: "name (version_spec) ; extras"
    // For now, extract just the name and requirements
    const parts = depStr.split(';')
    const mainPart = parts[0]!.trim()

    // Extract name and version spec
    const match = mainPart.match(/^([a-zA-Z0-9._-]+)\s*(.*)$/)
    if (!match) return null

    const depName = match[1]!
    const versionSpec = match[2]!.trim()

    // Determine scope based on extras (simplified)
    let scope: 'runtime' | 'development' | 'test' | 'build' | 'optional' = 'runtime'
    let optional = false

    if (parts.length > 1) {
      const extras = parts[1]!.toLowerCase()
      if (extras.includes('extra')) {
        optional = true
      }
      if (extras.includes('dev')) {
        scope = 'development'
      }
      if (extras.includes('test')) {
        scope = 'test'
      }
    }

    return {
      name: depName,
      requirements: versionSpec,
      scope,
      optional,
    }
  }
}

/** Factory function for creating PyPI registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new PyPIRegistry(baseURL, client)
}

// Self-register on import
register('pypi', 'https://pypi.org', factory)
