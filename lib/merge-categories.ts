export function interleaveCategories<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== undefined) result.push(a[i]);
    if (b[i] !== undefined) result.push(b[i]);
  }
  return result;
}
