import { parsePURL, fullName, buildPURL, createFromPURL } from '../../src/core/purl.ts'
import { InvalidPURLError } from '../../src/core/errors.ts'

describe('purl', () => {
  describe('parsePURL', () => {
    it('parses simple PURL', () => {
      const result = parsePURL('pkg:npm/lodash')
      expect(result).toEqual({
        type: 'npm',
        namespace: '',
        name: 'lodash',
        version: '',
        qualifiers: {},
        subpath: '',
      })
    })

    it('parses scoped package', () => {
      const result = parsePURL('pkg:npm/%40babel/core@7.0.0')
      expect(result).toEqual({
        type: 'npm',
        namespace: '@babel',
        name: 'core',
        version: '7.0.0',
        qualifiers: {},
        subpath: '',
      })
    })

    it('parses PURL with version', () => {
      const result = parsePURL('pkg:cargo/serde@1.0.0')
      expect(result).toEqual({
        type: 'cargo',
        namespace: '',
        name: 'serde',
        version: '1.0.0',
        qualifiers: {},
        subpath: '',
      })
    })

    it('parses PURL with qualifiers', () => {
      const result = parsePURL('pkg:npm/lodash?repository_url=https://custom.registry.com')
      expect(result).toEqual({
        type: 'npm',
        namespace: '',
        name: 'lodash',
        version: '',
        qualifiers: {
          repository_url: 'https://custom.registry.com',
        },
        subpath: '',
      })
    })

    it('parses PURL with multiple qualifiers', () => {
      const result = parsePURL('pkg:npm/lodash?arch=x86_64&os=linux')
      expect(result).toEqual({
        type: 'npm',
        namespace: '',
        name: 'lodash',
        version: '',
        qualifiers: {
          arch: 'x86_64',
          os: 'linux',
        },
        subpath: '',
      })
    })

    it('parses PURL with subpath', () => {
      const result = parsePURL('pkg:npm/lodash#some/path')
      expect(result).toEqual({
        type: 'npm',
        namespace: '',
        name: 'lodash',
        version: '',
        qualifiers: {},
        subpath: 'some/path',
      })
    })

    it('parses PURL with all components', () => {
      const result = parsePURL('pkg:npm/%40babel/core@7.0.0?arch=x86_64#lib/index.js')
      expect(result).toEqual({
        type: 'npm',
        namespace: '@babel',
        name: 'core',
        version: '7.0.0',
        qualifiers: {
          arch: 'x86_64',
        },
        subpath: 'lib/index.js',
      })
    })

    it('normalizes PyPI package names', () => {
      const result = parsePURL('pkg:pypi/My_Package')
      expect(result.name).toBe('my-package')
    })

    it('normalizes PyPI package names with version', () => {
      const result = parsePURL('pkg:pypi/Django_REST_Framework@3.14.0')
      expect(result.name).toBe('django-rest-framework')
      expect(result.version).toBe('3.14.0')
    })

    it('throws on missing pkg: prefix', () => {
      expect(() => parsePURL('npm/lodash')).toThrow(InvalidPURLError)
      expect(() => parsePURL('npm/lodash')).toThrow('must start with "pkg:"')
    })

    it('throws on missing type/name separator', () => {
      expect(() => parsePURL('pkg:lodash')).toThrow(InvalidPURLError)
      expect(() => parsePURL('pkg:lodash')).toThrow('missing type/name separator')
    })

    it('throws on empty type', () => {
      expect(() => parsePURL('pkg:/lodash')).toThrow(InvalidPURLError)
      expect(() => parsePURL('pkg:/lodash')).toThrow('empty type')
    })

    it('throws on empty name', () => {
      expect(() => parsePURL('pkg:npm/')).toThrow(InvalidPURLError)
      expect(() => parsePURL('pkg:npm/')).toThrow('empty name')
    })

    it('decodes URL-encoded components', () => {
      const result = parsePURL('pkg:npm/my%20package@1.0.0')
      expect(result.name).toBe('my package')
      expect(result.version).toBe('1.0.0')
    })

    it('lowercases type', () => {
      const result = parsePURL('pkg:NPM/lodash')
      expect(result.type).toBe('npm')
    })
  })

  describe('fullName', () => {
    it('returns name without namespace', () => {
      const parsed = parsePURL('pkg:npm/lodash')
      expect(fullName(parsed)).toBe('lodash')
    })

    it('returns scoped name with namespace', () => {
      const parsed = parsePURL('pkg:npm/%40babel/core')
      expect(fullName(parsed)).toBe('@babel/core')
    })

    it('handles custom namespace', () => {
      const parsed = parsePURL('pkg:npm/%40myorg/mylib')
      expect(fullName(parsed)).toBe('@myorg/mylib')
    })
  })

  describe('buildPURL', () => {
    it('builds simple PURL', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash' })).toBe('pkg:npm/lodash')
    })

    it('builds PURL with version', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', version: '4.17.21' })).toBe('pkg:npm/lodash@4.17.21')
    })

    it('builds PURL with namespace', () => {
      expect(buildPURL({ type: 'npm', name: 'core', version: '7.0.0', namespace: '@babel' })).toBe('pkg:npm/%40babel/core@7.0.0')
    })

    it('encodes special characters in name', () => {
      expect(buildPURL({ type: 'npm', name: 'my package' })).toBe('pkg:npm/my%20package')
    })

    it('encodes special characters in namespace', () => {
      expect(buildPURL({ type: 'npm', name: 'core', namespace: '@my org' })).toBe('pkg:npm/%40my%20org/core')
    })

    it('encodes special characters in version', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', version: '1.0.0+build.123' })).toBe('pkg:npm/lodash@1.0.0%2Bbuild.123')
    })

    it('builds PURL with qualifiers', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', version: '4.17.21', qualifiers: { repository_url: 'https://custom.registry.com' } }))
        .toBe('pkg:npm/lodash@4.17.21?repository_url=https%3A%2F%2Fcustom.registry.com')
    })

    it('builds PURL with multiple qualifiers', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', qualifiers: { arch: 'x86_64', os: 'linux' } }))
        .toBe('pkg:npm/lodash?arch=x86_64&os=linux')
    })

    it('builds PURL with subpath', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', subpath: 'lib/index.js' }))
        .toBe('pkg:npm/lodash#lib%2Findex.js')
    })

    it('builds PURL with all components', () => {
      expect(buildPURL({ type: 'npm', name: 'core', version: '7.0.0', namespace: '@babel', qualifiers: { arch: 'x86_64' }, subpath: 'lib/index.js' }))
        .toBe('pkg:npm/%40babel/core@7.0.0?arch=x86_64#lib%2Findex.js')
    })

    it('skips empty qualifiers object', () => {
      expect(buildPURL({ type: 'npm', name: 'lodash', version: '1.0.0', qualifiers: {} }))
        .toBe('pkg:npm/lodash@1.0.0')
    })

    it('round-trips a simple PURL through parsePURL', () => {
      const original = 'pkg:npm/lodash'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })

    it('round-trips a versioned PURL', () => {
      const original = 'pkg:cargo/serde@1.0.0'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })

    it('round-trips a scoped PURL', () => {
      const original = 'pkg:npm/%40babel/core@7.0.0'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })

    it('round-trips a PURL with qualifiers', () => {
      const original = 'pkg:npm/lodash?repository_url=https%3A%2F%2Fcustom.registry.com'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })

    it('round-trips a PURL with subpath', () => {
      const original = 'pkg:npm/lodash#lib%2Findex.js'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })

    it('round-trips a full PURL with all components', () => {
      const original = 'pkg:npm/%40babel/core@7.0.0?arch=x86_64#lib%2Findex.js'
      expect(buildPURL(parsePURL(original))).toBe(original)
    })
  })
})
