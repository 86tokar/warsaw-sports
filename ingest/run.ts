// Шаг 3: проверка выписанных событий и запись в базу.
// npm run ingest:dry показывает результат без записи, npm run ingest записывает.
// Флаг --source=<id> обрабатывает только один источник.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { warsawLocalToDate } from '../src/lib/dates';
import { norm } from './html';
import { EXTRACTED_DIR, Extraction, PAGES_DIR, type ExtractedEvent } from './schema';
import { SOURCES, SPORTS, type Source } from './sources';
import { findVenue, type VenueRow } from './venues';
import { processActivities, saveActivities, type PlannedActivity } from './activities';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = args.find((a) => a.startsWith('--source='))?.split('=')[1];
// Страница старше этого считается устаревшей: время матчей часто переносят
const MAX_PAGE_AGE_DAYS = 3;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

type Planned = {
  source: string;
  externalId: string;
  type: ExtractedEvent['kind'];
  title: string;
  sport: keyof typeof SPORTS;
  startsAt: Date;
  endsAt: Date | null;
  date: string;
  time: string;
  venue: string | null;
  locationNote: string | null;
  competition: string | null;
  url: string;
  priceInfo: string | null;
  isFree: boolean;
  forKids: boolean;
};

type Skipped = { source: string; match: string; reason: string };
type SourceReport = { id: string; status: string; extracted: number; planned: number; activities: number; warnings: string[] };

const slug = (s: string) => norm(s).replace(/ /g, '-');

const titleOf = (e: ExtractedEvent) =>
  e.kind === 'match' && e.homeTeam && e.awayTeam ? `${e.homeTeam} — ${e.awayTeam}` : (e.title ?? '');

// Отсекаем ошибки выписывания: фрагмент evidence должен реально быть на странице,
// а день события и соперник (или название события) должны быть в этом фрагменте.
function verify(e: ExtractedEvent, pageNorm: string): string | null {
  const ev = norm(e.evidence);
  if (ev.length < 8 || !pageNorm.includes(ev)) return 'фрагмент evidence не найден на странице';
  const day = String(Number(e.date.slice(8, 10)));
  if (!new RegExp(`(^|\\D)0?${day}(\\D|$)`).test(ev)) return `день ${day} не найден в evidence`;
  const key = e.kind === 'match' ? (e.isHome ? e.awayTeam : e.homeTeam) : e.title;
  const words = norm(key ?? '').split(' ').filter((w) => w.length >= 4);
  if (words.length && !words.some((w) => ev.includes(w))) {
    return e.kind === 'match' ? `соперник «${key}» не найден в evidence` : `название «${key}» не найдено в evidence`;
  }
  return null;
}

function processSource(
  src: Source,
  venues: VenueRow[],
  planned: Planned[],
  plannedActs: PlannedActivity[],
  skipped: Skipped[],
): SourceReport {
  const report: SourceReport = { id: src.id, status: 'ok', extracted: 0, planned: 0, activities: 0, warnings: [] };
  const pageFile = `${PAGES_DIR}/${src.id}.txt`;
  const extractedFile = `${EXTRACTED_DIR}/${src.id}.json`;
  if (!existsSync(pageFile)) return { ...report, status: 'нет страницы: сначала npm run ingest:fetch' };
  if (!existsSync(extractedFile)) return { ...report, status: `события не выписаны в ${extractedFile}` };

  const page = readFileSync(pageFile, 'utf8');
  const fetchedAt = /^# fetchedAt: (.+)$/m.exec(page)?.[1] ?? '';
  const parsed = Extraction.safeParse(JSON.parse(readFileSync(extractedFile, 'utf8')));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ...report, status: `ошибка формата ${extractedFile}: ${issue?.path.join('.')} ${issue?.message}` };
  }
  const data = parsed.data;
  if (data.pageFetchedAt !== fetchedAt) return { ...report, status: 'события выписаны из другой версии страницы, выпишите заново' };
  const ageDays = (Date.now() - new Date(fetchedAt).getTime()) / 86_400_000;
  if (ageDays > MAX_PAGE_AGE_DAYS) report.warnings.push(`страница скачана ${Math.floor(ageDays)} дн. назад, лучше обновить`);

  report.extracted = data.matches.length;
  report.warnings.push(...data.warnings);
  const pageNorm = norm(page);
  const now = new Date();

  for (const e of data.matches) {
    const title = titleOf(e);
    const skip = (reason: string) => skipped.push({ source: src.id, match: `${e.date} ${e.time ?? '??:??'} ${title}`, reason });

    if (!title) { skip(e.kind === 'match' ? 'у матча не указаны команды' : 'у события нет названия'); continue; }
    if (e.kind === 'match' && !e.isHome) { skip('выездной матч'); continue; }
    const sport = (e.sport ?? src.sport) as keyof typeof SPORTS;
    if (!(sport in SPORTS)) { skip(`неизвестный вид спорта «${sport}»: добавьте его в SPORTS`); continue; }
    const problem = verify(e, pageNorm);
    if (problem) { skip(`не прошёл проверку: ${problem}`); continue; }
    if (e.time === null) { skip('время не объявлено'); continue; }
    if (!TIME.test(e.time)) { skip(`неверное время «${e.time}»`); continue; }
    if (e.endTime !== null && !TIME.test(e.endTime)) { skip(`неверное время окончания «${e.endTime}»`); continue; }

    const startsAt = warsawLocalToDate(`${e.date}T${e.time}`);
    if (!startsAt) { skip('неверная дата'); continue; }
    if (startsAt < now) { skip('событие уже прошло'); continue; }
    const endsAt = e.endTime ? warsawLocalToDate(`${e.date}T${e.endTime}`) : null;

    // Площадка со страницы важнее домашней по умолчанию. Если площадки нет в таблице Venue,
    // событие можно записать с текстовым местом (парк, улица), но только если оно указано явно.
    const venueQuery = e.venueName ?? (e.locationNote ? null : src.homeVenue ?? null);
    const venue = venueQuery ? findVenue(venues, venueQuery) : null;
    if (!venue && !e.locationNote) {
      skip(venueQuery ? `площадка «${venueQuery}» не найдена в таблице Venue` : 'место не указано');
      continue;
    }

    planned.push({
      source: src.id,
      // Ключ матчей не меняем: по нему повторный прогон обновляет уже записанные события
      externalId:
        e.kind === 'match'
          ? `${src.id}:${e.date}:${slug(e.homeTeam!)}:${slug(e.awayTeam!)}`
          : `${src.id}:${e.date}:${slug(title)}`,
      type: e.kind,
      title,
      sport,
      startsAt,
      endsAt: endsAt && endsAt > startsAt ? endsAt : null,
      date: e.date,
      time: e.time,
      venue: venue?.name ?? null,
      locationNote: venue ? null : e.locationNote,
      competition: e.competition,
      url: e.matchUrl && /^https?:\/\//.test(e.matchUrl) ? e.matchUrl : src.url,
      priceInfo: e.priceInfo,
      isFree: e.isFree === true,
      forKids: e.forKids || src.forKids === true,
    });
    report.planned++;
  }
  report.activities = processActivities(src, data.activities, pageNorm, venues, plannedActs, skipped);
  return report;
}

async function ensureSports() {
  const sportIds: Record<string, string> = {};
  for (const [slug, name] of Object.entries(SPORTS)) {
    sportIds[slug] = (await prisma.sport.upsert({ where: { slug }, update: {}, create: { slug, name } })).id;
  }
  return sportIds;
}

async function save(planned: Planned[], sportIds: Record<string, string>) {
  let created = 0;
  let updated = 0;
  for (const p of planned) {
    const src = SOURCES.find((s) => s.id === p.source)!;
    const venue = p.venue ? await prisma.venue.findFirst({ where: { name: p.venue } }) : null;
    const organizer =
      (await prisma.organizer.findFirst({ where: { name: src.organizer } })) ??
      (await prisma.organizer.create({ data: { name: src.organizer, website: src.organizerWebsite } }));
    const data = {
      title: p.title,
      description: p.competition,
      type: p.type,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      isFree: p.isFree,
      forKids: p.forKids,
      priceInfo: p.priceInfo,
      url: p.url,
      sourceUrl: src.url,
      locationNote: p.locationNote,
      status: 'published',
      source: `ingest:${p.source}`,
      sportId: sportIds[p.sport],
      venueId: venue?.id ?? null,
      organizerId: organizer.id,
    };
    const existing = await prisma.event.findUnique({ where: { externalId: p.externalId } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data: { ...data, externalId: p.externalId } });
      created++;
    }
  }
  return { created, updated };
}

async function main() {
  const sources = SOURCES.filter((s) => !ONLY || s.id === ONLY);
  if (!sources.length) throw new Error(ONLY ? `Источник ${ONLY} не найден в ingest/sources.ts` : 'В ingest/sources.ts нет источников');

  // Только реальные площадки (с aliases), чтобы не сопоставить событие с демо-площадкой
  const venues: VenueRow[] = await prisma.venue.findMany({
    where: { aliases: { not: null } },
    select: { id: true, name: true, aliases: true, address: true },
  });
  const planned: Planned[] = [];
  const plannedActs: PlannedActivity[] = [];
  const skipped: Skipped[] = [];
  const reports = sources.map((src) => processSource(src, venues, planned, plannedActs, skipped));

  // Одно и то же событие из двух источников (клуб и лига): оставляем первое
  const seen = new Set<string>();
  const unique = planned.filter((p) => {
    const key = `${p.startsAt.toISOString()}|${p.venue ?? p.locationNote}|${p.type === 'match' ? '' : slug(p.title)}`;
    if (seen.has(key)) {
      skipped.push({ source: p.source, match: `${p.date} ${p.time} ${p.title}`, reason: 'дубликат из другого источника' });
      return false;
    }
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  console.log(`${DRY ? 'ПРОБНЫЙ' : 'БОЕВОЙ'} прогон\n`);
  console.table(
    reports.map((r) => ({ источник: r.id, статус: r.status, выписано: r.extracted, 'к записи': r.planned, секций: r.activities })),
  );
  console.log('\nК записи:');
  console.table(
    unique.map((p) => ({
      дата: p.date,
      время: p.time,
      событие: p.title,
      место: p.venue ?? p.locationNote,
      бесплатно: p.isFree ? 'да' : '',
      детям: p.forKids ? 'да' : '',
      ссылка: p.url,
    })),
  );
  if (plannedActs.length) {
    console.log('\nСекции к записи:');
    console.table(
      plannedActs.map((a) => ({
        секция: a.name,
        спорт: a.sport,
        'для кого': a.audience,
        возраст: a.ageMin != null || a.ageMax != null ? `${a.ageMin ?? ''}–${a.ageMax ?? ''}` : '',
        расписание: a.schedule ?? '',
        место: a.venue ?? a.locationNote,
        бесплатно: a.isFree ? 'да' : '',
      })),
    );
  }
  if (skipped.length) {
    console.log('\nПропущено:');
    console.table(skipped);
  }
  for (const r of reports) for (const w of r.warnings) console.log(`⚠ ${r.id}: ${w}`);

  mkdirSync('ingest/out', { recursive: true });
  const file = `ingest/out/${DRY ? 'dry' : 'run'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify({ reports, planned: unique, activities: plannedActs, skipped }, null, 2));
  console.log(`\nОтчёт: ${file}`);

  if (DRY) {
    console.log(`Пробный прогон: ${unique.length} событий и ${plannedActs.length} секций к записи, в базу ничего не записано.`);
  } else {
    const sportIds = await ensureSports();
    const { created, updated } = await save(unique, sportIds);
    console.log(`События: новых ${created}, обновлено ${updated}.`);
    const acts = await saveActivities(prisma, plannedActs, sportIds);
    console.log(`Секции: новых ${acts.created}, обновлено ${acts.updated}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
