import { defineCommand } from "citty";
import consola from "consola";
import { sharedArgs, resolvePURL, withErrorHandling } from "./shared.ts";

export default defineCommand({
  meta: {
    name: "versions",
    description: "List package versions",
  },
  args: {
    ...sharedArgs,
    purl: {
      type: "positional",
      description: "Package PURL (e.g. pkg:npm/lodash, cargo/serde)",
      required: true,
    },
    limit: {
      type: "string",
      alias: "l",
      description: "Max versions to show",
      default: "20",
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args["no-cache"]);
      const versions = await reg.fetchVersions(name);
      const limit = Number.parseInt(args.limit, 10) || 20;

      if (args.json) {
        console.log(JSON.stringify(versions.slice(0, limit), null, 2));
        return;
      }

      const shown = versions.slice(0, limit);

      consola.log("");
      consola.log(
        `  \x1b[1m${name}\x1b[0m — ${versions.length} version${versions.length === 1 ? "" : "s"}`,
      );
      consola.log("");

      for (const v of shown) {
        const status = v.status ? ` \x1b[33m[${v.status}]\x1b[0m` : "";
        const date = v.publishedAt
          ? `  \x1b[90m${v.publishedAt.toISOString().slice(0, 10)}\x1b[0m`
          : "";
        consola.log(`  ${v.number}${status}${date}`);
      }

      if (versions.length > limit) {
        consola.log(
          `\n  \x1b[90m... and ${versions.length - limit} more (use --limit to show more)\x1b[0m`,
        );
      }
      consola.log("");
    });
  },
});
