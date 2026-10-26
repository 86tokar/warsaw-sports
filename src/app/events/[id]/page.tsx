import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { formatFullDate, formatTime } from '@/lib/dates';
import { typeLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { sport: true, venue: true, organizer: true },
  });
  return event && event.status === 'published' ? event : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);
  return { title: event ? `${event.title}: Спортивная Варшава` : 'Событие не найдено' };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const { venue, organizer } = event;
  const price = event.isFree ? 'Бесплатно' : event.priceInfo || 'Уточняйте у организатора';

  let mapSrc: string | null = null;
  let mapLink: string | null = null;
  if (venue?.lat != null && venue?.lng != null) {
    const dLat = 0.004;
    const dLng = 0.0065;
    const bbox = [venue.lng - dLng, venue.lat - dLat, venue.lng + dLng, venue.lat + dLat].join('%2C');
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${venue.lat}%2C${venue.lng}`;
    mapLink = `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}`;
  }

  return (
    <main className="wrap page">
      <Link href="/" className="back">
        Все события
      </Link>
      <h1 className="page-title">{event.title}</h1>

      <dl className="facts">
        <dt>Когда</dt>
        <dd>
          {formatFullDate(event.startsAt)}, {formatTime(event.startsAt)}
          {event.endsAt ? ` до ${formatTime(event.endsAt)}` : ''}
        </dd>
        <dt>Тип</dt>
        <dd>{typeLabel(event.type)}</dd>
        <dt>Вид спорта</dt>
        <dd>{event.sport.name}</dd>
        <dt>Где</dt>
        <dd>
          {venue ? (
            <>
              {venue.name}
              <br />
              {venue.address}, {venue.district}
            </>
          ) : (
            event.locationNote ?? 'Место уточняется'
          )}
        </dd>
        {event.forKids && (
          <>
            <dt>Для кого</dt>
            <dd>Для детей</dd>
          </>
        )}
        <dt>Цена</dt>
        <dd>{price}</dd>
        {organizer && (
          <>
            <dt>Организатор</dt>
            <dd>{organizer.name}</dd>
          </>
        )}
      </dl>

      {event.description && <p className="prose">{event.description}</p>}

      {event.url && (
        <p>
          <a className="btn" href={event.url} target="_blank" rel="noopener noreferrer">
            Перейти на сайт события
          </a>
        </p>
      )}

      {event.sourceUrl && (
        <p className="venue-sub">
          Источник:{' '}
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
            {new URL(event.sourceUrl).host}
          </a>
          . Время {event.type === 'match' ? 'матча' : 'события'} может измениться, проверяйте на официальном сайте.
        </p>
      )}

      {mapSrc && mapLink && (
        <section className="map" aria-label="Карта">
          <iframe src={mapSrc} title={`Карта: ${venue?.name}`} loading="lazy" />
          <p>
            <a href={mapLink} target="_blank" rel="noopener noreferrer">
              Открыть большую карту
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
