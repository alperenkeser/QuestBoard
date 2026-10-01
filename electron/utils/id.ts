import { randomUUID } from "node:crypto";

/** Generates a prefixed unique id (e.g. "quest-<uuid>"). Mirrors src/services/id.ts for the renderer. */
export function generateId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
