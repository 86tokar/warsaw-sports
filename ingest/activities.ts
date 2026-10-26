// Секции (регулярные занятия): проверка выписанного и запись в таблицу Activity.
import type { PrismaClient } from '@prisma/client';
import { norm } from './html';
import type { ExtractedActivity } from './schema';
import { SOURCES, SPORTS, type Source } from './sources';
import { findVenue, type VenueRow } from './venues';

export type PlannedActivity = {
  source: string;
  externalId: string;
  name: string;
  sport: keyof typeof SPORTS;
  audience: ExtractedActivity['audience'];
  ageMin: number | null;
  ageMax: number | null;
  schedule: string | null;
  venue: string | null;
  locationNote: string | null;
  district: string | null;
  url: string;
  priceInfo: string | null;
  isFree: boolean;
};

type Skipped = { source: string; match: string; reason: string };

const slug = (s: string) => norm(s).replace(/ /g, '-');

// Секции для пенсионеров на сайт не берём: метка «только сеньоры» или явная программа для пожилых в названии.
// "kadet-senior", "Junior/Senior" — взрослая спортивная категория, они остаются; "dla dorosłych i seniorów" тоже.
const SENIOR_PROGRAM = /aktywn\w* senior|dla senior|senior\s*[-–]|senior starszy|aktywacja senior|seniorek|\b5[05]\s*\+|\b60\s*\+|trzeciego wieku/i;
export const isSeniorOnly = (audience: string, name: string) => audience === 'seniors' || SENIOR_PROGRAM.test(name);

const words = (s: string | null) => norm(s ?? '').split(' ').filter((w) => w.length >= 4);

// Фрагмент evidence должен быть на странице и содержать слово из названия секции
// или (если название — заголовок раздела над списком групп) место и время занятий этой группы.
function verify(a: ExtractedActivity, pageNorm: string): string | null {
  const ev = norm(a.evidence);
  if (ev.length < 8 || !pageNorm.includes(ev)) return 'фрагмент evidence не найден на странице';
  const name = words(a.name);
  if (!name.length || name.some((w) => ev.includes(w))) return null;
  const place = words(a.venueName ?? a.locationNote);
  const times = (a.schedule ?? '').match(/\d{1,2}:\d{2}/g) ?? [];
  const hasPlace = place.some((w) => ev.includes(w));
  const hasTime = times.some((t) => ev.includes(norm(t)));
  return hasPlace && hasTime ? null : `в evidence нет ни названия «${a.name}», ни места и времени группы`;
}

export function processActivities(
  src: Source,
  items: ExtractedActivity[],
  pageNorm: string,
  venues: VenueRow[],
  planned: PlannedActivity[],
  skipped: Skipped[],
): number {
  let count = 0;
  for (const a of items) {
    const skip = (reason: string) => skipped.push({ source: src.id, match: `секция: ${a.name}`, reason });
    if (isSeniorOnly(a.audience, a.name)) { skip('для пенсионеров: на сайт не берём'); continue; }
    const sport = (a.sport ?? src.sport) as keyof typeof SPORTS;
    if (!(sport in SPORTS)) { skip(`неизвестный вид спорта «${sport}»: добавьте его в SPORTS`); continue; }
    if (a.ageMin != null && a.ageMax != null && a.ageMin > a.ageMax) { skip('возраст «от» больше, чем «до»'); continue; }
    const problem = verify(a, pageNorm);
    if (problem) { skip(`не прошла проверку: ${problem}`); continue; }

    // Площадку узнаём и по адресу в locationNote ("ul. Łazienkowska 3" — стадион Легии)
    const venueQuery = a.venueName ?? a.locationNote ?? src.homeVenue ?? null;
    const venue = venueQuery ? findVenue(venues, venueQuery) : null;
    if (!venue && !a.locationNote) {
      skip(venueQuery ? `площадка «${venueQuery}» не найдена в таблице Venue` : 'место не указано');
      continue;
    }
    const place = venue?.name ?? a.locationNote!;
    planned.push({
      source: src.id,
      // Одна и та же секция в одном месте для одной аудитории — одна запись при повторных прогонах
      externalId: a.key ? `${src.id}:${a.key}` : `${src.id}:${slug(a.name)}:${slug(place)}:${a.audience}`,
      name: a.name,
      sport,
      audience: a.audience,
      ageMin: a.ageMin,
      ageMax: a.ageMax,
      schedule: a.schedule,
      venue: venue?.name ?? null,
      locationNote: venue ? null : a.locationNote,
      district: venue ? null : a.district,
      url: a.url && /^https?:\/\//.test(a.url) ? a.url : src.url,
      priceInfo: a.priceInfo,
      isFree: a.isFree === true,
    });
    count++;
  }
  return count;
}

export async function saveActivities(prisma: PrismaClient, planned: PlannedActivity[], sportIds: Record<string, string>) {
  let created = 0;
  let updated = 0;
  const now = new Date();
  for (const p of planned) {
    const src = SOURCES.find((s) => s.id === p.source)!;
    const venue = p.venue ? await prisma.venue.findFirst({ where: { name: p.venue } }) : null;
    const organizer =
      (await prisma.organizer.findFirst({ where: { name: src.organizer } })) ??
      (await prisma.organizer.create({ data: { name: src.organizer, website: src.organizerWebsite } }));
    const data = {
      name: p.name,
      audience: p.audience,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      schedule: p.schedule,
      isFree: p.isFree,
      priceInfo: p.priceInfo,
      url: p.url,
      sourceUrl: src.url,
      locationNote: p.locationNote,
      district: p.district,
      status: 'published',
      source: `ingest:${p.source}`,
      lastSeenAt: now,
      sportId: sportIds[p.sport],
      venueId: venue?.id ?? null,
      organizerId: organizer.id,
    };
    const existing = await prisma.activity.findUnique({ where: { externalId: p.externalId } });
    if (existing) {
      await prisma.activity.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.activity.create({ data: { ...data, externalId: p.externalId } });
      created++;
    }
  }
  return { created, updated };
}
