# PURL Cheatsheet

Quick reference for constructing PURLs to pass to the regxa AI tool.

## Format

```
pkg:<type>/<name>@<version>
```

## Examples by Ecosystem

| Package | PURL |
|---------|------|
| lodash (npm) | `pkg:npm/lodash` |
| lodash v4.17.21 | `pkg:npm/lodash@4.17.21` |
| @babel/core (npm scoped) | `pkg:npm/%40babel/core@7.0.0` |
| flask (PyPI) | `pkg:pypi/flask@3.1.1` |
| Django REST Framework | `pkg:pypi/django-rest-framework` |
| serde (Rust) | `pkg:cargo/serde@1.0.0` |
| rails (Ruby) | `pkg:gem/rails@7.1.0` |
| laravel/framework (PHP) | `pkg:composer/laravel/framework@11.0.0` |
| linux (Arch official) | `pkg:alpm/arch/linux` |
| yay (AUR) | `pkg:alpm/aur/yay` |

## Scoped Packages

npm scopes: encode `@` as `%40`:
- `@vue/core` -> `pkg:npm/%40vue/core`
- `@types/node` -> `pkg:npm/%40types/node`

Composer vendors: use path separator:
- `symfony/console` -> `pkg:composer/symfony/console`

## Common Mistakes

| Wrong | Correct | Why |
|-------|---------|-----|
| `pkg:npm/@babel/core` | `pkg:npm/%40babel/core` | `@` must be percent-encoded |
| `pkg:pip/flask` | `pkg:pypi/flask` | Type is `pypi`, not `pip` |
| `pkg:crate/serde` | `pkg:cargo/serde` | Type is `cargo`, not `crate` |
| `pkg:rubygems/rails` | `pkg:gem/rails` | Type is `gem`, not `rubygems` |
| `pkg:packagist/laravel/framework` | `pkg:composer/laravel/framework` | Type is `composer` |
| `pkg:pypi/Django_REST_Framework` | `pkg:pypi/django-rest-framework` | PyPI names are normalized |

## Operations That Require a Version

The `dependencies` operation requires a version in the PURL:
- `pkg:npm/lodash@4.17.21` (works)
- `pkg:npm/lodash` (fails for dependencies)

All other operations work with or without a version.
