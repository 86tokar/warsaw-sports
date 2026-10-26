import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { dayKey, dayLabel, isToday, resolveRange } from '@/lib/dates';
import { isEventType, plural } from '@/lib/labels';
import type { Filters as F } from '@/lib/filters';
import Filters from '@/components/Filters';
import EventRow from '@/components/EventRow';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: F }) {
  const f = searchParams;
  const { from, to } = resolveRange(f.when);

  const where: Prisma.EventWhereInput = {
    status: 'published',
    startsAt: { gte: from, ...(to ? { lt: to } : {}) },
    ...(f.type && isEventType(f.type) ? { type: f.type } : {}),
    ...(f.sport ? { sport: { slug: f.sport } } : {}),
    ...(f.district ? { venue: { district: f.district } } : {}),
    ...(f.venue ? { venueId: f.venue } : {}),
    ...(f.free === '1' ? { isFree: true } : {}),
    ...(f.kids === '1' ? { forKids: true } : {}),
  };

  const [events, sports, venues, venue] = await Promise.all([
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
          ...(f.sport ? [{ slug: f.sport }] : []),
        ],
      },
      orderBy: { name: 'asc' },
    }),
    prisma.venue.findMany({ select: { district: true } }),
    f.venue ? prisma.venue.findUnique({ where: { id: f.venue }, select: { name: true } }) : null,
  ]);

  const districts = Array.from(new Set(venues.map((v) => v.district))).sort();

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
        <h1>Спорт в Варшаве по дням</h1>
        <p>
          Матчи, турниры, забеги и открытые тренировки в одном списке. Выберите дату, вид спорта или район.
        </p>
      </section>

      <Filters current={f} sports={sports} districts={districts} venueName={venue?.name} />

      <p className="count" aria-live="polite">
        {events.length} {plural(events.length, ['событие', 'события', 'событий'])}
      </p>

      {days.length === 0 ? (
        <section className="empty">
          <h2>Ничего не нашлось</h2>
          <p>
            По этим фильтрам нет событий. <Link href="/">Сбросьте фильтры</Link> или{' '}
            <Link href="/submit">добавьте своё событие</Link>.
          </p>
        </section>
      ) : (
        <div className="board">
          {days.map((day) => {
            const l = dayLabel(day.date);
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
                    <EventRow key={e.id} event={e} />
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
