import Link from 'next/link';
import { prisma } from '@/lib/db';
import { plural } from '@/lib/labels';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Площадки: Спортивная Варшава' };

export default async function VenuesPage() {
  const venues = await prisma.venue.findMany({
    orderBy: [{ district: 'asc' }, { name: 'asc' }],
    include: {
      events: { where: { status: 'published', startsAt: { gte: new Date() } }, select: { id: true } },
    },
  });

  return (
    <main className="wrap page">
      <h1 className="page-title">Площадки</h1>
      <p className="prose">Стадионы, арены, парки и залы, где проходят события.</p>
      <ul className="venue-list">
        {venues.map((v) => (
          <li key={v.id}>
            <div>
              <div className="venue-name">{v.name}</div>
              <div className="venue-sub">
                {v.address}, {v.district}
              </div>
            </div>
            {v.events.length > 0 ? (
              <Link href={`/?venue=${v.id}`} className="venue-sub">
                {v.events.length} {plural(v.events.length, ['событие', 'события', 'событий'])} впереди
              </Link>
            ) : (
              <div className="venue-sub">Событий впереди нет</div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
