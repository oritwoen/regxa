import { describe, it, expect } from 'vitest'
import type { Package, Version, URLBuilder } from '../../src/core/types.ts'
import { selectVersion, resolveDocsUrl } from '../../src/helpers.ts'

function version(num: string, status: '' | 'yanked' | 'deprecated' | 'retracted' = ''): Version {
  return {
    number: num,
    publishedAt: new Date('2024-01-01T00:00:00Z'),
    licenses: '',
    integrity: '',
    status,
    metadata: {},
  }
}

function pkg(overrides: Partial<Package> = {}): Package {
  return {
    name: 'test',
    description: '',
    homepage: '',
    documentation: '',
    repository: '',
    licenses: '',
    keywords: [],
    namespace: '',
    latestVersion: '1.0.0',
    metadata: {},
    ...overrides,
  }
}

const stubUrls: URLBuilder = {
  registry: () => '',
  download: () => '',
  documentation: (name: string, ver?: string) => `https://docs.example.com/${name}/${ver ?? 'latest'}`,
  purl: () => '',
}

describe('selectVersion', () => {
  it('returns exact requested version when available', () => {
    const versions = [version('1.0.0'), version('2.0.0'), version('3.0.0')]
    const result = selectVersion(versions, { requested: '2.0.0' })
    expect(result?.number).toBe('2.0.0')
  })

  it('skips yanked requested version and falls back to latest', () => {
    const versions = [version('1.0.0'), version('2.0.0', 'yanked'), version('3.0.0')]
    const result = selectVersion(versions, { requested: '2.0.0', latest: '3.0.0' })
    expect(result?.number).toBe('3.0.0')
  })

  it('skips deprecated requested version', () => {
    const versions = [version('1.0.0'), version('2.0.0', 'deprecated')]
    const result = selectVersion(versions, { requested: '2.0.0', latest: '1.0.0' })
    expect(result?.number).toBe('1.0.0')
  })

  it('skips retracted requested version', () => {
    const versions = [version('1.0.0'), version('2.0.0', 'retracted')]
    const result = selectVersion(versions, { requested: '2.0.0', latest: '1.0.0' })
    expect(result?.number).toBe('1.0.0')
  })

  it('falls back to first clean version when both requested and latest are unusable', () => {
    const versions = [
      version('1.0.0', 'yanked'),
      version('2.0.0', 'yanked'),
      version('3.0.0'),
    ]
    const result = selectVersion(versions, { requested: '1.0.0', latest: '2.0.0' })
    expect(result?.number).toBe('3.0.0')
  })

  it('returns null when all versions are yanked', () => {
    const versions = [version('1.0.0', 'yanked'), version('2.0.0', 'yanked')]
    const result = selectVersion(versions, { requested: '1.0.0' })
    expect(result).toBeNull()
  })

  it('returns null for empty version list', () => {
    const result = selectVersion([], { requested: '1.0.0' })
    expect(result).toBeNull()
  })

  it('works without options — returns first clean version', () => {
    const versions = [version('1.0.0', 'yanked'), version('2.0.0')]
    const result = selectVersion(versions)
    expect(result?.number).toBe('2.0.0')
  })

  it('returns null when requested version does not exist', () => {
    const versions = [version('1.0.0'), version('2.0.0')]
    const result = selectVersion(versions, { requested: '9.9.9', latest: '2.0.0' })
    expect(result?.number).toBe('2.0.0')
  })
})

describe('resolveDocsUrl', () => {
  it('prefers documentation field when set', () => {
    const p = pkg({ documentation: 'https://serde.rs/docs' })
    expect(resolveDocsUrl(p, stubUrls)).toBe('https://serde.rs/docs')
  })

  it('falls back to homepage when documentation is empty', () => {
    const p = pkg({ homepage: 'https://serde.rs' })
    expect(resolveDocsUrl(p, stubUrls)).toBe('https://serde.rs')
  })

  it('falls back to URLBuilder when both documentation and homepage are empty', () => {
    const p = pkg()
    expect(resolveDocsUrl(p, stubUrls, '1.0.0')).toBe('https://docs.example.com/test/1.0.0')
  })

  it('passes version to URLBuilder fallback', () => {
    const p = pkg()
    expect(resolveDocsUrl(p, stubUrls, '2.5.0')).toBe('https://docs.example.com/test/2.5.0')
  })

  it('uses latest when no version specified in URLBuilder fallback', () => {
    const p = pkg()
    expect(resolveDocsUrl(p, stubUrls)).toBe('https://docs.example.com/test/latest')
  })

  it('does not fall through when documentation is set even if homepage exists', () => {
    const p = pkg({ documentation: 'https://docs.rs/serde', homepage: 'https://serde.rs' })
    expect(resolveDocsUrl(p, stubUrls)).toBe('https://docs.rs/serde')
  })
})
