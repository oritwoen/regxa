import { normalizeRepositoryURL } from '../../src/core/repository.ts'

describe('repository', () => {
  describe('normalizeRepositoryURL', () => {
    it('returns empty string for null', () => {
      expect(normalizeRepositoryURL(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(normalizeRepositoryURL(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(normalizeRepositoryURL('')).toBe('')
    })

    it('returns empty string for whitespace-only string', () => {
      expect(normalizeRepositoryURL('   ')).toBe('')
      expect(normalizeRepositoryURL('\t\n')).toBe('')
    })

    it('returns empty string for non-string, non-object', () => {
      expect(normalizeRepositoryURL(123)).toBe('')
      expect(normalizeRepositoryURL(true)).toBe('')
      expect(normalizeRepositoryURL([])).toBe('')
    })

    it('returns empty string for object without url property', () => {
      expect(normalizeRepositoryURL({})).toBe('')
      expect(normalizeRepositoryURL({ type: 'git' })).toBe('')
    })

    it('returns empty string for object with non-string url', () => {
      expect(normalizeRepositoryURL({ url: 123 })).toBe('')
      expect(normalizeRepositoryURL({ url: null })).toBe('')
    })

    it('extracts url from object', () => {
      expect(normalizeRepositoryURL({ url: 'https://github.com/foo/bar' })).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('normalizes git+https URLs', () => {
      expect(normalizeRepositoryURL('git+https://github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('normalizes git:// URLs to https://', () => {
      expect(normalizeRepositoryURL('git://github.com/foo/bar')).toBe('https://github.com/foo/bar')
    })

    it('normalizes ssh://git@ URLs', () => {
      expect(normalizeRepositoryURL('ssh://git@github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('normalizes git@host:user/repo SSH URLs', () => {
      expect(normalizeRepositoryURL('git@github.com:foo/bar.git')).toBe('https://github.com/foo/bar')
    })

    it('normalizes git@host:user/repo without .git', () => {
      expect(normalizeRepositoryURL('git@github.com:foo/bar')).toBe('https://github.com/foo/bar')
    })

    it('handles GitHub shorthand', () => {
      expect(normalizeRepositoryURL('github:foo/bar')).toBe('https://github.com/foo/bar')
    })

    it('handles GitLab shorthand', () => {
      expect(normalizeRepositoryURL('gitlab:foo/bar')).toBe('https://gitlab.com/foo/bar')
    })

    it('handles Bitbucket shorthand', () => {
      expect(normalizeRepositoryURL('bitbucket:foo/bar')).toBe('https://bitbucket.org/foo/bar')
    })

    it('strips .git suffix', () => {
      expect(normalizeRepositoryURL('https://github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('strips trailing slash', () => {
      expect(normalizeRepositoryURL('https://github.com/foo/bar/')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('strips .git suffix', () => {
      expect(normalizeRepositoryURL('https://github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('strips trailing slash after .git', () => {
      expect(normalizeRepositoryURL('https://github.com/foo/bar.git/')).toBe(
        'https://github.com/foo/bar.git'
      )
    })

    it('handles complex SSH URL', () => {
      expect(normalizeRepositoryURL('ssh://git@gitlab.com:22/group/project.git')).toBe(
        'https://gitlab.com:22/group/project'
      )
    })

    it('handles HTTPS URL with port', () => {
      expect(normalizeRepositoryURL('https://github.com:443/foo/bar.git')).toBe(
        'https://github.com:443/foo/bar'
      )
    })

    it('handles nested paths', () => {
      expect(normalizeRepositoryURL('https://github.com/org/group/project.git')).toBe(
        'https://github.com/org/group/project'
      )
    })

    it('trims whitespace from string input', () => {
      expect(normalizeRepositoryURL('  https://github.com/foo/bar  ')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('handles git+ prefix with git:// protocol', () => {
      expect(normalizeRepositoryURL('git+git://github.com/foo/bar')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('handles git+ prefix with ssh://', () => {
      expect(normalizeRepositoryURL('git+ssh://git@github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('preserves HTTPS URLs without modification', () => {
      expect(normalizeRepositoryURL('https://github.com/foo/bar')).toBe(
        'https://github.com/foo/bar'
      )
    })

    it('preserves HTTP URLs', () => {
      expect(normalizeRepositoryURL('http://github.com/foo/bar')).toBe('http://github.com/foo/bar')
    })

    it('handles object with extra properties', () => {
      expect(
        normalizeRepositoryURL({
          url: 'https://github.com/foo/bar.git',
          type: 'git',
          directory: 'packages/core',
        })
      ).toBe('https://github.com/foo/bar')
    })

    it('handles complex real-world example', () => {
      expect(normalizeRepositoryURL('git+https://github.com/babel/babel.git')).toBe(
        'https://github.com/babel/babel'
      )
    })

    it('handles GitLab SSH URL', () => {
      expect(normalizeRepositoryURL('git@gitlab.com:group/project.git')).toBe(
        'https://gitlab.com/group/project'
      )
    })

    it('handles Bitbucket SSH URL', () => {
      expect(normalizeRepositoryURL('git@bitbucket.org:user/repo.git')).toBe(
        'https://bitbucket.org/user/repo'
      )
    })
  })
})
