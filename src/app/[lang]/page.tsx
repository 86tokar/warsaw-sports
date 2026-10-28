import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { dayKey, dayLabel, isToday, resolveRange } from '@/lib/dates';
import { isEventType } from '@/lib/labels';
import { listParam, type Filters as F } from '@/lib/filters';
import { INTL_LOCALE, getDict, href, plural, sportName, pageLang } from '@/i18n';
import Filters from '@/components/Filters';
import EventRow from '@/components/EventRow';

export const dynamic = 'force-dynamic';

export default async function Home({ params, searchParams }: { params: { lang: string }; searchParams: F }) {
  const lang = pageLang(params.lang);
  const t = getDict(lang);
  const f = searchParams;
  const { from, to } = resolveRange(f.when);

  // Внутри строки фильтра — «или» (несколько видов спорта), между строками — «и»
  const types = listParam(f.type).filter(isEventType);
  const sportsOn = listParam(f.sport);
  const districtsOn = listParam(f.district);
  const where: Prisma.EventWhereInput = {
    status: 'published',
    startsAt: { gte: from, ...(to ? { lt: to } : {}) },
    ...(types.length ? { type: { in: types } } : {}),
    ...(sportsOn.length ? { sport: { slug: { in: sportsOn } } } : {}),
    ...(districtsOn.length ? { venue: { district: { in: districtsOn } } } : {}),
    ...(f.venue ? { venueId: f.venue } : {}),
    ...(f.free === '1' ? { isFree: true } : {}),
    ...(f.kids === '1' ? { forKids: true } : {}),
  };

  const [events, sportRows, venues, venue] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { sport: true, venue: true },
      take: 200,
    }),
    // В фильтре только виды спорта с предстоящими событиями (и выбранный сейчас, чтобы его можно было снять)
    prisma.sport.findMany({
      where: {
        OR: [
          { events: { some: { status: 'published', startsAt: { gte: new Date() } } } },
          ...(sportsOn.length ? [{ slug: { in: sportsOn } }] : []),
        ],
      },
    }),
    prisma.venue.findMany({ select: { district: true } }),
    f.venue ? prisma.venue.findUnique({ where: { id: f.venue }, select: { name: true } }) : null,
  ]);

  const locale = INTL_LOCALE[lang];
  const sports = sportRows
    .map((s) => ({ slug: s.slug, name: sportName(t, s.slug, s.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const districts = Array.from(new Set(venues.map((v) => v.district))).sort((a, b) => a.localeCompare(b, 'pl'));

  const days: { key: string; date: Date; items: typeof events }[] = [];
  for (const e of events) {
    const key = dayKey(e.startsAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(e);
    else days.push({ key, date: e.startsAt, items: [e] });
  }

  return (
    <main className="wrap">
      <section className="intro">
        <h1>{t.home.title}</h1>
        <p>{t.home.intro}</p>
      </section>

      <Filters current={f} t={t} base={href(lang)} sports={sports} districts={districts} venueName={venue?.name} />

      <p className="count" aria-live="polite">
        {events.length} {plural(events.length, t.home.count, lang)}
      </p>

      {days.length === 0 ? (
        <section className="empty">
          <h2>{t.home.emptyTitle}</h2>
          <p>
            {t.home.emptyText} <Link href={href(lang)}>{t.home.reset}</Link> {t.home.or}{' '}
            <Link href={href(lang, '/submit')}>{t.home.addOwn}</Link>.
          </p>
        </section>
      ) : (
        <div className="board">
          {days.map((day) => {
            const l = dayLabel(day.date, locale);
            return (
              <section key={day.key} className={`day${isToday(day.date) ? ' today' : ''}`}>
                <div className="day-head">
                  <div className="day-num">{l.num}</div>
                  <div className="day-name">
                    {l.month}, {l.weekday}
                  </div>
                </div>
                <ul className="rows">
                  {day.items.map((e) => (
                    <EventRow key={e.id} lang={lang} t={t} event={e} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
