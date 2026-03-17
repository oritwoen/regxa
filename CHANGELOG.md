# Changelog

## v0.1.7

[compare changes](https://github.com/oritwoen/regxa/compare/v0.1.6...v0.1.7)

### 🔥 Performance

- **npm:** Fetch dependencies from per-version endpoint ([#47](https://github.com/oritwoen/regxa/pull/47))

### 🩹 Fixes

- **cache:** Revive Date objects after JSON round-trip in fetchVersions ([#45](https://github.com/oritwoen/regxa/pull/45))
- **npm:** Use top-level maintainers instead of scanning all versions ([#42](https://github.com/oritwoen/regxa/pull/42))
- **license:** Use OR instead of AND when combining multiple licenses ([#43](https://github.com/oritwoen/regxa/pull/43))
- **pypi:** Match project_urls keys case-insensitively ([#44](https://github.com/oritwoen/regxa/pull/44))
- **packagist:** Filter dev-suffixed versions from latest resolution ([#48](https://github.com/oritwoen/regxa/pull/48))
- **cli:** Handle HTTPError and RateLimitError in CLI error handler ([#46](https://github.com/oritwoen/regxa/pull/46))
- **purl:** Handle literal @ in scoped package shorthand ([#50](https://github.com/oritwoen/regxa/pull/50))
- **test:** Align smoke test timeouts with client defaults ([#51](https://github.com/oritwoen/regxa/pull/51))
- **pypi:** Point download URL to version files page ([#54](https://github.com/oritwoen/regxa/pull/54))
- **cache:** Re-read lockfile before writing to prevent lost entries ([#55](https://github.com/oritwoen/regxa/pull/55))
- **cache:** Coalesce concurrent fetches with single-flight deduplication ([#52](https://github.com/oritwoen/regxa/pull/52))

### 💅 Refactors

- **pypi:** Migrate fetchVersions to Simple API (PEP 691) ([#56](https://github.com/oritwoen/regxa/pull/56))

### 🏡 Chore

- **test:** Remove redundant vitest imports ([#49](https://github.com/oritwoen/regxa/pull/49))

### ❤️ Contributors

- Ori

## v0.1.6

[compare changes](https://github.com/oritwoen/regxa/compare/v0.1.5...v0.1.6)

### 🚀 Enhancements

- Add agent skills for package registry queries and AI tool integration ([#39](https://github.com/oritwoen/regxa/pull/39))

### 🩹 Fixes

- **cache:** Don't discard fetched data on storage write failure ([#34](https://github.com/oritwoen/regxa/pull/34))
- **pypi:** Apply full PEP 503 normalization to package names ([#35](https://github.com/oritwoen/regxa/pull/35))
- **cli:** Use dynamic ecosystem list in unknown-ecosystem error ([#37](https://github.com/oritwoen/regxa/pull/37))
- **repository:** Apply .git and trailing slash cleanup to shorthand URLs ([#36](https://github.com/oritwoen/regxa/pull/36))
- **registries:** Use buildPURL for proper percent-encoding in urls().purl() ([#38](https://github.com/oritwoen/regxa/pull/38))
- **pypi:** Handle missing releases key in version enumeration ([#41](https://github.com/oritwoen/regxa/pull/41))
- **helpers:** Check abort signal in bulk fetch worker loop ([#40](https://github.com/oritwoen/regxa/pull/40))

### 🏡 Chore

- Update AGENTS.md ([e5edfd9](https://github.com/oritwoen/regxa/commit/e5edfd9))
- Add context7.json ([077b41b](https://github.com/oritwoen/regxa/commit/077b41b))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.1.5

[compare changes](https://github.com/oritwoen/regxa/compare/v0.1.4...v0.1.5)

### 🚀 Enhancements

- Add alpm registry ([#10](https://github.com/oritwoen/regxa/pull/10))
- **cli:** Show docs link in info output ([#11](https://github.com/oritwoen/regxa/pull/11))
- Add AI SDK package tool ([#13](https://github.com/oritwoen/regxa/pull/13))

### 🩹 Fixes

- **errors:** Use typed PURL errors ([#8](https://github.com/oritwoen/regxa/pull/8))
- **rubygems:** Use v2 API for version-specific dependencies ([#19](https://github.com/oritwoen/regxa/pull/19))
- **cargo:** Use latest stable version license instead of newest version ([#20](https://github.com/oritwoen/regxa/pull/20))
- **cache:** Namespace storage keys by ecosystem ([#21](https://github.com/oritwoen/regxa/pull/21))
- **pypi:** Parse PEP 508 markers properly for scope classification ([#26](https://github.com/oritwoen/regxa/pull/26))
- **client:** Handle HTTP-date format in Retry-After header ([#27](https://github.com/oritwoen/regxa/pull/27))
- **purl:** Throw InvalidPURLError for malformed percent-encoding ([#28](https://github.com/oritwoen/regxa/pull/28))

### 🏡 Chore

- Update README.md ([eadefd7](https://github.com/oritwoen/regxa/commit/eadefd7))
- Add oxlint, oxfmt and editorconfig ([#17](https://github.com/oritwoen/regxa/pull/17))

### ❤️ Contributors

- Ori
- Aeitwoen <aeitwoen@gmail.com>
- Oritwoen

## v0.1.4

[compare changes](https://github.com/oritwoen/regxa/compare/v0.1.2...v0.1.4)

### 🚀 Enhancements

- Object-based buildPURL ([#2](https://github.com/oritwoen/regxa/pull/2))
- **registries:** Add documentation field and version/docs helpers ([#4](https://github.com/oritwoen/regxa/pull/4))
- Add readme() to URLBuilder ([#6](https://github.com/oritwoen/regxa/pull/6))

### 🏡 Chore

- Add `AGENTS.md` files ([4844ebe](https://github.com/oritwoen/regxa/commit/4844ebe))
- Update package.json ([35d443b](https://github.com/oritwoen/regxa/commit/35d443b))
- Rename unpux to regxa ([ac10dc5](https://github.com/oritwoen/regxa/commit/ac10dc5))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>
- Oritwoen ([@oritwoen](https://github.com/oritwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.1.2

### 🩹 Fixes

- Fix npm publish — re-release under new version (0.1.1 burned by npm registry ghost)

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))

## v0.1.1

### 🏡 Chore

- Init ([da6269f](https://github.com/oritwoen/regxa/commit/da6269f))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))
