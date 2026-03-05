import { defineBuildConfig } from 'obuild/config'

export default defineBuildConfig({
  entries: [
    {
      type: 'bundle',
      input: [
        './src/index.ts',
        './src/types.ts',
        './src/core/index.ts',
        './src/registries/index.ts',
        './src/cli.ts',
        './src/commands/shared.ts',
        './src/commands/info.ts',
        './src/commands/versions.ts',
        './src/commands/deps.ts',
        './src/commands/maintainers.ts',
        './src/commands/cache.ts',
 
        './src/cache/index.ts',
 
        './src/cache/paths.ts',
 
        './src/cache/lockfile.ts',
 
        './src/cache/storage.ts',
 
        './src/cache/cached-registry.ts',
      ],
    },
  ],
})
