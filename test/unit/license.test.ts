import { normalizeLicense, combineLicenses } from '../../src/core/license.ts'

describe('license', () => {
  describe('normalizeLicense', () => {
    it('normalizes "MIT License" to "MIT"', () => {
      expect(normalizeLicense('MIT License')).toBe('MIT')
    })

    it('normalizes "MIT" to "MIT"', () => {
      expect(normalizeLicense('MIT')).toBe('MIT')
    })

    it('normalizes "Apache 2.0" to "Apache-2.0"', () => {
      expect(normalizeLicense('Apache 2.0')).toBe('Apache-2.0')
    })

    it('normalizes "Apache License 2.0" to "Apache-2.0"', () => {
      expect(normalizeLicense('Apache License 2.0')).toBe('Apache-2.0')
    })

    it('normalizes "Apache-2.0" to "Apache-2.0"', () => {
      expect(normalizeLicense('Apache-2.0')).toBe('Apache-2.0')
    })

    it('normalizes "Apache License, Version 2.0" to "Apache-2.0"', () => {
      expect(normalizeLicense('Apache License, Version 2.0')).toBe('Apache-2.0')
    })

    it('normalizes "Apache2" to "Apache-2.0"', () => {
      expect(normalizeLicense('Apache2')).toBe('Apache-2.0')
    })

    it('normalizes BSD-2-Clause variants', () => {
      expect(normalizeLicense('BSD-2-Clause')).toBe('BSD-2-Clause')
      expect(normalizeLicense('BSD 2-Clause')).toBe('BSD-2-Clause')
      expect(normalizeLicense('Simplified BSD License')).toBe('BSD-2-Clause')
    })

    it('normalizes BSD-3-Clause variants', () => {
      expect(normalizeLicense('BSD-3-Clause')).toBe('BSD-3-Clause')
      expect(normalizeLicense('BSD 3-Clause')).toBe('BSD-3-Clause')
      expect(normalizeLicense('New BSD License')).toBe('BSD-3-Clause')
    })

    it('normalizes ISC variants', () => {
      expect(normalizeLicense('ISC License')).toBe('ISC')
      expect(normalizeLicense('ISC')).toBe('ISC')
    })

    it('normalizes GPL variants', () => {
      expect(normalizeLicense('GPL-2.0')).toBe('GPL-2.0-only')
      expect(normalizeLicense('GPL-3.0')).toBe('GPL-3.0-only')
      expect(normalizeLicense('GPL-2.0-only')).toBe('GPL-2.0-only')
      expect(normalizeLicense('GPL-3.0-only')).toBe('GPL-3.0-only')
    })

    it('normalizes LGPL variants', () => {
      expect(normalizeLicense('LGPL-2.1')).toBe('LGPL-2.1-only')
      expect(normalizeLicense('LGPL-3.0')).toBe('LGPL-3.0-only')
    })

    it('normalizes MPL-2.0 variants', () => {
      expect(normalizeLicense('MPL-2.0')).toBe('MPL-2.0')
      expect(normalizeLicense('Mozilla Public License 2.0')).toBe('MPL-2.0')
    })

    it('normalizes Unlicense variants', () => {
      expect(normalizeLicense('Unlicense')).toBe('Unlicense')
      expect(normalizeLicense('The Unlicense')).toBe('Unlicense')
      expect(normalizeLicense('Public Domain')).toBe('Unlicense')
    })

    it('normalizes CC0 variants', () => {
      expect(normalizeLicense('CC0-1.0')).toBe('CC0-1.0')
      expect(normalizeLicense('CC0')).toBe('CC0-1.0')
    })

    it('normalizes Zlib', () => {
      expect(normalizeLicense('Zlib')).toBe('Zlib')
    })

    it('normalizes WTFPL', () => {
      expect(normalizeLicense('WTFPL')).toBe('WTFPL')
    })

    it('normalizes Artistic-2.0', () => {
      expect(normalizeLicense('Artistic-2.0')).toBe('Artistic-2.0')
    })

    it('normalizes Boost Software License', () => {
      expect(normalizeLicense('Boost Software License 1.0')).toBe('BSL-1.0')
      expect(normalizeLicense('BSL-1.0')).toBe('BSL-1.0')
    })

    it('is case-insensitive', () => {
      expect(normalizeLicense('mit license')).toBe('MIT')
      expect(normalizeLicense('MIT LICENSE')).toBe('MIT')
      expect(normalizeLicense('Apache 2.0')).toBe('Apache-2.0')
      expect(normalizeLicense('APACHE 2.0')).toBe('Apache-2.0')
    })

    it('trims whitespace', () => {
      expect(normalizeLicense('  MIT  ')).toBe('MIT')
      expect(normalizeLicense('\tApache 2.0\n')).toBe('Apache-2.0')
    })

    it('returns empty string for null', () => {
      expect(normalizeLicense(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(normalizeLicense(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(normalizeLicense('')).toBe('')
    })

    it('returns empty string for whitespace-only string', () => {
      expect(normalizeLicense('   ')).toBe('')
      expect(normalizeLicense('\t\n')).toBe('')
    })

    it('passes through unknown SPDX identifiers', () => {
      expect(normalizeLicense('Custom-License-1.0')).toBe('Custom-License-1.0')
      expect(normalizeLicense('Proprietary')).toBe('Proprietary')
    })
  })

  describe('combineLicenses', () => {
    it('returns empty string for empty array', () => {
      expect(combineLicenses([])).toBe('')
    })

    it('returns empty string for array of nulls/undefined', () => {
      expect(combineLicenses([null, undefined])).toBe('')
    })

    it('returns single license', () => {
      expect(combineLicenses(['MIT'])).toBe('MIT')
    })

    it('returns single normalized license', () => {
      expect(combineLicenses(['MIT License'])).toBe('MIT')
    })

    it('combines two licenses with AND', () => {
      expect(combineLicenses(['MIT', 'Apache-2.0'])).toBe('MIT AND Apache-2.0')
    })

    it('combines multiple licenses with AND', () => {
      expect(combineLicenses(['MIT', 'Apache-2.0', 'ISC'])).toBe('MIT AND Apache-2.0 AND ISC')
    })

    it('normalizes licenses before combining', () => {
      expect(combineLicenses(['MIT License', 'Apache 2.0'])).toBe('MIT AND Apache-2.0')
    })

    it('filters out null/undefined values', () => {
      expect(combineLicenses(['MIT', null, 'Apache-2.0', undefined])).toBe('MIT AND Apache-2.0')
    })

    it('filters out empty strings', () => {
      expect(combineLicenses(['MIT', '', 'Apache-2.0'])).toBe('MIT AND Apache-2.0')
    })

    it('filters out whitespace-only strings', () => {
      expect(combineLicenses(['MIT', '   ', 'Apache-2.0'])).toBe('MIT AND Apache-2.0')
    })

    it('handles all nulls/undefined/empty', () => {
      expect(combineLicenses([null, undefined, '', '   '])).toBe('')
    })

    it('combines with normalization and filtering', () => {
      expect(combineLicenses(['MIT License', null, 'Apache 2.0', undefined, ''])).toBe(
        'MIT AND Apache-2.0'
      )
    })
  })
})
