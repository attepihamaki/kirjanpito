/**
 * The only randomness seam in the domain layer. Every function that needs an
 * id takes a `makeId` factory so tests can inject a deterministic one.
 */

/** A short, collision-resistant id. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** A deterministic, incrementing id factory — use this in tests. */
export function createIdFactory(prefix = "id"): () => string {
  let n = 0
  return () => `${prefix}-${++n}`
}
