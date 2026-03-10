import { defineCommand } from "citty";
import consola from "consola";
import { getCacheDir } from "../cache/paths.ts";
import { clearStorage } from "../cache/storage.ts";
import { readLockfile, writeLockfile, pruneStale } from "../cache/lockfile.ts";

export default defineCommand({
  meta: {
    name: "cache",
    description: "Manage the regxa cache",
  },
  subCommands: {
    clear: defineCommand({
      meta: {
        name: "clear",
        description: "Remove all cached data",
      },
      async run() {
        await clearStorage();
        await writeLockfile({ version: 1, entries: {} });
        consola.success("Cache cleared");
      },
    }),
    path: defineCommand({
      meta: {
        name: "path",
        description: "Show cache directory path",
      },
      run() {
        console.log(getCacheDir());
      },
    }),
    status: defineCommand({
      meta: {
        name: "status",
        description: "Show cache status and entry count",
      },
      async run() {
        const lockfile = await readLockfile();
        const entries = Object.values(lockfile.entries);
        const fresh = entries.filter((e) => {
          const expiresAt = e.fetchedAt + e.ttl * 1000;
          return Date.now() < expiresAt;
        });
        const stale = entries.length - fresh.length;

        consola.log("");
        consola.log(`  \x1b[1mCache status\x1b[0m`);
        consola.log(`  \x1b[90mDirectory:\x1b[0m  ${getCacheDir()}`);
        consola.log(
          `  \x1b[90mEntries:\x1b[0m    ${entries.length} total, ${fresh.length} fresh, ${stale} stale`,
        );
        consola.log("");

        if (fresh.length > 0) {
          // Group by ecosystem
          const byEco = new Map<string, number>();
          for (const e of fresh) {
            const eco = e.key.split(":")[0]!;
            byEco.set(eco, (byEco.get(eco) ?? 0) + 1);
          }
          for (const [eco, count] of byEco) {
            consola.log(`  \x1b[36m${eco}\x1b[0m: ${count} cached`);
          }
          consola.log("");
        }
      },
    }),
    prune: defineCommand({
      meta: {
        name: "prune",
        description: "Remove stale cache entries",
      },
      async run() {
        const lockfile = await readLockfile();
        const removed = pruneStale(lockfile);
        await writeLockfile(lockfile);
        consola.success(`Pruned ${removed} stale entries`);
      },
    }),
  },
});
