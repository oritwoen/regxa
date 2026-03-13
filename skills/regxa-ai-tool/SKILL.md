---
name: regxa-ai-tool
description: Integrates regxa's packageTool into AI applications built with the Vercel AI SDK. Provides structured package registry queries (info, versions, dependencies, maintainers, bulk lookups) as a tool for LLM agents. Use when building AI apps that need to query npm, PyPI, crates.io, or other registries. Do not use for direct CLI usage or non-AI integrations.
metadata:
  author: oritwoen
  version: "0.1.5"
---

# regxa AI Tool Integration

regxa exports a ready-made `packageTool` compatible with the Vercel AI SDK. It gives AI agents structured access to package registry data across npm, PyPI, crates.io, RubyGems, Packagist, and Arch Linux.

## Step 1: Install Dependencies

```bash
npm install regxa ai @ai-sdk/openai  # or any AI SDK provider
```

## Step 2: Register the Tool

Import `packageTool` from `regxa/ai` and pass it to the AI SDK:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { packageTool } from "regxa/ai";

const result = await generateText({
  model: openai("gpt-4o"),
  tools: { package: packageTool },
  prompt: "What are the dependencies of flask 3.1.1?",
});
```

The tool handles PURL construction, API calls, normalization, and error handling internally.

## Step 3: Understand the Operations

The tool accepts a discriminated union input with these operations:

### `package` - Fetch package metadata

```json
{ "operation": "package", "purl": "pkg:npm/lodash" }
```

Returns: name, description, licenses, repository, latest version, keywords.

### `versions` - List all versions

```json
{ "operation": "versions", "purl": "pkg:cargo/serde" }
```

Returns: version numbers, publish dates, integrity hashes, status (yanked/deprecated).

### `dependencies` - List dependencies for a version

```json
{ "operation": "dependencies", "purl": "pkg:pypi/flask@3.1.1" }
```

Returns: dependency names, version constraints, scope (runtime/dev/test/build), optional flag.

**Note:** The PURL must include a version. Without it, the tool returns an error.

### `maintainers` - List package maintainers

```json
{ "operation": "maintainers", "purl": "pkg:gem/rails" }
```

Returns: login, name, email, role for each maintainer.

### `bulk-packages` - Fetch multiple packages at once

```json
{ "operation": "bulk-packages", "purls": ["pkg:npm/lodash", "pkg:cargo/serde"], "concurrency": 10 }
```

Returns: map of PURL to package metadata. Fetches up to 50 PURLs concurrently (default concurrency: 15). Failed lookups are silently omitted.

## Step 4: Use with Streaming

The tool works with `streamText` as well:

```typescript
import { streamText } from "ai";
import { packageTool } from "regxa/ai";

const result = streamText({
  model: openai("gpt-4o"),
  tools: { package: packageTool },
  prompt: "Compare the latest versions of express and fastify",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## PURL Format Quick Reference

Read `references/purl-cheatsheet.md` for the PURL format details and ecosystem-specific examples.

## Error Handling

The tool throws errors as exceptions (not structured return values). The AI SDK catches these and surfaces them to the agent as tool call failures:

- **`NotFoundError`**: Package or version does not exist
- **`InvalidPURLError`**: Malformed PURL string (missing `pkg:` prefix, bad encoding)
- **`UnknownEcosystemError`**: Unsupported ecosystem type
- **`RateLimitError`**: Registry rate limit hit (the HTTP client retries automatically first)

The agent receives the error message and can self-correct (e.g., fix PURL format, try a different ecosystem). If you need custom error handling, wrap the tool's `execute` function.
