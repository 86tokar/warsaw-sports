// Все даты в базе хранятся в UTC, а показываем и фильтруем по времени Варшавы.
const TZ = 'Europe/Warsaw';
const DAY_MS = 86_400_000;

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parts(d: Date): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(d)) {
    if (p.type !== 'literal') o[p.type] = Number(p.value);
  }
  return o as unknown as Parts;
}

// Смещение Варшавы относительно UTC в миллисекундах для данного момента
function offsetMs(d: Date): number {
  const p = parts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

export function startOfWarsawDay(d: Date): Date {
  const p = parts(d);
  const guess = Date.UTC(p.year, p.month - 1, p.day);
  return new Date(guess - offsetMs(new Date(guess)));
}

export function addDays(startOfDay: Date, n: number): Date {
  return startOfWarsawDay(new Date(startOfDay.getTime() + n * DAY_MS + 12 * 3_600_000));
}

// "2026-10-30T18:00" (поле datetime-local) -> момент времени, считая что это время Варшавы
export function warsawLocalToDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const result = new Date(guess - offsetMs(new Date(guess)));
  return Number.isNaN(result.getTime()) ? null : result;
}

function weekday(d: Date): number {
  const p = parts(d);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = воскресенье
}

// Подписи периодов — в словарях (filters.whenOptions)
export const WHEN_OPTIONS = ['all', 'today', 'weekend', 'week'] as const;

export function resolveRange(when?: string): { from: Date; to?: Date } {
  const today = startOfWarsawDay(new Date());
  switch (when) {
    case 'today':
      return { from: today, to: addDays(today, 1) };
    case 'week':
      return { from: today, to: addDays(today, 7) };
    case 'weekend': {
      const dow = weekday(today);
      if (dow === 6) return { from: today, to: addDays(today, 2) };
      if (dow === 0) return { from: today, to: addDays(today, 1) };
      const saturday = addDays(today, 6 - dow);
      return { from: saturday, to: addDays(saturday, 2) };
    }
    default:
      return { from: today };
  }
}

export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function isToday(d: Date): boolean {
  return dayKey(d) === dayKey(new Date());
}

// locale — локаль Intl ('ru-RU', 'pl-PL', …), см. INTL_LOCALE в src/i18n
export function formatTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function dayLabel(d: Date, locale: string): { num: string; month: string; weekday: string } {
  // Месяц из формата "день + месяц", чтобы он был в нужном падеже ("października", "жовтня")
  const dm = new Intl.DateTimeFormat(locale, { timeZone: TZ, day: 'numeric', month: 'long' });
  const pts = dm.formatToParts(d);
  return {
    num: pts.find((p) => p.type === 'day')?.value ?? '',
    month: pts.find((p) => p.type === 'month')?.value ?? '',
    weekday: new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: 'long' }).format(d),
  };
}

export function formatFullDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
