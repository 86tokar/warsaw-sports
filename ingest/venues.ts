// Сопоставление названия площадки из расписания с таблицей Venue по name и aliases.
import { norm } from './html';

export type VenueRow = { id: string; name: string; aliases: string | null; address: string };

function names(v: VenueRow): string[] {
  return [v.name, v.address, ...(v.aliases ?? '').split('|')].map(norm).filter((s) => s.length >= 4);
}

export function findVenue(venues: VenueRow[], raw: string): VenueRow | null {
  const q = norm(raw);
  if (!q) return null;
  const exact = venues.find((v) => names(v).includes(q));
  if (exact) return exact;
  // "Hala Arena Ursynów, ul. Pileckiego 122" содержит алиас "arena ursynow"
  const partial = venues.filter((v) => names(v).some((n) => n.length >= 6 && (q.includes(n) || n.includes(q))));
  return partial.length === 1 ? partial[0] : null;
}
