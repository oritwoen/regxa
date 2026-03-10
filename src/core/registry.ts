import type { Registry, RegistryFactory } from "./types.ts";
import type { Client } from "./client.ts";
import { defaultClient } from "./client.ts";
import { UnknownEcosystemError } from "./errors.ts";

const factories = new Map<string, RegistryFactory>();
const defaults = new Map<string, string>();

/** Register an ecosystem factory. Called by each registry module on import (side-effect). */
export function register(ecosystem: string, defaultURL: string, factory: RegistryFactory): void {
  factories.set(ecosystem, factory);
  defaults.set(ecosystem, defaultURL);
}

/** Create a registry instance for the given ecosystem. */
export function create(ecosystem: string, baseURL?: string, client?: Client): Registry {
  const factory = factories.get(ecosystem);
  if (!factory) {
    throw new UnknownEcosystemError(ecosystem);
  }
  const url = baseURL || defaults.get(ecosystem)!;
  return factory(url, client ?? defaultClient());
}

/** List all registered ecosystem names. */
export function ecosystems(): string[] {
  return [...factories.keys()];
}

/** Check if an ecosystem is registered. */
export function has(ecosystem: string): boolean {
  return factories.has(ecosystem);
}
