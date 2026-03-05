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

/** npm registry API response for a single package. */
interface NpmPackageResponse {
  name: string
  description?: string
  homepage?: string
  repository?: {
    type?: string
    url?: string
  } | string
  license?: string | {
    type?: string
  }
  keywords?: string[]
  'dist-tags': {
    latest: string
  }
  versions: Record<string, NpmVersion>
  time?: Record<string, string>
}

/** npm version data. */
interface NpmVersion {
  name: string
  version: string
  description?: string
  license?: string | {
    type?: string
  }
  keywords?: string[]
  author?: {
    name?: string
    email?: string
    url?: string
  }
  contributors?: Array<{
    name?: string
    email?: string
    url?: string
  }>
  maintainers?: Array<{
    name?: string
    email?: string
    url?: string
  }>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  dist?: {
    integrity?: string
    shasum?: string
    tarball?: string
  }
  deprecated?: boolean | string
}

/** npm registry client. */
class NpmRegistry implements Registry {
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
    return 'npm'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const encodedName = this.encodeName(name)
    const url = `${this.baseURL}/${encodedName}`

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal)

      const latestVersion = data['dist-tags'].latest
      const latestVersionData = data.versions[latestVersion]

      const licenses = this.extractLicense(data.license || latestVersionData?.license)
      const namespace = this.extractNamespace(name)

      return {
        name: data.name,
        description: data.description || '',
        homepage: data.homepage || '',
        documentation: '',
        repository: normalizeRepositoryURL(data.repository || ''),
        licenses,
        keywords: data.keywords || [],
        namespace,
        latestVersion,
        metadata: {},
      }
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('npm', name)
      }
      throw error
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const encodedName = this.encodeName(name)
    const url = `${this.baseURL}/${encodedName}`

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal)
      const versions: Version[] = []

      for (const [versionStr, versionData] of Object.entries(data.versions)) {
        const licenses = this.extractLicense(versionData.license)
        const publishedAt = data.time?.[versionStr] ? new Date(data.time[versionStr]) : null

        const status = versionData.deprecated ? 'deprecated' : ''

        const integrity = versionData.dist?.integrity
          ? versionData.dist.integrity
          : versionData.dist?.shasum
            ? `sha1-${versionData.dist.shasum}`
            : ''

        versions.push({
          number: versionStr,
          publishedAt,
          licenses,
          integrity,
          status,
          metadata: {},
        })
      }

      return versions
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('npm', name)
      }
      throw error
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const encodedName = this.encodeName(name)
    const url = `${this.baseURL}/${encodedName}`

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal)
      const versionData = data.versions[version]

      if (!versionData) {
        throw new NotFoundError('npm', name, version)
      }

      const dependencies: Dependency[] = []

      // Runtime dependencies
      if (versionData.dependencies) {
        for (const [depName, requirements] of Object.entries(versionData.dependencies)) {
          dependencies.push({
            name: depName,
            requirements,
            scope: 'runtime',
            optional: false,
          })
        }
      }

      // Development dependencies
      if (versionData.devDependencies) {
        for (const [depName, requirements] of Object.entries(versionData.devDependencies)) {
          dependencies.push({
            name: depName,
            requirements,
            scope: 'development',
            optional: false,
          })
        }
      }

      // Optional dependencies
      if (versionData.optionalDependencies) {
        for (const [depName, requirements] of Object.entries(versionData.optionalDependencies)) {
          dependencies.push({
            name: depName,
            requirements,
            scope: 'runtime',
            optional: true,
          })
        }
      }

      // Peer dependencies
      if (versionData.peerDependencies) {
        for (const [depName, requirements] of Object.entries(versionData.peerDependencies)) {
          dependencies.push({
            name: depName,
            requirements,
            scope: 'runtime',
            optional: false,
          })
        }
      }

      return dependencies
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('npm', name, version)
      }
      throw error
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const encodedName = this.encodeName(name)
    const url = `${this.baseURL}/${encodedName}`

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal)
      const maintainers: Maintainer[] = []
      const seen = new Set<string>()

      // Collect from maintainers field
      if (data.versions) {
        for (const versionData of Object.values(data.versions)) {
          if (versionData.maintainers) {
            for (const maintainer of versionData.maintainers) {
              const key = `${maintainer.name}:${maintainer.email}`
              if (!seen.has(key)) {
                seen.add(key)
                maintainers.push({
                  uuid: '',
                  login: maintainer.email ? maintainer.email.split('@')[0] : '',
                  name: maintainer.name || '',
                  email: maintainer.email || '',
                  url: maintainer.url || '',
                  role: '',
                })
              }
            }
          }

          // Collect from author field
          if (versionData.author) {
            const key = `${versionData.author.name}:${versionData.author.email}`
            if (!seen.has(key)) {
              seen.add(key)
              maintainers.push({
                uuid: '',
                login: versionData.author.email ? versionData.author.email.split('@')[0] : '',
                name: versionData.author.name || '',
                email: versionData.author.email || '',
                url: versionData.author.url || '',
                role: 'author',
              })
            }
          }

          // Collect from contributors field
          if (versionData.contributors) {
            for (const contributor of versionData.contributors) {
              const key = `${contributor.name}:${contributor.email}`
              if (!seen.has(key)) {
                seen.add(key)
                maintainers.push({
                  uuid: '',
                  login: contributor.email ? contributor.email.split('@')[0] : '',
                  name: contributor.name || '',
                  email: contributor.email || '',
                  url: contributor.url || '',
                  role: 'contributor',
                })
              }
            }
          }
        }
      }

      return maintainers
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('npm', name)
      }
      throw error
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const base = `https://www.npmjs.com/package/${name}`
        return version ? `${base}/v/${version}` : base
      },
      download: (name: string, version: string) => {
        const encodedName = this.encodeName(name)
        const tarballName = name.includes('/') ? name.split('/')[1] : name
        return `https://registry.npmjs.org/${encodedName}/-/${tarballName}-${version}.tgz`
      },
      documentation: (name: string, _version?: string) => {
        return `https://www.npmjs.com/package/${name}`
      },
      readme: (name: string, version?: string) => {
        const ver = version ? `@${version}` : ''
        return `https://cdn.jsdelivr.net/npm/${name}${ver}/README.md`
      },
      purl: (name: string, version?: string) => {
        const versionSuffix = version ? `@${version}` : ''
        return `pkg:npm/${name}${versionSuffix}`
      },
    }
  }

  /** Encode package name for URL (handle scoped packages). */
  private encodeName(name: string): string {
    if (name.startsWith('@')) {
      return name.replace('/', '%2F')
    }
    return name
  }

  /** Extract namespace from scoped package name. */
  private extractNamespace(name: string): string {
    if (name.startsWith('@')) {
      const parts = name.split('/')
      return parts[0] || ''
    }
    return ''
  }

  /** Extract and normalize license. */
  private extractLicense(raw: string | { type?: string } | undefined): string {
    if (!raw) return ''

    if (typeof raw === 'string') {
      return normalizeLicense(raw)
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>
      if (typeof obj['type'] === 'string') {
        return normalizeLicense(obj['type'])
      }
    }

    return ''
  }
}

/** Factory function for creating npm registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new NpmRegistry(baseURL, client)
}

// Self-register on import
register('npm', 'https://registry.npmjs.org', factory)
