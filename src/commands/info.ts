import { defineCommand } from 'citty'
import consola from 'consola'
import { sharedArgs, resolvePURL, withErrorHandling } from './shared.ts'

export default defineCommand({
  meta: {
    name: 'info',
    description: 'Show package metadata',
  },
  args: {
    ...sharedArgs,
    purl: {
      type: 'positional',
      description: 'Package PURL (e.g. pkg:npm/lodash, cargo/serde@1.0)',
      required: true,
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args['no-cache'])
      const pkg = await reg.fetchPackage(name)

      if (args.json) {
        console.log(JSON.stringify(pkg, null, 2))
        return
      }

      const urls = reg.urls()

      consola.log('')
      consola.log(`  \x1b[1m\x1b[36m${pkg.name}\x1b[0m${pkg.latestVersion ? `\x1b[90m@${pkg.latestVersion}\x1b[0m` : ''}`)
      if (pkg.description) {
        consola.log(`  ${pkg.description}`)
      }
      consola.log('')

      if (pkg.licenses) consola.log(`  \x1b[90mLicense:\x1b[0m    ${pkg.licenses}`)
      if (pkg.repository) consola.log(`  \x1b[90mRepository:\x1b[0m ${pkg.repository}`)
      if (pkg.homepage) consola.log(`  \x1b[90mHomepage:\x1b[0m   ${pkg.homepage}`)
      consola.log(`  \x1b[90mRegistry:\x1b[0m   ${urls.registry(name)}`)
      if (pkg.keywords.length > 0) {
        consola.log(`  \x1b[90mKeywords:\x1b[0m   ${pkg.keywords.join(', ')}`)
      }
      if (pkg.namespace) consola.log(`  \x1b[90mNamespace:\x1b[0m  ${pkg.namespace}`)
      consola.log(`  \x1b[90mEcosystem:\x1b[0m  ${reg.ecosystem()}`)
      consola.log('')
    })
  },
})
