import type { Package, Version, Dependency, Maintainer, URLBuilder } from './core/types.ts'
import type { Client } from './core/client.ts'
import { createFromPURL } from './core/purl.ts'
import { InvalidPURLError } from './core/errors.ts'

/** Fetch normalized package metadata from a PURL. */
export async function fetchPackageFromPURL(purl: string, signal?: AbortSignal, client?: Client): Promise<Package> {
  const [reg, name] = createFromPURL(purl, client)
  return reg.fetchPackage(name, signal)
}

/** Fetch all versions from a PURL. */
export async function fetchVersionsFromPURL(purl: string, signal?: AbortSignal, client?: Client): Promise<Version[]> {
  const [reg, name] = createFromPURL(purl, client)
  return reg.fetchVersions(name, signal)
}

/** Fetch dependencies for a specific version from a PURL. */
export async function fetchDependenciesFromPURL(purl: string, signal?: AbortSignal, client?: Client): Promise<Dependency[]> {
  const [reg, name, version] = createFromPURL(purl, client)
  if (!version) {
    throw new InvalidPURLError(purl, 'must include a version for dependency lookup')
  }
  return reg.fetchDependencies(name, version, signal)
}

/** Fetch maintainers from a PURL. */
export async function fetchMaintainersFromPURL(purl: string, signal?: AbortSignal, client?: Client): Promise<Maintainer[]> {
  const [reg, name] = createFromPURL(purl, client)
  return reg.fetchMaintainers(name, signal)
}

const DEFAULT_CONCURRENCY = 15

/** Bulk fetch packages from multiple PURLs, with concurrency limit. */
export async function bulkFetchPackages(
  purls: string[],
  options?: { concurrency?: number, signal?: AbortSignal, client?: Client },
): Promise<Map<string, Package>> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  const results = new Map<string, Package>()
  const queue = [...purls]

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const purl = queue.shift()!
      try {
        const pkg = await fetchPackageFromPURL(purl, options?.signal, options?.client)
        results.set(purl, pkg)
      }
      catch {
        // Silently skip failed lookups — absent from results map
      }
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * Select the best matching version from a list.
 *
 * Resolution order:
 * 1. Exact match for `requested` (non-yanked/deprecated/retracted)
 * 2. Exact match for `latest` (non-yanked/deprecated/retracted)
 * 3. Newest available version with no negative status (by publishedAt)
 *
 * Returns `null` when no usable version exists.
 */
export function selectVersion(versions: Version[], options?: {
  requested?: string
  latest?: string
}): Version | null {
  const { requested, latest } = options ?? {}

  if (requested) {
    const exact = versions.find(v => v.number === requested && v.status === '')
    if (exact) return exact
  }

  if (latest) {
    const latestV = versions.find(v => v.number === latest && v.status === '')
    if (latestV) return latestV
  }

  const usable = versions.filter(v => v.status === '')
  if (usable.length === 0) return null

  usable.sort((a, b) => {
    const at = a.publishedAt?.getTime() ?? 0
    const bt = b.publishedAt?.getTime() ?? 0
    return bt - at
  })

  return usable[0] ?? null
}

/**
 * Resolve the best documentation URL for a package.
 *
 * Fallback chain:
 * 1. `package.documentation` (explicit docs URL from registry)
 * 2. `package.homepage` (project homepage)
 * 3. `urls.documentation()` (ecosystem default, e.g. docs.rs, rubydoc.info)
 */
export function resolveDocsUrl(pkg: Package, urls: URLBuilder, version?: string): string {
  return pkg.documentation || pkg.homepage || urls.documentation(pkg.name, version)
}

/**
 * Resolve the best README URL for a package.
 *
 * Returns the ecosystem-specific URL where the package README can be fetched.
 */
export function resolveReadmeUrl(pkg: Package, urls: URLBuilder, version?: string): string {
  return urls.readme(pkg.name, version)
}
