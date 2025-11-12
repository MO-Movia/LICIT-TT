export function clamp(min: number, val: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
