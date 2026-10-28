import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getDict, href, isLocale, plural, pageLang } from '@/i18n';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  return isLocale(params.lang) ? { title: getDict(params.lang).venues.title } : {};
}

export default async function VenuesPage({ params }: { params: { lang: string } }) {
  const lang = pageLang(params.lang);
  const t = getDict(lang);
  const venues = await prisma.venue.findMany({
    orderBy: [{ district: 'asc' }, { name: 'asc' }],
    include: {
      events: { where: { status: 'published', startsAt: { gte: new Date() } }, select: { id: true } },
    },
  });

  return (
    <main className="wrap page">
      <h1 className="page-title">{t.venues.title}</h1>
      <p className="prose">{t.venues.intro}</p>
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
              <Link href={`${href(lang)}?venue=${v.id}`} className="venue-sub">
                {v.events.length} {plural(v.events.length, t.venues.ahead, lang)}
              </Link>
            ) : (
              <div className="venue-sub">{t.venues.none}</div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
