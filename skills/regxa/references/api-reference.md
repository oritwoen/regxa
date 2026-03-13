# API Reference

## Return Types

### Package

Returned by `fetchPackageFromPURL()` and `registry.fetchPackage()`:

```typescript
interface Package {
  name: string;           // "lodash", "@babel/core", "flask"
  description: string;    // Short summary
  homepage: string;       // Project homepage URL
  documentation: string;  // Docs URL
  repository: string;     // Normalized git repository URL
  licenses: string;       // SPDX expression: "MIT", "Apache-2.0 OR MIT"
  keywords: string[];     // Tags
  namespace: string;      // "@babel" for npm, "laravel" for composer, "" if none
  latestVersion: string;  // Latest stable version
  metadata: Record<string, unknown>; // Ecosystem-specific extras
}
```

### Version

Returned by `fetchVersionsFromPURL()` and `registry.fetchVersions()`:

```typescript
interface Version {
  number: string;           // "4.17.21", "1.0.0"
  publishedAt: Date | null; // Publish timestamp
  licenses: string;         // SPDX for this version
  integrity: string;        // "sha256-<hex>" or "sha1-<hex>"
  status: "" | "yanked" | "deprecated" | "retracted";
  metadata: Record<string, unknown>;
}
```

### Dependency

Returned by `fetchDependenciesFromPURL()` and `registry.fetchDependencies()`:

```typescript
interface Dependency {
  name: string;        // "express", "tokio"
  requirements: string; // "^1.0.0", ">=2,<4"
  scope: "runtime" | "development" | "test" | "build" | "optional";
  optional: boolean;
}
```

### Maintainer

Returned by `fetchMaintainersFromPURL()` and `registry.fetchMaintainers()`:

```typescript
interface Maintainer {
  uuid: string;  // Registry-specific ID
  login: string; // Username
  name: string;  // Display name
  email: string; // Email address
  url: string;   // Profile URL
  role: string;  // "author", "contributor", "owner", ""
}
```

## Helper Functions

### selectVersion(versions, options?)

Pick the best version from a list. Resolution order:
1. Exact match for `options.requested` (non-yanked)
2. Exact match for `options.latest` (non-yanked)
3. Newest available version with no negative status

Returns `null` if no usable version exists.

### bulkFetchPackages(purls, options?)

Fetch metadata for up to 50 packages concurrently. Failed lookups are silently omitted from the result map.

Options:
- `concurrency`: Max concurrent fetches (default: 15)
- `signal`: AbortSignal for cancellation
- `client`: Custom HTTP client

### resolveDocsUrl(pkg, urls, version?)

Resolve the best documentation URL. Fallback chain: `pkg.documentation` -> `pkg.homepage` -> `urls.documentation()`.

### resolveReadmeUrl(pkg, urls, version?)

Get the ecosystem-specific README URL.

## Supported Ecosystems

| Ecosystem | Type | Default Registry |
|-----------|------|-----------------|
| npm | `npm` | registry.npmjs.org |
| PyPI | `pypi` | pypi.org |
| crates.io | `cargo` | crates.io |
| RubyGems | `gem` | rubygems.org |
| Packagist | `composer` | packagist.org |
| Arch Linux | `alpm` | archlinux.org + aur.archlinux.org |
