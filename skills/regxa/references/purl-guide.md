# PURL Guide

Package URLs (PURLs) identify packages across ecosystems. Full spec: [github.com/package-url/purl-spec](https://github.com/package-url/purl-spec).

## Format

```
pkg:<type>/<namespace>/<name>@<version>?<qualifiers>#<subpath>
```

Only `type` and `name` are required. Everything else is optional.

## Scoped and Namespaced Packages

### npm scoped packages

The `@` in npm scopes must be percent-encoded as `%40`:

```
pkg:npm/%40babel/core@7.0.0    # @babel/core
pkg:npm/%40vue/core             # @vue/core
pkg:npm/lodash                  # unscoped, no namespace
```

### Packagist (Composer)

Vendor is the namespace:

```
pkg:composer/laravel/framework@11.0.0
pkg:composer/symfony/console
```

### Arch Linux (ALPM)

Repository is the namespace (`arch` for official, `aur` for AUR):

```
pkg:alpm/arch/linux
pkg:alpm/aur/yay
```

If no namespace is given, `arch` is assumed.

## Special Characters

Characters that need percent-encoding in PURLs:

| Character | Encoded | Example |
|-----------|---------|---------|
| `@` | `%40` | `%40babel/core` |
| `/` | `%2F` | (in name only, not as separator) |
| `+` | `%2B` | `1.0.0%2Bbuild.123` |
| space | `%20` | `my%20package` |

## Shorthand

regxa accepts shorthand without the `pkg:` prefix:

```
npm/lodash@4.17.21          -> pkg:npm/lodash@4.17.21
cargo/serde                 -> pkg:cargo/serde
pypi/flask@3.1.1            -> pkg:pypi/flask@3.1.1
```

## Name Normalization

Some ecosystems normalize package names during PURL parsing:

- **PyPI**: Lowercased, runs of `-`, `_`, `.` collapsed to single `-`. `Django_REST_Framework` becomes `django-rest-framework`.
- **ALPM**: Lowercased.
- **npm, cargo, gem, composer**: No normalization (case-sensitive).

## Qualifiers

Optional key-value pairs after `?`:

```
pkg:npm/lodash?repository_url=https://custom.registry.com
```

The `repository_url` qualifier overrides the default registry base URL.

## Building PURLs Programmatically

```typescript
import { buildPURL, parsePURL } from "regxa";

const purl = buildPURL({
  type: "npm",
  namespace: "@babel",
  name: "core",
  version: "7.0.0",
});
// -> "pkg:npm/%40babel/core@7.0.0"

const parsed = parsePURL("pkg:npm/%40babel/core@7.0.0");
// -> { type: "npm", namespace: "@babel", name: "core", version: "7.0.0", qualifiers: {}, subpath: "" }
```
