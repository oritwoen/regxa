---
name: regxa
description: Query package metadata from npm, PyPI, crates.io, RubyGems, Packagist, and Arch Linux using regxa. Supports looking up package info, versions, dependencies, and maintainers via PURL-native API or CLI. Use when the user needs package registry data across ecosystems. Do not use for building or publishing packages, managing lockfiles, or installing dependencies.
metadata:
  author: oritwoen
  version: "0.1.5"
---

# Query Package Registries with regxa

regxa is a universal package registry client. It queries npm, PyPI, crates.io, RubyGems, Packagist, and Arch Linux with a single API. Packages are addressed using PURLs (Package URLs).

## PURL Format

All queries use PURLs to identify packages:

```text
pkg:<type>/<name>@<version>
```

| Ecosystem | PURL type | Example |
|-----------|-----------|---------|
| npm | `npm` | `pkg:npm/lodash`, `pkg:npm/%40babel/core@7.0.0` |
| PyPI | `pypi` | `pkg:pypi/flask@3.1.1` |
| crates.io | `cargo` | `pkg:cargo/serde@1.0.0` |
| RubyGems | `gem` | `pkg:gem/rails@7.1.0` |
| Packagist | `composer` | `pkg:composer/laravel/framework@11.0.0` |
| Arch Linux | `alpm` | `pkg:alpm/arch/linux`, `pkg:alpm/aur/yay` |

The CLI accepts shorthand without the `pkg:` prefix (e.g., `npm/lodash@4.17.21`). The PURL helpers (`fetchPackageFromPURL`, etc.) require the full `pkg:` prefix. The lower-level registry API takes bare package names directly.

Read `references/purl-guide.md` for scoped packages, namespaces, and special characters.

## Using the CLI

### Package info

```bash
regxa info npm/lodash
regxa info pkg:cargo/serde --json
```

### Version listing

```bash
regxa versions pypi/flask
regxa versions pkg:npm/%40vue/core --json
```

### Dependencies (requires version)

```bash
regxa deps npm/lodash@4.17.21
regxa deps pkg:pypi/flask@3.1.1 --json
```

### Maintainers

```bash
regxa maintainers gem/rails
regxa maintainers pkg:composer/laravel/framework
```

### Cache management

```bash
regxa cache clear          # Clear all cached data
```

Query commands (`info`, `versions`, `deps`, `maintainers`) accept `--json` for machine-readable output and `--no-cache` to bypass the cache.

## Using the Library API

### Install

```bash
npm install regxa
```

### One-shot PURL helpers

The simplest way to query. Pass a PURL string, get normalized data:

```typescript
import {
  fetchPackageFromPURL,
  fetchVersionsFromPURL,
  fetchDependenciesFromPURL,
  fetchMaintainersFromPURL,
  bulkFetchPackages,
} from "regxa";

// Single package
const pkg = await fetchPackageFromPURL("pkg:npm/lodash");
console.log(pkg.name, pkg.licenses, pkg.latestVersion);

// All versions
const versions = await fetchVersionsFromPURL("pkg:cargo/serde");

// Dependencies for a specific version
const deps = await fetchDependenciesFromPURL("pkg:pypi/flask@3.1.1");

// Maintainers
const maintainers = await fetchMaintainersFromPURL("pkg:gem/rails");

// Bulk fetch (concurrent)
const packages = await bulkFetchPackages([
  "pkg:npm/lodash",
  "pkg:cargo/serde",
  "pkg:pypi/flask",
]);
```

### Registry API (lower level)

For more control, create a registry instance directly:

```typescript
import { create } from "regxa";

const npm = create("npm");

const pkg = await npm.fetchPackage("lodash");
const versions = await npm.fetchVersions("@babel/core");
const deps = await npm.fetchDependencies("lodash", "4.17.21");
const urls = npm.urls();
console.log(urls.registry("lodash"));       // npmjs.com URL
console.log(urls.documentation("lodash"));  // docs URL
console.log(urls.purl("lodash", "4.17.21")); // PURL string
```

### Cached queries

Wrap any registry with caching:

```typescript
import { create, CachedRegistry } from "regxa";

const npm = create("npm");
const cached = new CachedRegistry(npm);

// First call fetches from network, subsequent calls use disk cache
const pkg = await cached.fetchPackage("lodash");
```

### Helper utilities

```typescript
import { create, selectVersion, resolveDocsUrl } from "regxa";

// Pick the best version from a list
const best = selectVersion(versions, { requested: "4.17.21" });

// Resolve documentation URL with fallback chain
const npm = create("npm");
const docsUrl = resolveDocsUrl(pkg, npm.urls(), "4.17.21");
```

Read `references/api-reference.md` for the full type definitions and return shapes.

## Error Handling

| Error | When | What to do |
|-------|------|------------|
| `NotFoundError` | Package or version does not exist | Check the PURL spelling and ecosystem |
| `InvalidPURLError` | Malformed PURL string | Fix the format (see PURL table above) |
| `UnknownEcosystemError` | Unsupported ecosystem type | Use one of: npm, cargo, pypi, gem, composer, alpm |
| `RateLimitError` | Registry rate limit hit | The client retries automatically; wait if persistent |
