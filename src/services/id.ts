/** Generates a prefixed unique id (e.g. "quest-<uuid>"). */
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
