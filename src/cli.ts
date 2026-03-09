#!/usr/bin/env node
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "regxa",
    version: "0.1.0",
    description:
      "Universal package registry client — query npm, PyPI, crates.io, RubyGems, Packagist with a single PURL-native API.",
  },
  subCommands: {
    info: () => import("./commands/info.ts").then((m) => m.default),
    versions: () => import("./commands/versions.ts").then((m) => m.default),
    deps: () => import("./commands/deps.ts").then((m) => m.default),
    maintainers: () => import("./commands/maintainers.ts").then((m) => m.default),
    cache: () => import("./commands/cache.ts").then((m) => m.default),
  },
});

runMain(main);
