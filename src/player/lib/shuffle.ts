/**
 * Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a uniform shuffle --
 * it gives a comparator inconsistent results, so the engine's idea of "random"
 * order was measurably biased toward the authored order.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
