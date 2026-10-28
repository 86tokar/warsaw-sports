// Фильтры живут в адресе страницы. type, sport, district — списки через запятую (?sport=football,basketball):
// внутри одной строки фильтра значения объединяются «или», разные строки — «и».
export type Filters = {
  type?: string;
  sport?: string;
  district?: string;
  venue?: string;
  when?: string;
  free?: string;
  kids?: string;
};

// Собирает ссылку с учётом текущих фильтров и изменения одного из них
export function filterHref<T extends Record<string, string | undefined>>(current: T, patch: Partial<T>, base = '/'): string {
  const next = { ...current, ...patch };
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && value !== 'all') q.set(key, value);
  }
  // Запятые в списках оставляем читаемыми: ?sport=football,basketball
  const s = q.toString().replace(/%2C/gi, ',');
  return s ? `${base}?${s}` : base;
}

// Значение-список из адреса: "football,basketball" -> ['football', 'basketball']
export function listParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(',') : (value ?? '');
  return Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)));
}

// Добавляет значение в список или убирает, если оно уже выбрано; пустой список — фильтр снят
export function toggleParam(value: string | undefined, item: string): string | undefined {
  const list = listParam(value);
  const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  return next.length ? next.join(',') : undefined;
}
