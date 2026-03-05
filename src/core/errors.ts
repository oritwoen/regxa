/** Custom error types for registry operations. */

export class PkioError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PkioError'
  }
}

export class HTTPError extends PkioError {
  readonly statusCode: number
  readonly url: string
  readonly body: string

  constructor(statusCode: number, url: string, body: string) {
    super(`HTTP ${statusCode}: ${url}`)
    this.name = 'HTTPError'
    this.statusCode = statusCode
    this.url = url
    this.body = body
  }

  isNotFound(): boolean {
    return this.statusCode === 404
  }

  isRateLimit(): boolean {
    return this.statusCode === 429
  }

  isServerError(): boolean {
    return this.statusCode >= 500
  }
}

export class NotFoundError extends PkioError {
  readonly ecosystem: string
  readonly packageName: string
  readonly version: string

  constructor(ecosystem: string, packageName: string, version = '') {
    const versionSuffix = version ? `@${version}` : ''
    super(`Package not found: ${ecosystem}/${packageName}${versionSuffix}`)
    this.name = 'NotFoundError'
    this.ecosystem = ecosystem
    this.packageName = packageName
    this.version = version
  }
}

export class RateLimitError extends PkioError {
  readonly retryAfter: number

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s`)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class UnknownEcosystemError extends PkioError {
  readonly ecosystem: string

  constructor(ecosystem: string) {
    super(`Unknown ecosystem: ${ecosystem}`)
    this.name = 'UnknownEcosystemError'
    this.ecosystem = ecosystem
  }
}

export class InvalidPURLError extends PkioError {
  readonly purl: string

  constructor(purl: string, reason: string) {
    super(`Invalid PURL "${purl}": ${reason}`)
    this.name = 'InvalidPURLError'
    this.purl = purl
  }
}
