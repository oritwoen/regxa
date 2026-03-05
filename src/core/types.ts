import type { Client } from './client.ts'

/** Normalized package metadata returned by any registry. */
export interface Package {
  name: string
  description: string
  homepage: string
  documentation: string
  repository: string
  licenses: string
  keywords: string[]
  namespace: string
  latestVersion: string
  metadata: Record<string, unknown>
}

/** A single version entry of a package. */
export interface Version {
  number: string
  publishedAt: Date | null
  licenses: string
  integrity: string
  status: VersionStatus
  metadata: Record<string, unknown>
}

/** Dependency of a package version. */
export interface Dependency {
  name: string
  requirements: string
  scope: Scope
  optional: boolean
}

/** Maintainer / author of a package. */
export interface Maintainer {
  uuid: string
  login: string
  name: string
  email: string
  url: string
  role: string
}

export type VersionStatus = '' | 'yanked' | 'deprecated' | 'retracted'
export type Scope = 'runtime' | 'development' | 'test' | 'build' | 'optional'

/** URL builder for a specific registry. */
export interface URLBuilder {
  registry(name: string, version?: string): string
  download(name: string, version: string): string
  documentation(name: string, version?: string): string
  purl(name: string, version?: string): string
}

/** Common interface every registry must implement. */
export interface Registry {
  ecosystem(): string
  fetchPackage(name: string, signal?: AbortSignal): Promise<Package>
  fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]>
  fetchDependencies(name: string, version: string, signal?: AbortSignal): Promise<Dependency[]>
  fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]>
  urls(): URLBuilder
}

/** Factory function signature for creating registry instances. */
export type RegistryFactory = (baseURL: string, client: Client) => Registry

/** Options for the HTTP client. */
export interface ClientOptions {
  maxRetries?: number
  baseDelay?: number
  timeout?: number
  rateLimiter?: RateLimiter
  userAgent?: string
}

/** Rate limiter interface — bring your own implementation. */
export interface RateLimiter {
  wait(signal?: AbortSignal): Promise<void>
}

/** Parsed PURL components. */
export interface ParsedPURL {
  type: string
  namespace: string
  name: string
  version: string
  qualifiers: Record<string, string>
  subpath: string
}

