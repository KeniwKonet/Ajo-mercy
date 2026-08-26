import "server-only";

/**
 * Read-path guard. A database blip on the public site should show an empty
 * state, not a 500 on the homepage, and it must not fail a production build
 * that prerenders those pages. Writes never use this: those must fail loudly.
 */
export async function safeRead<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[data] ${label} failed`, err instanceof Error ? err.message : err);
    return fallback;
  }
}
