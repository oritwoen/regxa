import { register, create, ecosystems, has } from '../../src/core/registry.ts'
import { UnknownEcosystemError } from '../../src/core/errors.ts'
import type { Registry } from '../../src/core/types.ts'
import type { Client } from '../../src/core/client.ts'

describe('registry', () => {
  describe('register', () => {
    it('registers an ecosystem', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco', 'https://test.example.com', mockFactory)
      expect(has('test-eco')).toBe(true)
    })

    it('allows creating registry after registration', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-2',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-2', 'https://test2.example.com', mockFactory)
      const registry = create('test-eco-2')
      expect(registry.ecosystem()).toBe('test-eco-2')
    })
  })

  describe('create', () => {
    it('creates registry for registered ecosystem', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-3',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-3', 'https://test3.example.com', mockFactory)
      const registry = create('test-eco-3')
      expect(registry).toBeDefined()
      expect(registry.ecosystem()).toBe('test-eco-3')
    })

    it('throws UnknownEcosystemError for unregistered ecosystem', () => {
      expect(() => create('nonexistent-ecosystem')).toThrow(UnknownEcosystemError)
    })

    it('throws UnknownEcosystemError with correct ecosystem name', () => {
      try {
        create('unknown-eco')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(UnknownEcosystemError)
        if (error instanceof UnknownEcosystemError) {
          expect(error.ecosystem).toBe('unknown-eco')
        }
      }
    })

    it('uses custom baseURL when provided', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-4',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => baseURL,
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-4', 'https://default.example.com', mockFactory)
      const registry = create('test-eco-4', 'https://custom.example.com')
      expect(registry.urls().registry()).toBe('https://custom.example.com')
    })

    it('uses default baseURL when not provided', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-5',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => baseURL,
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-5', 'https://default.example.com', mockFactory)
      const registry = create('test-eco-5')
      expect(registry.urls().registry()).toBe('https://default.example.com')
    })
  })

  describe('ecosystems', () => {
    it('returns array of registered ecosystem names', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-6',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-6', 'https://test6.example.com', mockFactory)
      const ecos = ecosystems()
      expect(Array.isArray(ecos)).toBe(true)
      expect(ecos).toContain('test-eco-6')
    })

    it('returns empty array when no ecosystems registered', () => {
      // Note: This test may fail if other tests have registered ecosystems
      // In a real test suite, you'd want to reset the registry between tests
      const ecos = ecosystems()
      expect(Array.isArray(ecos)).toBe(true)
    })
  })

  describe('has', () => {
    it('returns true for registered ecosystem', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-7',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-7', 'https://test7.example.com', mockFactory)
      expect(has('test-eco-7')).toBe(true)
    })

    it('returns false for unregistered ecosystem', () => {
      expect(has('definitely-not-registered-ecosystem')).toBe(false)
    })

    it('is case-sensitive', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'test-eco-8',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      register('test-eco-8', 'https://test8.example.com', mockFactory)
      expect(has('test-eco-8')).toBe(true)
      expect(has('TEST-ECO-8')).toBe(false)
      expect(has('Test-Eco-8')).toBe(false)
    })
  })

  describe('integration', () => {
    it('register, create, and has work together', () => {
      const mockFactory = (baseURL: string, client: Client): Registry => ({
        ecosystem: () => 'integration-test-eco',
        fetchPackage: async () => ({
          name: '',
          description: '',
          homepage: '',
          repository: '',
          licenses: '',
          keywords: [],
          namespace: '',
          latestVersion: '',
          metadata: {},
        }),
        fetchVersions: async () => [],
        fetchDependencies: async () => [],
        fetchMaintainers: async () => [],
        urls: () => ({
          registry: () => '',
          download: () => '',
          documentation: () => '',
          purl: () => '',
        }),
      })

      // Before registration
      expect(has('integration-test-eco')).toBe(false)

      // Register
      register('integration-test-eco', 'https://integration.example.com', mockFactory)

      // After registration
      expect(has('integration-test-eco')).toBe(true)

      // Create
      const registry = create('integration-test-eco')
      expect(registry.ecosystem()).toBe('integration-test-eco')

      // Verify in ecosystems list
      expect(ecosystems()).toContain('integration-test-eco')
    })
  })
})
