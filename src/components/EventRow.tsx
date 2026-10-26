import Link from 'next/link';
import { formatTime } from '@/lib/dates';
import { typeLabel } from '@/lib/labels';

type Props = {
  event: {
    id: string;
    title: string;
    type: string;
    startsAt: Date;
    isFree: boolean;
    forKids: boolean;
    locationNote: string | null;
    sport: { name: string };
    venue: { name: string; district: string } | null;
  };
};

export default function EventRow({ event }: Props) {
  return (
    <li>
      <Link href={`/events/${event.id}`} className="row">
        <span className="row-time">{formatTime(event.startsAt)}</span>
        <span>
          <span className="row-title">{event.title}</span>
          <span className="row-meta">
            <span>{event.sport.name}</span>
            <span>{event.venue ? event.venue.name : event.locationNote ?? 'Место уточняется'}</span>
            {event.venue && <span>{event.venue.district}</span>}
          </span>
        </span>
        <span className="tags">
          <span className={`tag tag-${event.type}`}>{typeLabel(event.type)}</span>
          {event.isFree && <span className="tag tag-free">Бесплатно</span>}
          {event.forKids && <span className="tag tag-kids">Детям</span>}
        </span>
      </Link>
    </li>
  );
}
