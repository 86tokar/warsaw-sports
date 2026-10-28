import Link from 'next/link';
import { formatTime } from '@/lib/dates';
import { isEventType } from '@/lib/labels';
import { INTL_LOCALE, href, sportName, type Dict, type Locale } from '@/i18n';
import SportIcon from '@/components/SportIcon';

type Props = {
  lang: Locale;
  t: Dict;
  event: {
    id: string;
    title: string;
    type: string;
    startsAt: Date;
    isFree: boolean;
    forKids: boolean;
    locationNote: string | null;
    sport: { slug: string; name: string };
    venue: { name: string; district: string } | null;
  };
};

export default function EventRow({ lang, t, event }: Props) {
  return (
    <li>
      <Link href={href(lang, `/events/${event.id}`)} className="row">
        <span className="row-time">{formatTime(event.startsAt, INTL_LOCALE[lang])}</span>
        <span>
          <span className="row-title">{event.title}</span>
          <span className="row-meta">
            <span className="with-icon">
              <SportIcon slug={event.sport.slug} size={18} />
              {sportName(t, event.sport.slug, event.sport.name)}
            </span>
            <span>{event.venue ? event.venue.name : (event.locationNote ?? t.placeTbd)}</span>
            {event.venue && <span>{event.venue.district}</span>}
          </span>
        </span>
        <span className="tags">
          <span className={`tag tag-${event.type}`}>{isEventType(event.type) ? t.types[event.type] : event.type}</span>
          {event.isFree && <span className="tag tag-free">{t.tags.free}</span>}
          {event.forKids && <span className="tag tag-kids">{t.tags.kids}</span>}
        </span>
      </Link>
    </li>
  );
}
