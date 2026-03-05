import {
  PkioError,
  HTTPError,
  NotFoundError,
  RateLimitError,
  UnknownEcosystemError,
  InvalidPURLError,
} from '../../src/core/errors.ts'

describe('errors', () => {
  describe('PkioError', () => {
    it('creates error with message', () => {
      const error = new PkioError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('PkioError')
    })

    it('is instanceof Error', () => {
      const error = new PkioError('Test')
      expect(error).toBeInstanceOf(Error)
    })

    it('is instanceof PkioError', () => {
      const error = new PkioError('Test')
      expect(error).toBeInstanceOf(PkioError)
    })

    it('has correct stack trace', () => {
      const error = new PkioError('Test')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('PkioError')
    })
  })

  describe('HTTPError', () => {
    it('creates error with statusCode, url, and body', () => {
      const error = new HTTPError(404, 'https://api.example.com/pkg', 'Not found')
      expect(error.statusCode).toBe(404)
      expect(error.url).toBe('https://api.example.com/pkg')
      expect(error.body).toBe('Not found')
      expect(error.name).toBe('HTTPError')
    })

    it('includes status code in message', () => {
      const error = new HTTPError(500, 'https://api.example.com', 'Server error')
      expect(error.message).toContain('HTTP 500')
      expect(error.message).toContain('https://api.example.com')
    })

    it('is instanceof PkioError', () => {
      const error = new HTTPError(404, 'https://api.example.com', 'Not found')
      expect(error).toBeInstanceOf(PkioError)
    })

    it('is instanceof HTTPError', () => {
      const error = new HTTPError(404, 'https://api.example.com', 'Not found')
      expect(error).toBeInstanceOf(HTTPError)
    })

    it('isNotFound() returns true for 404', () => {
      const error = new HTTPError(404, 'https://api.example.com', 'Not found')
      expect(error.isNotFound()).toBe(true)
    })

    it('isNotFound() returns false for non-404', () => {
      const error = new HTTPError(500, 'https://api.example.com', 'Server error')
      expect(error.isNotFound()).toBe(false)
    })

    it('isRateLimit() returns true for 429', () => {
      const error = new HTTPError(429, 'https://api.example.com', 'Too many requests')
      expect(error.isRateLimit()).toBe(true)
    })

    it('isRateLimit() returns false for non-429', () => {
      const error = new HTTPError(404, 'https://api.example.com', 'Not found')
      expect(error.isRateLimit()).toBe(false)
    })

    it('isServerError() returns true for 5xx', () => {
      expect(new HTTPError(500, 'https://api.example.com', 'Error').isServerError()).toBe(true)
      expect(new HTTPError(502, 'https://api.example.com', 'Error').isServerError()).toBe(true)
      expect(new HTTPError(503, 'https://api.example.com', 'Error').isServerError()).toBe(true)
      expect(new HTTPError(599, 'https://api.example.com', 'Error').isServerError()).toBe(true)
    })

    it('isServerError() returns false for non-5xx', () => {
      expect(new HTTPError(404, 'https://api.example.com', 'Error').isServerError()).toBe(false)
      expect(new HTTPError(429, 'https://api.example.com', 'Error').isServerError()).toBe(false)
      expect(new HTTPError(200, 'https://api.example.com', 'Error').isServerError()).toBe(false)
    })

    it('handles empty body', () => {
      const error = new HTTPError(404, 'https://api.example.com', '')
      expect(error.body).toBe('')
    })
  })

  describe('NotFoundError', () => {
    it('creates error with ecosystem and packageName', () => {
      const error = new NotFoundError('npm', 'nonexistent-package')
      expect(error.ecosystem).toBe('npm')
      expect(error.packageName).toBe('nonexistent-package')
      expect(error.version).toBe('')
      expect(error.name).toBe('NotFoundError')
    })

    it('creates error with version', () => {
      const error = new NotFoundError('npm', 'lodash', '1.0.0')
      expect(error.ecosystem).toBe('npm')
      expect(error.packageName).toBe('lodash')
      expect(error.version).toBe('1.0.0')
    })

    it('includes package info in message without version', () => {
      const error = new NotFoundError('npm', 'lodash')
      expect(error.message).toContain('npm/lodash')
      expect(error.message).not.toContain('@')
    })

    it('includes package info in message with version', () => {
      const error = new NotFoundError('npm', 'lodash', '1.0.0')
      expect(error.message).toContain('npm/lodash@1.0.0')
    })

    it('is instanceof PkioError', () => {
      const error = new NotFoundError('npm', 'lodash')
      expect(error).toBeInstanceOf(PkioError)
    })

    it('is instanceof NotFoundError', () => {
      const error = new NotFoundError('npm', 'lodash')
      expect(error).toBeInstanceOf(NotFoundError)
    })
  })

  describe('RateLimitError', () => {
    it('creates error with retryAfter', () => {
      const error = new RateLimitError(60)
      expect(error.retryAfter).toBe(60)
      expect(error.name).toBe('RateLimitError')
    })

    it('includes retryAfter in message', () => {
      const error = new RateLimitError(120)
      expect(error.message).toContain('120')
    })

    it('is instanceof PkioError', () => {
      const error = new RateLimitError(60)
      expect(error).toBeInstanceOf(PkioError)
    })

    it('is instanceof RateLimitError', () => {
      const error = new RateLimitError(60)
      expect(error).toBeInstanceOf(RateLimitError)
    })
  })

  describe('UnknownEcosystemError', () => {
    it('creates error with ecosystem', () => {
      const error = new UnknownEcosystemError('unknown-ecosystem')
      expect(error.ecosystem).toBe('unknown-ecosystem')
      expect(error.name).toBe('UnknownEcosystemError')
    })

    it('includes ecosystem in message', () => {
      const error = new UnknownEcosystemError('custom-pkg')
      expect(error.message).toContain('custom-pkg')
    })

    it('is instanceof PkioError', () => {
      const error = new UnknownEcosystemError('unknown')
      expect(error).toBeInstanceOf(PkioError)
    })

    it('is instanceof UnknownEcosystemError', () => {
      const error = new UnknownEcosystemError('unknown')
      expect(error).toBeInstanceOf(UnknownEcosystemError)
    })
  })

  describe('InvalidPURLError', () => {
    it('creates error with purl and reason', () => {
      const error = new InvalidPURLError('invalid-purl', 'missing type')
      expect(error.purl).toBe('invalid-purl')
      expect(error.name).toBe('InvalidPURLError')
    })

    it('includes purl and reason in message', () => {
      const error = new InvalidPURLError('pkg:npm', 'empty name')
      expect(error.message).toContain('pkg:npm')
      expect(error.message).toContain('empty name')
    })

    it('is instanceof PkioError', () => {
      const error = new InvalidPURLError('bad', 'reason')
      expect(error).toBeInstanceOf(PkioError)
    })

    it('is instanceof InvalidPURLError', () => {
      const error = new InvalidPURLError('bad', 'reason')
      expect(error).toBeInstanceOf(InvalidPURLError)
    })
  })

  describe('error hierarchy', () => {
    it('all custom errors are instanceof PkioError', () => {
      expect(new HTTPError(404, 'url', 'body')).toBeInstanceOf(PkioError)
      expect(new NotFoundError('npm', 'pkg')).toBeInstanceOf(PkioError)
      expect(new RateLimitError(60)).toBeInstanceOf(PkioError)
      expect(new UnknownEcosystemError('eco')).toBeInstanceOf(PkioError)
      expect(new InvalidPURLError('purl', 'reason')).toBeInstanceOf(PkioError)
    })

    it('all custom errors are instanceof Error', () => {
      expect(new HTTPError(404, 'url', 'body')).toBeInstanceOf(Error)
      expect(new NotFoundError('npm', 'pkg')).toBeInstanceOf(Error)
      expect(new RateLimitError(60)).toBeInstanceOf(Error)
      expect(new UnknownEcosystemError('eco')).toBeInstanceOf(Error)
      expect(new InvalidPURLError('purl', 'reason')).toBeInstanceOf(Error)
    })
  })
})
