import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ageLabel, audienceLabel, plural } from '@/lib/labels';
import { filterHref } from '@/lib/filters';
import { Chip, Row } from '@/components/Filters';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Секции: Спортивная Варшава' };

type SectionFilters = {
  who?: string; // kids | adults
  sport?: string;
  district?: string;
  free?: string;
  page?: string;
};

const BASE = '/sections';
const PAGE_SIZE = 50;

export default async function SectionsPage({ searchParams }: { searchParams: SectionFilters }) {
  const f = searchParams;
  const page = Math.max(1, Number(f.page) || 1);
  // «Взрослым» включает и сеньоров; секции «для всех возрастов» видны в обоих фильтрах
  const audience =
    f.who === 'kids' ? { in: ['kids', 'all'] } : f.who === 'adults' ? { in: ['adults', 'seniors', 'all'] } : undefined;

  const where: Prisma.ActivityWhereInput = {
    status: 'published',
    ...(audience ? { audience } : {}),
    ...(f.sport ? { sport: { slug: f.sport } } : {}),
    ...(f.district ? { OR: [{ venue: { district: f.district } }, { district: f.district }] } : {}),
    ...(f.free === '1' ? { isFree: true } : {}),
  };

  const [total, activities, sports, venues, textDistricts] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy: [{ sport: { name: 'asc' } }, { name: 'asc' }],
      include: { sport: true, venue: true, organizer: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sport.findMany({
      where: { activities: { some: { status: 'published' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.venue.findMany({
      where: { activities: { some: { status: 'published' } } },
      select: { district: true },
    }),
    prisma.activity.findMany({
      where: { status: 'published', district: { not: null } },
      select: { district: true },
      distinct: ['district'],
    }),
  ]);
  const districts = Array.from(
    new Set([...venues.map((v) => v.district), ...textDistricts.map((a) => a.district!)]),
  ).sort((a, b) => a.localeCompare(b, 'pl'));
  const pages = Math.ceil(total / PAGE_SIZE);
  // Смена фильтра возвращает на первую страницу
  const href = (patch: Partial<SectionFilters>) => filterHref({ ...f, page: undefined }, patch, BASE);

  return (
    <main className="wrap page">
      <h1 className="page-title">Спортивные секции</h1>
      <p className="prose">
        Регулярные занятия для детей и взрослых: секции клубов, школы и бесплатные городские программы. Расписание и
        запись уточняйте на сайте организатора.
      </p>

      <section className="filters" aria-label="Фильтры">
        <Row label="Для кого">
          <Chip href={href({ who: undefined })} active={!f.who}>
            Все
          </Chip>
          <Chip href={href({ who: 'kids' })} active={f.who === 'kids'}>
            Детям
          </Chip>
          <Chip href={href({ who: 'adults' })} active={f.who === 'adults'}>
            Взрослым
          </Chip>
        </Row>
        <Row label="Вид спорта">
          <Chip href={href({ sport: undefined })} active={!f.sport}>
            Любой
          </Chip>
          {sports.map((s) => (
            <Chip key={s.slug} href={href({ sport: s.slug })} active={f.sport === s.slug}>
              {s.name}
            </Chip>
          ))}
        </Row>
        <Row label="Район">
          <Chip href={href({ district: undefined })} active={!f.district}>
            Любой
          </Chip>
          {districts.map((d) => (
            <Chip key={d} href={href({ district: d })} active={f.district === d}>
              {d}
            </Chip>
          ))}
        </Row>
        <Row label="Цена">
          <Chip href={href({ free: undefined })} active={f.free !== '1'}>
            Любая
          </Chip>
          <Chip href={href({ free: '1' })} active={f.free === '1'}>
            Бесплатно
          </Chip>
        </Row>
      </section>

      <p className="count" aria-live="polite">
        {total} {plural(total, ['секция', 'секции', 'секций'])}
        {pages > 1 && `, показаны ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + activities.length}`}
      </p>

      {activities.length === 0 ? (
        <section className="empty">
          <h2>Ничего не нашлось</h2>
          <p>
            По этим фильтрам секций нет. <Link href={BASE}>Сбросьте фильтры</Link>.
          </p>
        </section>
      ) : (
        <ul className="rows sections">
          {activities.map((a) => {
            const age = ageLabel(a.ageMin, a.ageMax);
            const place = a.venue
              ? `${a.venue.name}, ${a.venue.district}`
              : [a.locationNote, a.district].filter(Boolean).join(', ');
            return (
              <li key={a.id}>
                <a href={a.url ?? a.sourceUrl ?? '#'} className="row" target="_blank" rel="noopener noreferrer">
                  <span className="row-time">{a.sport.name}</span>
                  <span>
                    <span className="row-title">{a.name}</span>
                    <span className="row-meta">
                      {age && <span>{age}</span>}
                      {a.schedule && <span>{a.schedule}</span>}
                      {place && <span>{place}</span>}
                      {a.organizer && <span>{a.organizer.name}</span>}
                    </span>
                    {a.priceInfo && <span className="row-meta">{a.priceInfo}</span>}
                  </span>
                  <span className="tags">
                    <span className={`tag tag-audience-${a.audience}`}>{audienceLabel(a.audience)}</span>
                    {a.isFree && <span className="tag tag-free">Бесплатно</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Страницы">
          {page > 1 && <Link href={filterHref(f, { page: String(page - 1) }, BASE)}>← Назад</Link>}
          <span>
            Страница {page} из {pages}
          </span>
          {page < pages && <Link href={filterHref(f, { page: String(page + 1) }, BASE)}>Дальше →</Link>}
        </nav>
      )}
    </main>
  );
}
