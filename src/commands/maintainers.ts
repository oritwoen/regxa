import { defineCommand } from 'citty'
import consola from 'consola'
import { sharedArgs, resolvePURL, withErrorHandling } from './shared.ts'

export default defineCommand({
  meta: {
    name: 'maintainers',
    description: 'List package maintainers',
  },
  args: {
    ...sharedArgs,
    purl: {
      type: 'positional',
      description: 'Package PURL (e.g. pkg:npm/lodash, gem/rails)',
      required: true,
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args['no-cache'])
      const maintainers = await reg.fetchMaintainers(name)

      if (args.json) {
        console.log(JSON.stringify(maintainers, null, 2))
        return
      }

      consola.log('')
      consola.log(`  \x1b[1m${name}\x1b[0m — ${maintainers.length} maintainer${maintainers.length === 1 ? '' : 's'}`)
      consola.log('')

      for (const m of maintainers) {
        const nameStr = m.name || m.login || 'unknown'
        const parts: string[] = [nameStr]
        if (m.login && m.login !== nameStr) parts.push(`\x1b[90m(${m.login})\x1b[0m`)
        if (m.email) parts.push(`\x1b[90m<${m.email}>\x1b[0m`)
        if (m.role) parts.push(`\x1b[36m[${m.role}]\x1b[0m`)
        consola.log(`  ${parts.join(' ')}`)
        if (m.url) consola.log(`    \x1b[90m${m.url}\x1b[0m`)
      }
      consola.log('')
    })
  },
})
