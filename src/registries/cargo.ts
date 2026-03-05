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

/** Crates.io API response for a single crate. */
interface CratesPackageResponse {
  crate: {
    id: number
    name: string
    updated_at: string
    created_at: string
    downloads: number
    recent_downloads: number
    max_version: string
    max_stable_version: string
    newest_version: string
    description: string
    homepage: string
    documentation: string
    repository: string
    keywords: string[]
    categories: Array<{
      id: string
      category: string
      created_at: string
    }>
    badges: unknown[]
    links: Record<string, string>
  }
  versions: CratesVersion[]
}

/** Crates.io version data. */
interface CratesVersion {
  id: number
  num: string
  dl_path: string
  readme_path: string
  created_at: string
  updated_at: string
  downloads: number
  features: Record<string, string[]>
  yanked: boolean
  license: string
  links: Record<string, string>
  crate_size: number
  published_by: {
    id: number
    login: string
    name: string
    avatar: string
    url: string
  }
  checksum: string
}

/** Crates.io dependencies response. */
interface CratesDependenciesResponse {
  dependencies: CratesDependency[]
  meta: {
    prelude: boolean
  }
}

/** Crates.io dependency data. */
interface CratesDependency {
  id: number
  version_id: number
  crate_id: string
  req: string
  optional: boolean
  default_features: boolean
  features: string[]
  target: string | null
  kind: string
  downloads: number
}

/** Crates.io maintainers response. */
interface CratesMaintainersResponse {
  users: CratesMaintainer[]
}

/** Crates.io maintainer data. */
interface CratesMaintainer {
  id: number
  login: string
  name: string
  avatar: string
  url: string
}

/** Crates.io registry client. */
class CargoRegistry implements Registry {
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
    return 'cargo'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const url = `${this.baseURL}/api/v1/crates/${name}`

    try {
      const data = await this.client.getJSON<CratesPackageResponse>(url, signal)
      const crateData = data.crate
      const latestVersion = crateData.max_stable_version || crateData.max_version

      return {
        name: crateData.name,
        description: crateData.description || '',
        homepage: crateData.homepage || '',
        documentation: crateData.documentation || '',
        repository: normalizeRepositoryURL(crateData.repository || ''),
        licenses: normalizeLicense(data.versions[0]?.license || ''),
        keywords: crateData.keywords,
        namespace: '',
        latestVersion,
        metadata: {
          downloads: crateData.downloads,
          recentDownloads: crateData.recent_downloads,
          categories: crateData.categories,
          newestVersion: crateData.newest_version,
          defaultVersion: crateData.max_version,
          updatedAt: crateData.updated_at,
          createdAt: crateData.created_at,
        },
      }
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('cargo', name)
      }
      throw error
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const url = `${this.baseURL}/api/v1/crates/${name}`

    try {
      const data = await this.client.getJSON<CratesPackageResponse>(url, signal)
      const versions: Version[] = []

      for (const versionData of data.versions) {
        const publishedAt = new Date(versionData.created_at)
        const status = versionData.yanked ? 'yanked' : ''

        versions.push({
          number: versionData.num,
          publishedAt,
          licenses: normalizeLicense(versionData.license),
          integrity: `sha256-${versionData.checksum}`,
          status,
          metadata: {
            crateSize: versionData.crate_size,
            features: versionData.features,
            downloads: versionData.downloads,
          },
        })
      }

      return versions
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('cargo', name)
      }
      throw error
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const url = `${this.baseURL}/api/v1/crates/${name}/${version}/dependencies`

    try {
      const data = await this.client.getJSON<CratesDependenciesResponse>(url, signal)
      const dependencies: Dependency[] = []

      for (const dep of data.dependencies) {
        let scope: 'runtime' | 'development' | 'test' | 'build' | 'optional'

        if (dep.kind === 'dev') {
          scope = 'development'
        }
        else if (dep.kind === 'build') {
          scope = 'build'
        }
        else {
          scope = 'runtime'
        }

        dependencies.push({
          name: dep.crate_id,
          requirements: dep.req,
          scope,
          optional: dep.optional,
        })
      }

      return dependencies
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('cargo', name, version)
      }
      throw error
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const url = `${this.baseURL}/api/v1/crates/${name}/owner_user`

    try {
      const data = await this.client.getJSON<CratesMaintainersResponse>(url, signal)
      const maintainers: Maintainer[] = []

      for (const user of data.users) {
        maintainers.push({
          uuid: user.id.toString(),
          login: user.login,
          name: user.name,
          email: '',
          url: user.url,
          role: '',
        })
      }

      return maintainers
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('cargo', name)
      }
      throw error
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const base = `https://crates.io/crates/${name}`
        return version ? `${base}/${version}` : base
      },
      download: (name: string, version: string) => {
        return `https://crates.io/api/v1/crates/${name}/${version}/download`
      },
      documentation: (name: string, version?: string) => {
        return version ? `https://docs.rs/${name}/${version}` : `https://docs.rs/${name}`
      },
      purl: (name: string, version?: string) => {
        const versionSuffix = version ? `@${version}` : ''
        return `pkg:cargo/${name}${versionSuffix}`
      },
    }
  }
}

/** Factory function for creating Cargo registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new CargoRegistry(baseURL, client)
}

// Self-register on import
register('cargo', 'https://crates.io', factory)
