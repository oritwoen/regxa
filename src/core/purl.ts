import type { ParsedPURL, Registry } from './types.ts'
import type { Client } from './client.ts'
import { create } from './registry.ts'
import { InvalidPURLError } from './errors.ts'

/**
 * Parse a PURL string into its components.
 *
 * Format: `pkg:<type>/<namespace>/<name>@<version>?<qualifiers>#<subpath>`
 *
 * @see https://github.com/package-url/purl-spec (ECMA-427)
 */
export function parsePURL(purlStr: string): ParsedPURL {
  if (!purlStr.startsWith('pkg:')) {
    throw new InvalidPURLError(purlStr, 'must start with "pkg:"')
  }

  let remainder = purlStr.slice(4) // strip 'pkg:'

  // Extract subpath
  let subpath = ''
  const hashIdx = remainder.indexOf('#')
  if (hashIdx !== -1) {
    subpath = decodeURIComponent(remainder.slice(hashIdx + 1))
    remainder = remainder.slice(0, hashIdx)
  }

  // Extract qualifiers
  const qualifiers: Record<string, string> = {}
  const queryIdx = remainder.indexOf('?')
  if (queryIdx !== -1) {
    const queryStr = remainder.slice(queryIdx + 1)
    remainder = remainder.slice(0, queryIdx)
    for (const pair of queryStr.split('&')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx !== -1) {
        qualifiers[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1))
      }
    }
  }

  // Extract version
  let version = ''
  const atIdx = remainder.indexOf('@')
  if (atIdx !== -1) {
    version = decodeURIComponent(remainder.slice(atIdx + 1))
    remainder = remainder.slice(0, atIdx)
  }

  // Extract type
  const slashIdx = remainder.indexOf('/')
  if (slashIdx === -1) {
    throw new InvalidPURLError(purlStr, 'missing type/name separator')
  }

  const type = remainder.slice(0, slashIdx).toLowerCase()
  if (!type) {
    throw new InvalidPURLError(purlStr, 'empty type')
  }

  const rest = remainder.slice(slashIdx + 1)
  if (!rest) {
    throw new InvalidPURLError(purlStr, 'empty name')
  }

  // Extract namespace and name
  const lastSlashIdx = rest.lastIndexOf('/')
  let namespace = ''
  let name: string

  if (lastSlashIdx !== -1) {
    namespace = decodeURIComponent(rest.slice(0, lastSlashIdx))
    name = decodeURIComponent(rest.slice(lastSlashIdx + 1))
  }
  else {
    name = decodeURIComponent(rest)
  }

  // Ecosystem-specific normalization per PURL spec
  if (type === 'pypi') {
    name = name.toLowerCase().replace(/_/g, '-')
  }

  return { type, namespace, name, version, qualifiers, subpath }
}

/** Build the full name from namespace + name (e.g., "@scope/pkg" for npm). */
export function fullName(parsed: ParsedPURL): string {
  if (parsed.namespace) {
    return `${parsed.namespace}/${parsed.name}`
  }
  return parsed.name
}

/** Create a registry instance from a PURL, returning [registry, name, version]. */
export function createFromPURL(purlStr: string, client?: Client): [Registry, string, string] {
  const parsed = parsePURL(purlStr)
  const baseURL = parsed.qualifiers['repository_url'] ?? ''
  const reg = create(parsed.type, baseURL || undefined, client)
  return [reg, fullName(parsed), parsed.version]
}

/** Build a PURL string from components. Inverse of `parsePURL`. */
export function buildPURL(parts: {
  type: string
  name: string
  version?: string
  namespace?: string
  qualifiers?: Record<string, string>
  subpath?: string
}): string {
  let purl = `pkg:${parts.type}/`
  if (parts.namespace) {
    purl += `${encodeURIComponent(parts.namespace)}/`
  }
  purl += encodeURIComponent(parts.name)
  if (parts.version) {
    purl += `@${encodeURIComponent(parts.version)}`
  }
  if (parts.qualifiers && Object.keys(parts.qualifiers).length > 0) {
    const qs = Object.entries(parts.qualifiers)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    purl += `?${qs}`
  }
  if (parts.subpath) {
    purl += `#${encodeURIComponent(parts.subpath)}`
  }
  return purl
}
