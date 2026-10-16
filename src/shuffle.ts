export function shuffle<T>(items: readonly T[]): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = next[i] as T;
    const right = next[j] as T;
    next[i] = right;
    next[j] = left;
  }
  return next;
}
