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
import { combineLicenses, normalizeLicense } from '../core/license.ts'
import { normalizeRepositoryURL } from '../core/repository.ts'

/** RubyGems API response for a single gem. */
interface RubyGemsGemResponse {
  name: string
  version?: string
  description: string
  homepage_uri?: string
  documentation_uri?: string
  source_code_uri?: string
  licenses?: string[]
  metadata?: Record<string, unknown>
  dependencies?: {
    runtime?: Array<{
      name: string
      requirements: string
    }>
    development?: Array<{
      name: string
      requirements: string
    }>
  }
}

/** RubyGems version data. */
interface RubyGemsVersionResponse {
  number: string
  sha: string
  created_at?: string
  yanked?: boolean
}

/** RubyGems owner data. */
interface RubyGemsOwnerResponse {
  handle: string
  email?: string
}

/** RubyGems registry client. */
class RubyGemsRegistry implements Registry {
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
    return 'gem'
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const url = `${this.baseURL}/api/v1/gems/${name}.json`

    try {
      const data = await this.client.getJSON<RubyGemsGemResponse>(url, signal)

      // Extract licenses
      const licenses = data.licenses ? combineLicenses(data.licenses.map(l => normalizeLicense(l))) : ''

      // Extract repository URL
      const repository = normalizeRepositoryURL(
        data.source_code_uri || (data.metadata?.source_code_uri as string) || data.homepage_uri || ''
      )

      return {
        name: data.name,
        description: data.description || '',
        homepage: data.homepage_uri || '',
        documentation: data.documentation_uri || '',
        repository,
        licenses,
        keywords: [],
        namespace: '',
        latestVersion: data.version || '',
        metadata: data.metadata || {},
      }
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('gem', name)
      }
      throw error
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const url = `${this.baseURL}/api/v1/versions/${name}.json`

    try {
      const data = await this.client.getJSON<RubyGemsVersionResponse[]>(url, signal)
      const versions: Version[] = []

      for (const versionData of data) {
        const publishedAt = versionData.created_at ? new Date(versionData.created_at) : null
        const status = versionData.yanked ? 'yanked' : ''

        versions.push({
          number: versionData.number,
          publishedAt,
          licenses: '',
          integrity: versionData.sha ? `sha256-${versionData.sha}` : '',
          status,
          metadata: {},
        })
      }

      return versions
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('gem', name)
      }
      throw error
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const url = `${this.baseURL}/api/v1/gems/${name}.json`

    try {
      const data = await this.client.getJSON<RubyGemsGemResponse>(url, signal)
      const dependencies: Dependency[] = []

      // Runtime dependencies
      if (data.dependencies?.runtime) {
        for (const dep of data.dependencies.runtime) {
          dependencies.push({
            name: dep.name,
            requirements: dep.requirements,
            scope: 'runtime',
            optional: false,
          })
        }
      }

      // Development dependencies
      if (data.dependencies?.development) {
        for (const dep of data.dependencies.development) {
          dependencies.push({
            name: dep.name,
            requirements: dep.requirements,
            scope: 'development',
            optional: false,
          })
        }
      }

      return dependencies
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('gem', name, version)
      }
      throw error
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const url = `${this.baseURL}/api/v1/gems/${name}/owners.json`

    try {
      const data = await this.client.getJSON<RubyGemsOwnerResponse[]>(url, signal)
      const maintainers: Maintainer[] = []

      for (const owner of data) {
        maintainers.push({
          uuid: '',
          login: owner.handle,
          name: owner.handle,
          email: owner.email || '',
          url: '',
          role: '',
        })
      }

      return maintainers
    }
    catch (error) {
      if (error instanceof HTTPError && error.isNotFound()) {
        throw new NotFoundError('gem', name)
      }
      throw error
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const base = `https://rubygems.org/gems/${name}`
        return version ? `${base}/versions/${version}` : base
      },
      download: (name: string, version: string) => {
        return `https://rubygems.org/downloads/${name}-${version}.gem`
      },
      documentation: (name: string, version?: string) => {
        const versionSuffix = version ? `/${version}` : ''
        return `https://www.rubydoc.info/gems/${name}${versionSuffix}`
      },
      purl: (name: string, version?: string) => {
        const versionSuffix = version ? `@${version}` : ''
        return `pkg:gem/${name}${versionSuffix}`
      },
    }
  }
}

/** Factory function for creating RubyGems registry instances. */
const factory: RegistryFactory = (baseURL: string, client: Client): Registry => {
  return new RubyGemsRegistry(baseURL, client)
}

// Self-register on import
register('gem', 'https://rubygems.org', factory)
