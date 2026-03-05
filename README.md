# unpux

[![npm version](https://img.shields.io/npm/v/unpux?style=flat&colorA=130f40&colorB=474787)](https://npmjs.com/package/unpux)
[![npm downloads](https://img.shields.io/npm/dm/unpux?style=flat&colorA=130f40&colorB=474787)](https://npm.chart.dev/unpux)
[![license](https://img.shields.io/github/license/oritwoen/unpux?style=flat&colorA=130f40&colorB=474787)](https://github.com/oritwoen/unpux/blob/main/LICENSE)

> Query npm, PyPI, crates.io, RubyGems, and Packagist with one API. PURL-native, typed, cached.

## Why?

If you need package metadata from multiple registries, you currently have two options: call each registry's REST API yourself (they all work differently), or depend on a third-party aggregation service.

There is no embeddable TypeScript library that normalizes across registries. The closest thing is [git-pkgs/registries](https://github.com/git-pkgs/registries) in Go, which covers 25 ecosystems but is Go-only. Aggregation APIs like [ecosyste.ms](https://ecosyste.ms/) and [deps.dev](https://deps.dev/) exist, but they are external services you can't bundle into your own tool.

unpux fills that gap. One `fetchPackage` call, same response shape, regardless of whether the package lives on npm or Packagist. Uses [PURL (ECMA-427)](https://github.com/package-url/purl-spec) for addressing, so `pkg:npm/lodash` and `pkg:cargo/serde` resolve through the same code path. Storage-backed caching with a lockfile keeps things fast on repeated lookups.

## Features

- 🔍 **Single API, five registries** — npm, PyPI, crates.io, RubyGems, Packagist
- 📦 **PURL-native** — [ECMA-427](https://github.com/package-url/purl-spec) identifiers as first-class input
- 🏷️ **Normalized data model** — same `Package`, `Version`, `Dependency`, `Maintainer` types everywhere
- 💾 **Storage-backed cache + lockfile** — unstorage-native, sha256 integrity checks, configurable TTL
- ⌨️ **CLI included** — `unpux info npm/lodash`, `unpux versions cargo/serde`, `unpux deps pypi/flask@3.1.1`
- 🔁 **Retry + backoff** — exponential backoff with jitter, rate limiter interface
- 🪶 **ESM-only, zero CJS** — built with [obuild](https://github.com/unjs/obuild)

## Install

```bash
pnpm add unpux
```

## Quick start

### API

```ts
import { fetchPackageFromPURL } from 'unpux'

const pkg = await fetchPackageFromPURL('pkg:npm/lodash')

console.log(pkg.name)          // "lodash"
console.log(pkg.latestVersion) // "4.17.23"
console.log(pkg.licenses)      // "MIT"
console.log(pkg.repository)    // "https://github.com/lodash/lodash"
```

Works the same for any supported registry:

```ts
await fetchPackageFromPURL('pkg:cargo/serde')
await fetchPackageFromPURL('pkg:pypi/flask')
await fetchPackageFromPURL('pkg:gem/rails')
await fetchPackageFromPURL('pkg:composer/laravel/framework')
```

### CLI

The `pkg:` prefix is optional in the CLI — `npm/lodash` works just as well:

```bash
unpux info npm/lodash
unpux versions cargo/serde
unpux deps pypi/flask@3.1.1
unpux maintainers gem/rails
```

Add `--json` for machine-readable output, `--no-cache` to skip the cache.

## Registries

| Ecosystem | PURL type | Registry |
|-----------|-----------|----------|
| npm | `pkg:npm/...` | registry.npmjs.org |
| Cargo | `pkg:cargo/...` | crates.io |
| PyPI | `pkg:pypi/...` | pypi.org |
| RubyGems | `pkg:gem/...` | rubygems.org |
| Packagist | `pkg:composer/...` | packagist.org |

Scoped packages work as expected: `pkg:npm/%40vue/core` or `npm/@vue/core` in the CLI.

## API reference

### PURL helpers

```ts
import { fetchPackageFromPURL, fetchVersionsFromPURL, fetchDependenciesFromPURL, fetchMaintainersFromPURL, bulkFetchPackages } from 'unpux'

// Single lookups
const pkg = await fetchPackageFromPURL('pkg:npm/lodash')
const versions = await fetchVersionsFromPURL('pkg:cargo/serde')
const deps = await fetchDependenciesFromPURL('pkg:pypi/flask@3.1.1')
const maintainers = await fetchMaintainersFromPURL('pkg:gem/rails')

// Bulk — fetches up to 15 packages concurrently
const packages = await bulkFetchPackages([
  'pkg:npm/lodash',
  'pkg:cargo/serde',
  'pkg:pypi/flask',
])
```

### Direct registry access

For more control, create a registry instance directly:

```ts
import { create } from 'unpux'
import 'unpux/registries' // registers all built-in ecosystems

const npm = create('npm')
const pkg = await npm.fetchPackage('lodash')
const versions = await npm.fetchVersions('lodash')
const deps = await npm.fetchDependencies('lodash', '4.17.21')
```

### Cached registry

Wrap any registry with caching:

```ts
import { createCached } from 'unpux'
import 'unpux/registries'

const npm = createCached('npm')

// First call hits the network and writes to cache
const pkg = await npm.fetchPackage('lodash')

// Second call reads from cache (if TTL hasn't expired)
const same = await npm.fetchPackage('lodash')
```

By default, unpux uses filesystem storage and follows platform cache conventions: `~/.cache/unpux` on Linux (XDG), `~/Library/Caches/unpux` on macOS, `%LOCALAPPDATA%\unpux\cache` on Windows. Override with `UNPUX_CACHE_DIR` env var.

For edge/serverless runtimes, configure a custom unstorage driver (example: Cloudflare KV binding):

```ts
import { configureStorage, createCached } from 'unpux'
import { createStorage } from 'unstorage'
import cloudflareKVBindingDriver from 'unstorage/drivers/cloudflare-kv-binding'
import 'unpux/registries'

configureStorage(createStorage({
  driver: cloudflareKVBindingDriver({ binding: 'UNPUX_CACHE' }),
}))

const npm = createCached('npm')
const pkg = await npm.fetchPackage('lodash')
```

### PURL parsing

```ts
import { parsePURL, buildPURL, fullName } from 'unpux'

const parsed = parsePURL('pkg:npm/%40vue/core@3.5.0')
// { type: 'npm', namespace: '@vue', name: 'core', version: '3.5.0', qualifiers: {}, subpath: '' }

fullName(parsed) // "@vue/core"

buildPURL('cargo', 'serde', '1.0.0')
// "pkg:cargo/serde@1.0.0"
```

### Types

```ts
import type { Package, Version, Dependency, Maintainer, Registry, ParsedPURL } from 'unpux'
```

## CLI

```bash
unpux <command> [options]
```

| Command | Description |
|---------|-------------|
| `unpux info <purl>` | Package metadata (name, license, repo, latest version) |
| `unpux versions <purl>` | List all published versions |
| `unpux deps <purl>` | Dependencies for a specific version |
| `unpux maintainers <purl>` | Package maintainers / authors |
| `unpux cache status` | Show cache stats (entries, freshness) |
| `unpux cache path` | Print cache directory path |
| `unpux cache clear` | Remove all cached data |
| `unpux cache prune` | Remove stale entries |

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache, always fetch from registry |

## Caching

unpux stores fetched data and freshness metadata in unstorage. Default TTLs:

| Data type | TTL |
|-----------|-----|
| Package metadata | 1 hour |
| Version list | 30 minutes |
| Dependencies | 24 hours |
| Maintainers | 24 hours |

Each cached entry has a sha256 integrity hash. If the stored data doesn't match the hash, unpux refetches automatically.

## Data model

Every registry returns the same normalized types:

```ts
interface Package {
  name: string
  description: string
  homepage: string
  repository: string
  licenses: string       // SPDX-normalized
  keywords: string[]
  namespace: string      // e.g. "@vue" for npm scoped packages
  latestVersion: string
  metadata: Record<string, unknown>
}

interface Version {
  number: string
  publishedAt: Date | null
  licenses: string
  integrity: string
  status: '' | 'yanked' | 'deprecated' | 'retracted'
  metadata: Record<string, unknown>
}

interface Dependency {
  name: string
  requirements: string   // version constraint
  scope: 'runtime' | 'development' | 'test' | 'build' | 'optional'
  optional: boolean
}

interface Maintainer {
  uuid: string
  login: string
  name: string
  email: string
  url: string
  role: string
}
```

## License

[MIT](./LICENSE)
