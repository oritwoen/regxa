import consola from 'consola'
import type { Registry } from '../core/types.ts'
import { createFromPURL, parsePURL, fullName } from '../core/purl.ts'
import { create } from '../core/registry.ts'
import { NotFoundError, UnknownEcosystemError, InvalidPURLError } from '../core/errors.ts'
import { CachedRegistry } from '../cache/cached-registry.ts'
import '../registries/index.ts'

export const sharedArgs = {
  json: {
    type: 'boolean' as const,
    description: 'Output as JSON',
    default: false,
  },
  'no-cache': {
    type: 'boolean' as const,
    description: 'Bypass cache, fetch fresh data',
    default: false,
  },
} as const

/**
 * Resolve a PURL string or shorthand into [registry, name, version].
 * Uses CachedRegistry unless --no-cache is set.
 */
export function resolvePURL(input: string, useCache = true): [Registry, string, string] {
  let purl = input
  if (!purl.startsWith('pkg:')) {
    purl = `pkg:${purl}`
  }

  if (useCache) {
    const parsed = parsePURL(purl)
    const baseURL = parsed.qualifiers['repository_url'] ?? ''
    const inner = create(parsed.type, baseURL || undefined)
    const reg = new CachedRegistry(inner)
    return [reg, fullName(parsed), parsed.version]
  }

  return createFromPURL(purl)
}

/** Run a command with standard error handling. */
export async function withErrorHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  }
  catch (error) {
    if (error instanceof NotFoundError) {
      consola.error(`Package not found: ${error.ecosystem}/${error.packageName}${error.version ? `@${error.version}` : ''}`)
      process.exit(1)
    }
    if (error instanceof UnknownEcosystemError) {
      consola.error(`Unknown ecosystem: ${error.ecosystem}`)
      consola.info('Supported: npm, cargo, pypi, gem, composer')
      process.exit(1)
    }
    if (error instanceof InvalidPURLError) {
      consola.error(`Invalid PURL: ${error.purl}`)
      consola.info('Examples: pkg:npm/lodash, npm/lodash@4.17.21, pkg:cargo/serde')
      process.exit(1)
    }
    throw error
  }
}
