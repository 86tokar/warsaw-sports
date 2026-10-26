import Link from 'next/link';
import { EVENT_TYPES } from '@/lib/labels';
import { WHEN_OPTIONS } from '@/lib/dates';
import { filterHref, type Filters as F } from '@/lib/filters';

type Props = {
  current: F;
  sports: { slug: string; name: string }[];
  districts: string[];
  // Название площадки, если пришли со страницы «Площадки» (?venue=<id>)
  venueName?: string;
};

export function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="chip" aria-current={active ? 'true' : undefined} scroll={false}>
      {children}
    </Link>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-row">
      <div className="filter-label">{label}</div>
      <div className="chips">{children}</div>
    </div>
  );
}

export default function Filters({ current, sports, districts, venueName }: Props) {
  const when = current.when ?? 'all';
  return (
    <section className="filters" aria-label="Фильтры">
      <Row label="Когда">
        {WHEN_OPTIONS.map((o) => (
          <Chip key={o.slug} href={filterHref(current, { when: o.slug })} active={when === o.slug}>
            {o.label}
          </Chip>
        ))}
      </Row>
      <Row label="Тип">
        <Chip href={filterHref(current, { type: undefined })} active={!current.type}>
          Любой
        </Chip>
        {EVENT_TYPES.map((t) => (
          <Chip key={t.slug} href={filterHref(current, { type: t.slug })} active={current.type === t.slug}>
            {t.label}
          </Chip>
        ))}
      </Row>
      <Row label="Вид спорта">
        <Chip href={filterHref(current, { sport: undefined })} active={!current.sport}>
          Любой
        </Chip>
        {sports.map((s) => (
          <Chip key={s.slug} href={filterHref(current, { sport: s.slug })} active={current.sport === s.slug}>
            {s.name}
          </Chip>
        ))}
      </Row>
      <Row label="Район">
        <Chip href={filterHref(current, { district: undefined })} active={!current.district}>
          Любой
        </Chip>
        {districts.map((d) => (
          <Chip key={d} href={filterHref(current, { district: d })} active={current.district === d}>
            {d}
          </Chip>
        ))}
      </Row>
      {current.venue && (
        <Row label="Площадка">
          <Chip href={filterHref(current, { venue: undefined })} active={false}>
            Любая
          </Chip>
          <Chip href={filterHref(current, {})} active>
            {venueName ?? 'Неизвестная площадка'}
          </Chip>
        </Row>
      )}
      <Row label="Для кого">
        <Chip href={filterHref(current, { kids: undefined })} active={current.kids !== '1'}>
          Все
        </Chip>
        <Chip href={filterHref(current, { kids: '1' })} active={current.kids === '1'}>
          Детям
        </Chip>
      </Row>
      <Row label="Цена">
        <Chip href={filterHref(current, { free: undefined })} active={current.free !== '1'}>
          Любая
        </Chip>
        <Chip href={filterHref(current, { free: '1' })} active={current.free === '1'}>
          Бесплатно
        </Chip>
      </Row>
    </section>
  );
}
