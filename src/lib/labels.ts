export const EVENT_TYPES = [
  { slug: 'match', label: 'Матч' },
  { slug: 'tournament', label: 'Турнир' },
  { slug: 'mass', label: 'Массовое событие' },
  { slug: 'open_training', label: 'Открытая тренировка' },
] as const;

export function typeLabel(slug: string): string {
  return EVENT_TYPES.find((t) => t.slug === slug)?.label ?? slug;
}

export function isEventType(slug: string): boolean {
  return EVENT_TYPES.some((t) => t.slug === slug);
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

// Для кого секция. «all» показывается и в детском, и во взрослом фильтре
export const AUDIENCES = [
  { slug: 'kids', label: 'Детям' },
  { slug: 'adults', label: 'Взрослым' },
  { slug: 'seniors', label: 'Сеньорам' },
  { slug: 'all', label: 'Всем возрастам' },
] as const;

export function audienceLabel(slug: string): string {
  return AUDIENCES.find((a) => a.slug === slug)?.label ?? slug;
}

export function ageLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} лет`;
  if (min != null) return `от ${min} лет`;
  if (max != null) return `до ${max} лет`;
  return null;
}
