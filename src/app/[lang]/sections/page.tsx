import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { filterHref } from '@/lib/filters';
import { isAudience } from '@/lib/labels';
import { INTL_LOCALE, ageLabel, fill, getDict, href, isLocale, placeText, plural, sportName, pageLang } from '@/i18n';
import { Chip, Row } from '@/components/Filters';
import SportIcon from '@/components/SportIcon';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  return isLocale(params.lang) ? { title: getDict(params.lang).sections.title } : {};
}

type SectionFilters = {
  who?: string; // kids | adults
  sport?: string;
  district?: string;
  free?: string;
  page?: string;
};

const PAGE_SIZE = 50;

export default async function SectionsPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: SectionFilters;
}) {
  const lang = pageLang(params.lang);
  const t = getDict(lang);
  const locale = INTL_LOCALE[lang];
  const base = href(lang, '/sections');
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

  const [total, activities, sportRows, venues, textDistricts] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      // Порядок не зависит от языка: по виду спорта (slug) и названию
      orderBy: [{ sport: { slug: 'asc' } }, { name: 'asc' }],
      include: { sport: true, venue: true, organizer: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sport.findMany({ where: { activities: { some: { status: 'published' } } } }),
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
  const sports = sportRows
    .map((s) => ({ slug: s.slug, name: sportName(t, s.slug, s.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const districts = Array.from(
    new Set([...venues.map((v) => v.district), ...textDistricts.map((a) => a.district!)]),
  ).sort((a, b) => a.localeCompare(b, 'pl'));
  const pages = Math.ceil(total / PAGE_SIZE);
  // Смена фильтра возвращает на первую страницу
  const link = (patch: Partial<SectionFilters>) => filterHref({ ...f, page: undefined }, patch, base);
  const from = (page - 1) * PAGE_SIZE + 1;

  return (
    <main className="wrap page">
      <h1 className="page-title">{t.sections.title}</h1>
      <p className="prose">{t.sections.intro}</p>

      <section className="filters" aria-label={t.filters.aria}>
        <Row label={t.filters.forWho}>
          <Chip href={link({ who: undefined })} active={!f.who}>
            {t.filters.everyone}
          </Chip>
          <Chip href={link({ who: 'kids' })} active={f.who === 'kids'}>
            {t.filters.kids}
          </Chip>
          <Chip href={link({ who: 'adults' })} active={f.who === 'adults'}>
            {t.filters.adults}
          </Chip>
        </Row>
        <Row label={t.filters.sport}>
          <Chip href={link({ sport: undefined })} active={!f.sport}>
            {t.filters.any}
          </Chip>
          {sports.map((s) => (
            <Chip key={s.slug} href={link({ sport: s.slug })} active={f.sport === s.slug}>
              <SportIcon slug={s.slug} size={16} />
              {s.name}
            </Chip>
          ))}
        </Row>
        <Row label={t.filters.district}>
          <Chip href={link({ district: undefined })} active={!f.district}>
            {t.filters.any}
          </Chip>
          {districts.map((d) => (
            <Chip key={d} href={link({ district: d })} active={f.district === d}>
              {d}
            </Chip>
          ))}
        </Row>
        <Row label={t.filters.price}>
          <Chip href={link({ free: undefined })} active={f.free !== '1'}>
            {t.filters.anyPrice}
          </Chip>
          <Chip href={link({ free: '1' })} active={f.free === '1'}>
            {t.filters.free}
          </Chip>
        </Row>
      </section>

      <p className="count" aria-live="polite">
        {total} {plural(total, t.sections.count, lang)}
        {pages > 1 && `, ${t.sections.shown} ${from}–${from + activities.length - 1}`}
      </p>

      {activities.length === 0 ? (
        <section className="empty">
          <h2>{t.sections.emptyTitle}</h2>
          <p>
            {t.sections.emptyText} <Link href={base}>{t.sections.reset}</Link>.
          </p>
        </section>
      ) : (
        <ul className="rows sections">
          {activities.map((a) => {
            const age = ageLabel(t, a.ageMin, a.ageMax);
            const place = a.venue
              ? `${a.venue.name}, ${a.venue.district}`
              : [placeText(t, a.locationNote), a.district].filter(Boolean).join(', ');
            return (
              <li key={a.id}>
                <a href={a.url ?? a.sourceUrl ?? '#'} className="row" target="_blank" rel="noopener noreferrer">
                  <span className="row-time row-sport">
                    <SportIcon slug={a.sport.slug} size={36} />
                    {sportName(t, a.sport.slug, a.sport.name)}
                  </span>
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
                    <span className={`tag tag-audience-${a.audience}`}>
                      {isAudience(a.audience) ? t.sections.audience[a.audience] : a.audience}
                    </span>
                    {a.isFree && <span className="tag tag-free">{t.tags.free}</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label={t.sections.pagesAria}>
          {page > 1 && <Link href={filterHref(f, { page: String(page - 1) }, base)}>{t.sections.prev}</Link>}
          <span>{fill(t.sections.page, { page, pages })}</span>
          {page < pages && <Link href={filterHref(f, { page: String(page + 1) }, base)}>{t.sections.next}</Link>}
        </nav>
      )}
    </main>
  );
}
