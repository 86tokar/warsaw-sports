import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { EVENT_TYPES, isEventType } from '@/lib/labels';
import { warsawLocalToDate } from '@/lib/dates';
import { INTL_LOCALE, getDict, href, isLocale, sportName, DEFAULT_LOCALE, pageLang } from '@/i18n';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  return isLocale(params.lang) ? { title: getDict(params.lang).submit.title } : {};
}

function text(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

async function submitEvent(formData: FormData) {
  'use server';

  // Язык формы — чтобы вернуть человека на ту же страницу
  const langValue = text(formData, 'lang');
  const back = href(isLocale(langValue) ? langValue : DEFAULT_LOCALE, '/submit');

  // Скрытое поле-ловушка для ботов
  if (text(formData, 'company')) redirect(`${back}?sent=1`);

  const title = text(formData, 'title');
  const type = text(formData, 'type');
  const sportId = text(formData, 'sportId');
  const startsAt = warsawLocalToDate(text(formData, 'startsAt'));
  const endsRaw = text(formData, 'endsAt');
  const endsAt = endsRaw ? warsawLocalToDate(endsRaw) : null;
  const url = text(formData, 'url');
  const venueId = text(formData, 'venueId');
  const organizerName = text(formData, 'organizer');

  if (title.length < 3 || title.length > 120) redirect(`${back}?error=title`);
  if (!isEventType(type)) redirect(`${back}?error=type`);
  const sport = sportId ? await prisma.sport.findUnique({ where: { id: sportId } }) : null;
  if (!sport) redirect(`${back}?error=sport`);
  if (!startsAt || startsAt.getTime() < Date.now() - 3_600_000) redirect(`${back}?error=date`);
  if (endsAt && endsAt <= startsAt) redirect(`${back}?error=end`);
  if (url && !/^https?:\/\//i.test(url)) redirect(`${back}?error=url`);

  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId } }) : null;

  let organizerId: string | undefined;
  if (organizerName) {
    const existing = await prisma.organizer.findFirst({ where: { name: organizerName } });
    organizerId = (existing ?? (await prisma.organizer.create({ data: { name: organizerName.slice(0, 120) } }))).id;
  }

  await prisma.event.create({
    data: {
      title,
      description: text(formData, 'description').slice(0, 3000) || null,
      type,
      startsAt,
      endsAt,
      isFree: formData.get('isFree') === 'on',
      priceInfo: text(formData, 'priceInfo').slice(0, 200) || null,
      url: url || null,
      locationNote: venue ? null : text(formData, 'locationNote').slice(0, 300) || null,
      status: 'pending',
      source: 'submitted',
      sportId: sport.id,
      venueId: venue?.id ?? null,
      organizerId: organizerId ?? null,
    },
  });

  redirect(`${back}?sent=1`);
}

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { sent?: string; error?: string };
}) {
  const lang = pageLang(params.lang);
  const t = getDict(lang);
  const [sportRows, venues] = await Promise.all([
    prisma.sport.findMany(),
    prisma.venue.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const sports = sportRows
    .map((s) => ({ id: s.id, name: sportName(t, s.slug, s.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, INTL_LOCALE[lang]));
  const errorKey = searchParams.error as keyof typeof t.submit.errors | undefined;
  const error = errorKey && errorKey in t.submit.errors ? t.submit.errors[errorKey] : null;

  return (
    <main className="wrap page">
      <h1 className="page-title">{t.submit.title}</h1>
      <p className="prose">
        {t.submit.intro} {t.submit.privacyNote}
      </p>

      {searchParams.sent && (
        <p className="notice" role="status">
          {t.submit.sent}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form className="form" action={submitEvent}>
        <input type="hidden" name="lang" value={lang} />
        <label>
          {t.submit.name}
          <input name="title" required minLength={3} maxLength={120} />
        </label>

        <div className="two">
          <label>
            {t.submit.type}
            <select name="type" required defaultValue="">
              <option value="" disabled>
                {t.submit.choose}
              </option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.types[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.submit.sport}
            <select name="sportId" required defaultValue="">
              <option value="" disabled>
                {t.submit.choose}
              </option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="two">
          <label>
            {t.submit.start}
            <input type="datetime-local" name="startsAt" required />
            <span className="hint">{t.submit.warsawTime}</span>
          </label>
          <label>
            {t.submit.end}
            <input type="datetime-local" name="endsAt" />
          </label>
        </div>

        <label>
          {t.submit.venue}
          <select name="venueId" defaultValue="">
            <option value="">{t.submit.otherVenue}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}, {v.district}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t.submit.otherPlace}
          <input name="locationNote" maxLength={300} placeholder={t.submit.otherPlaceHint} />
        </label>

        <div className="two">
          <label className="check">
            <input type="checkbox" name="isFree" />
            {t.submit.free}
          </label>
          <label>
            {t.submit.cost}
            <input name="priceInfo" maxLength={200} placeholder={t.submit.costHint} />
          </label>
        </div>

        <label>
          {t.submit.organizer}
          <input name="organizer" maxLength={120} placeholder={t.submit.organizerHint} />
        </label>

        <label>
          {t.submit.link}
          <input type="url" name="url" placeholder="https://" />
        </label>

        <label>
          {t.submit.description}
          <textarea name="description" rows={5} maxLength={3000} />
        </label>

        <div className="hp" aria-hidden="true">
          <label>
            {t.submit.honeypot}
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div>
          <button type="submit" className="btn">
            {t.submit.send}
          </button>
        </div>
      </form>
    </main>
  );
}
