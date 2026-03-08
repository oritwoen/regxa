# regxa

[![npm version](https://img.shields.io/npm/v/regxa?style=flat&colorA=130f40&colorB=474787)](https://npmjs.com/package/regxa)
[![npm downloads](https://img.shields.io/npm/dm/regxa?style=flat&colorA=130f40&colorB=474787)](https://npm.chart.dev/regxa)
[![license](https://img.shields.io/github/license/oritwoen/regxa?style=flat&colorA=130f40&colorB=474787)](https://github.com/oritwoen/regxa/blob/main/LICENSE)

> Query npm, PyPI, crates.io, RubyGems, Packagist, and Arch Linux with one API. PURL-native, typed, cached.

## Why?

If you need package metadata from multiple registries, you currently have two options: call each registry's REST API yourself (they all work differently), or depend on a third-party aggregation service.

There is no embeddable TypeScript library that normalizes across registries. The closest thing is [git-pkgs/registries](https://github.com/git-pkgs/registries) in Go, which covers 25 ecosystems but is Go-only. Aggregation APIs like [ecosyste.ms](https://ecosyste.ms/) and [deps.dev](https://deps.dev/) exist, but they are external services you can't bundle into your own tool.

regxa fills that gap. One `fetchPackage` call, same response shape, regardless of whether the package lives on npm or Packagist. Uses [PURL (ECMA-427)](https://github.com/package-url/purl-spec) for addressing, so `pkg:npm/lodash` and `pkg:cargo/serde` resolve through the same code path. Storage-backed caching with a lockfile keeps things fast on repeated lookups.

## Features

- 🔍 **Single API, six registries** — npm, PyPI, crates.io, RubyGems, Packagist, Arch Linux (official + AUR)
- 📦 **PURL-native** — [ECMA-427](https://github.com/package-url/purl-spec) identifiers as first-class input
- 🏷️ **Normalized data model** — same `Package`, `Version`, `Dependency`, `Maintainer` types everywhere
- 💾 **Storage-backed cache + lockfile** — unstorage-native, sha256 integrity checks, configurable TTL
- ⌨️ **CLI included** — `regxa info npm/lodash`, `regxa versions cargo/serde`, `regxa deps pypi/flask@3.1.1`
- 🔁 **Retry + backoff** — exponential backoff with jitter, rate limiter interface
- 🪶 **ESM-only, zero CJS** — built with [obuild](https://github.com/unjs/obuild)

## Install

```bash
pnpm add regxa
```

For the AI SDK tool (`regxa/ai` subpath), also install `ai` and `zod`:

```bash
pnpm add ai zod
```

## Quick start

### API

```ts
import { fetchPackageFromPURL } from 'regxa'

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
await fetchPackageFromPURL('pkg:alpm/arch/pacman')
```

### CLI

The `pkg:` prefix is optional in the CLI — `npm/lodash` works just as well:

```bash
regxa info npm/lodash
regxa versions cargo/serde
regxa deps pypi/flask@3.1.1
regxa maintainers gem/rails
regxa deps alpm/aur/paru
```

Add `--json` for machine-readable output, `--no-cache` to skip the cache.

### AI SDK tool

`regxa/ai` exports a ready-made tool for AI SDK apps:

```ts
import { generateText } from 'ai'
import { packageTool } from 'regxa/ai'

const { text } = await generateText({
  model: yourModel,
  tools: { packageRegistry: packageTool },
  prompt: 'Show me the latest metadata for pkg:npm/lodash and then list its maintainers.',
})
```

The tool supports these operations through one input schema:

```ts
// { operation: 'package', purl: 'pkg:npm/lodash' }
// { operation: 'versions', purl: 'pkg:cargo/serde' }
// { operation: 'dependencies', purl: 'pkg:pypi/flask@3.1.1' }
// { operation: 'maintainers', purl: 'pkg:gem/rails' }
// { operation: 'bulk-packages', purls: ['pkg:npm/lodash', 'pkg:cargo/serde'], concurrency?: number }
```

## Registries

| Ecosystem | PURL type | Registry |
|-----------|-----------|----------|
| npm | `pkg:npm/...` | registry.npmjs.org |
| Cargo | `pkg:cargo/...` | crates.io |
| PyPI | `pkg:pypi/...` | pypi.org |
| RubyGems | `pkg:gem/...` | rubygems.org |
| Packagist | `pkg:composer/...` | packagist.org |
| Arch Linux | `pkg:alpm/...` | archlinux.org, aur.archlinux.org |

Scoped packages work as expected: `pkg:npm/%40vue/core` or `npm/@vue/core` in the CLI.

Arch Linux packages use a namespace: `pkg:alpm/arch/pacman` (or just `pkg:alpm/pacman`) for official repos, `pkg:alpm/aur/paru` for AUR. Official packages default to `arch` when the namespace is omitted; AUR requires the explicit `aur` namespace.

## API reference

### PURL helpers

```ts
import { fetchPackageFromPURL, fetchVersionsFromPURL, fetchDependenciesFromPURL, fetchMaintainersFromPURL, bulkFetchPackages } from 'regxa'

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
import { create } from 'regxa'
import 'regxa/registries' // registers all built-in ecosystems

const npm = create('npm')
const pkg = await npm.fetchPackage('lodash')
const versions = await npm.fetchVersions('lodash')
const deps = await npm.fetchDependencies('lodash', '4.17.21')
```

### Cached registry

Wrap any registry with caching:

```ts
import { createCached } from 'regxa'
import 'regxa/registries'

const npm = createCached('npm')

// First call hits the network and writes to cache
const pkg = await npm.fetchPackage('lodash')

// Second call reads from cache (if TTL hasn't expired)
const same = await npm.fetchPackage('lodash')
```

By default, regxa uses filesystem storage and follows platform cache conventions: `~/.cache/regxa` on Linux (XDG), `~/Library/Caches/regxa` on macOS, `%LOCALAPPDATA%\regxa\cache` on Windows. Override with `REGXA_CACHE_DIR` env var.

For edge/serverless runtimes, configure a custom unstorage driver (example: Cloudflare KV binding):

```ts
import { configureStorage, createCached } from 'regxa'
import { createStorage } from 'unstorage'
import cloudflareKVBindingDriver from 'unstorage/drivers/cloudflare-kv-binding'
import 'regxa/registries'

configureStorage(createStorage({
  driver: cloudflareKVBindingDriver({ binding: 'REGXA_CACHE' }),
}))

const npm = createCached('npm')
const pkg = await npm.fetchPackage('lodash')
```

### PURL parsing

```ts
import { parsePURL, buildPURL, fullName } from 'regxa'

const parsed = parsePURL('pkg:npm/%40vue/core@3.5.0')
// { type: 'npm', namespace: '@vue', name: 'core', version: '3.5.0', qualifiers: {}, subpath: '' }

fullName(parsed) // "@vue/core"

buildPURL('cargo', 'serde', '1.0.0')
// "pkg:cargo/serde@1.0.0"
```

### Types

```ts
import type { Package, Version, Dependency, Maintainer, Registry, ParsedPURL } from 'regxa'
```

## CLI

```bash
regxa <command> [options]
```

| Command | Description |
|---------|-------------|
| `regxa info <purl>` | Package metadata (name, license, repo, latest version) |
| `regxa versions <purl>` | List all published versions |
| `regxa deps <purl>` | Dependencies for a specific version |
| `regxa maintainers <purl>` | Package maintainers / authors |
| `regxa cache status` | Show cache stats (entries, freshness) |
| `regxa cache path` | Print cache directory path |
| `regxa cache clear` | Remove all cached data |
| `regxa cache prune` | Remove stale entries |

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |
| `--no-cache` | Bypass cache, always fetch from registry |

## Caching

regxa stores fetched data and freshness metadata in unstorage. Default TTLs:

| Data type | TTL |
|-----------|-----|
| Package metadata | 1 hour |
| Version list | 30 minutes |
| Dependencies | 24 hours |
| Maintainers | 24 hours |

Each cached entry has a sha256 integrity hash. If the stored data doesn't match the hash, regxa refetches automatically.

## Data model

Every registry returns the same normalized types:

```ts
interface Package {
  name: string
  description: string
  homepage: string
  documentation: string  // docs URL (docs.rs, readthedocs, rubydoc, etc.)
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
