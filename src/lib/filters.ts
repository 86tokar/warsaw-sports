export type Filters = {
  type?: string;
  sport?: string;
  district?: string;
  venue?: string;
  when?: string;
  free?: string;
  kids?: string;
};

// Собирает ссылку на главную с учётом текущих фильтров и изменения одного из них
export function filterHref<T extends Record<string, string | undefined>>(current: T, patch: Partial<T>, base = '/'): string {
  const next = { ...current, ...patch };
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && value !== 'all') q.set(key, value);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
