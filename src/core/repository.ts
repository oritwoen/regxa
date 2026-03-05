/**
 * Normalize a repository URL to a clean HTTPS git URL.
 *
 * Handles various formats:
 * - "git+https://github.com/foo/bar.git" → "https://github.com/foo/bar"
 * - "git://github.com/foo/bar" → "https://github.com/foo/bar"
 * - "ssh://git@github.com/foo/bar.git" → "https://github.com/foo/bar"
 * - "github:foo/bar" → "https://github.com/foo/bar"
 * - { url: "..." } → extracted and normalized
 */
export function normalizeRepositoryURL(raw: unknown): string {
  if (!raw) return ''

  let url: string

  if (typeof raw === 'string') {
    url = raw
  }
  else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    if (typeof obj['url'] === 'string') {
      url = obj['url']
    }
    else {
      return ''
    }
  }
  else {
    return ''
  }

  url = url.trim()
  if (!url) return ''

  // GitHub shorthand: "github:user/repo"
  if (url.startsWith('github:')) {
    return `https://github.com/${url.slice(7)}`
  }

  // GitLab shorthand
  if (url.startsWith('gitlab:')) {
    return `https://gitlab.com/${url.slice(7)}`
  }

  // Bitbucket shorthand
  if (url.startsWith('bitbucket:')) {
    return `https://bitbucket.org/${url.slice(10)}`
  }

  // Strip "git+" prefix
  if (url.startsWith('git+')) {
    url = url.slice(4)
  }

  // Convert git:// to https://
  if (url.startsWith('git://')) {
    url = 'https://' + url.slice(6)
  }

  // Convert ssh://git@host/... to https://host/...
  if (url.startsWith('ssh://git@')) {
    url = 'https://' + url.slice(10)
  }

  // Convert git@host:user/repo to https://host/user/repo
  const sshMatch = url.match(/^git@([^:]+):(.+)$/)
  if (sshMatch) {
    url = `https://${sshMatch[1]}/${sshMatch[2]}`
  }

  // Strip .git suffix
  if (url.endsWith('.git')) {
    url = url.slice(0, -4)
  }

  // Strip trailing slash
  if (url.endsWith('/')) {
    url = url.slice(0, -1)
  }

  return url
}
