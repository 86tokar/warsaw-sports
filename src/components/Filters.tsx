import Link from 'next/link';
import { EVENT_TYPES } from '@/lib/labels';
import { WHEN_OPTIONS } from '@/lib/dates';
import { filterHref, listParam, toggleParam, type Filters as F } from '@/lib/filters';
import type { Dict } from '@/i18n';

type Props = {
  current: F;
  t: Dict;
  // Базовый адрес страницы с языком, например "/pl"
  base: string;
  sports: { slug: string; name: string }[];
  districts: string[];
  // Название площадки, если пришли со страницы «Площадки» (?venue=<id>)
  venueName?: string;
};

// multi: чип можно выбрать вместе с другими (галочка вместо единственного выбора)
export function Chip({
  href,
  active,
  multi,
  children,
}: {
  href: string;
  active: boolean;
  multi?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={multi ? 'chip chip-multi' : 'chip'}
      aria-current={active ? 'true' : undefined}
      scroll={false}
    >
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

export default function Filters({ current, t, base, sports, districts, venueName }: Props) {
  const when = current.when ?? 'all';
  const link = (patch: Partial<F>) => filterHref(current, patch, base);
  const types = listParam(current.type);
  const sportsOn = listParam(current.sport);
  const districtsOn = listParam(current.district);
  return (
    <section className="filters" aria-label={t.filters.aria}>
      <Row label={t.filters.when}>
        {WHEN_OPTIONS.map((o) => (
          <Chip key={o} href={link({ when: o })} active={when === o}>
            {t.filters.whenOptions[o]}
          </Chip>
        ))}
      </Row>
      <Row label={t.filters.type}>
        <Chip href={link({ type: undefined })} active={!types.length}>
          {t.filters.any}
        </Chip>
        {EVENT_TYPES.map((type) => (
          <Chip key={type} multi href={link({ type: toggleParam(current.type, type) })} active={types.includes(type)}>
            {t.types[type]}
          </Chip>
        ))}
      </Row>
      <Row label={t.filters.sport}>
        <Chip href={link({ sport: undefined })} active={!sportsOn.length}>
          {t.filters.any}
        </Chip>
        {sports.map((s) => (
          <Chip key={s.slug} multi href={link({ sport: toggleParam(current.sport, s.slug) })} active={sportsOn.includes(s.slug)}>
            {s.name}
          </Chip>
        ))}
      </Row>
      <Row label={t.filters.district}>
        <Chip href={link({ district: undefined })} active={!districtsOn.length}>
          {t.filters.any}
        </Chip>
        {districts.map((d) => (
          <Chip key={d} multi href={link({ district: toggleParam(current.district, d) })} active={districtsOn.includes(d)}>
            {d}
          </Chip>
        ))}
      </Row>
      {current.venue && (
        <Row label={t.filters.venue}>
          <Chip href={link({ venue: undefined })} active={false}>
            {t.filters.anyVenue}
          </Chip>
          <Chip href={link({})} active>
            {venueName ?? t.filters.unknownVenue}
          </Chip>
        </Row>
      )}
      <Row label={t.filters.forWho}>
        <Chip href={link({ kids: undefined })} active={current.kids !== '1'}>
          {t.filters.everyone}
        </Chip>
        <Chip href={link({ kids: '1' })} active={current.kids === '1'}>
          {t.filters.kids}
        </Chip>
      </Row>
      <Row label={t.filters.price}>
        <Chip href={link({ free: undefined })} active={current.free !== '1'}>
          {t.filters.anyPrice}
        </Chip>
        <Chip href={link({ free: '1' })} active={current.free === '1'}>
          {t.filters.free}
        </Chip>
      </Row>
    </section>
  );
}
