import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { formatFullDate, formatTime } from '@/lib/dates';
import { isEventType } from '@/lib/labels';
import { INTL_LOCALE, getDict, href, isLocale, sportName, pageLang } from '@/i18n';
import SportIcon from '@/components/SportIcon';

export const dynamic = 'force-dynamic';

async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { sport: true, venue: true, organizer: true },
  });
  return event && event.status === 'published' ? event : null;
}

export async function generateMetadata({ params }: { params: { lang: string; id: string } }): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const event = await getEvent(params.id);
  return { title: event ? event.title : getDict(params.lang).event.notFound };
}

export default async function EventPage({ params }: { params: { lang: string; id: string } }) {
  const lang = pageLang(params.lang);
  const t = getDict(lang);
  const locale = INTL_LOCALE[lang];
  const event = await getEvent(params.id);
  if (!event) notFound();

  const { venue, organizer } = event;
  const price = event.isFree ? t.event.free : event.priceInfo || t.event.askOrganizer;

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
      <Link href={href(lang)} className="back">
        {t.event.back}
      </Link>
      <h1 className="page-title with-icon">
        <SportIcon slug={event.sport.slug} size={56} />
        {event.title}
      </h1>

      <dl className="facts">
        <dt>{t.event.when}</dt>
        <dd>
          {formatFullDate(event.startsAt, locale)}, {formatTime(event.startsAt, locale)}
          {event.endsAt ? ` ${t.event.until} ${formatTime(event.endsAt, locale)}` : ''}
        </dd>
        <dt>{t.event.type}</dt>
        <dd>{isEventType(event.type) ? t.types[event.type] : event.type}</dd>
        <dt>{t.event.sport}</dt>
        <dd>{sportName(t, event.sport.slug, event.sport.name)}</dd>
        <dt>{t.event.where}</dt>
        <dd>
          {venue ? (
            <>
              {venue.name}
              <br />
              {venue.address}, {venue.district}
            </>
          ) : (
            (event.locationNote ?? t.placeTbd)
          )}
        </dd>
        {event.forKids && (
          <>
            <dt>{t.event.forWho}</dt>
            <dd>{t.event.forKids}</dd>
          </>
        )}
        <dt>{t.event.price}</dt>
        <dd>{price}</dd>
        {organizer && (
          <>
            <dt>{t.event.organizer}</dt>
            <dd>{organizer.name}</dd>
          </>
        )}
      </dl>

      {event.description && <p className="prose">{event.description}</p>}

      {event.url && (
        <p>
          <a className="btn" href={event.url} target="_blank" rel="noopener noreferrer">
            {t.event.goToSite}
          </a>
        </p>
      )}

      {event.sourceUrl && (
        <p className="venue-sub">
          {t.event.source}:{' '}
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
            {new URL(event.sourceUrl).host}
          </a>
          . {event.type === 'match' ? t.event.timeMayChangeMatch : t.event.timeMayChangeEvent}
        </p>
      )}

      {mapSrc && mapLink && (
        <section className="map" aria-label={t.event.map}>
          <iframe src={mapSrc} title={`${t.event.map}: ${venue?.name}`} loading="lazy" />
          <p>
            <a href={mapLink} target="_blank" rel="noopener noreferrer">
              {t.event.openMap}
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
