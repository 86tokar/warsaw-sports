import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { EVENT_TYPES, isEventType } from '@/lib/labels';
import { warsawLocalToDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Добавить событие: Спортивная Варшава' };

const ERRORS: Record<string, string> = {
  title: 'Название должно быть от 3 до 120 символов.',
  type: 'Выберите тип события.',
  sport: 'Выберите вид спорта.',
  date: 'Укажите дату и время начала. Событие не может быть в прошлом.',
  end: 'Время окончания должно быть позже начала.',
  url: 'Ссылка должна начинаться с http:// или https://.',
};

function text(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

async function submitEvent(formData: FormData) {
  'use server';

  // Скрытое поле-ловушка для ботов
  if (text(formData, 'company')) redirect('/submit?sent=1');

  const title = text(formData, 'title');
  const type = text(formData, 'type');
  const sportId = text(formData, 'sportId');
  const startsAt = warsawLocalToDate(text(formData, 'startsAt'));
  const endsRaw = text(formData, 'endsAt');
  const endsAt = endsRaw ? warsawLocalToDate(endsRaw) : null;
  const url = text(formData, 'url');
  const venueId = text(formData, 'venueId');
  const organizerName = text(formData, 'organizer');

  if (title.length < 3 || title.length > 120) redirect('/submit?error=title');
  if (!isEventType(type)) redirect('/submit?error=type');
  const sport = sportId ? await prisma.sport.findUnique({ where: { id: sportId } }) : null;
  if (!sport) redirect('/submit?error=sport');
  if (!startsAt || startsAt.getTime() < Date.now() - 3_600_000) redirect('/submit?error=date');
  if (endsAt && endsAt <= startsAt) redirect('/submit?error=end');
  if (url && !/^https?:\/\//i.test(url)) redirect('/submit?error=url');

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

  redirect('/submit?sent=1');
}

export default async function SubmitPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const [sports, venues] = await Promise.all([
    prisma.sport.findMany({ orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <main className="wrap page">
      <h1 className="page-title">Добавить событие</h1>
      <p className="prose">
        Расскажите о матче, турнире, забеге или открытой тренировке. Мы проверим заявку и опубликуем её.
      </p>

      {searchParams.sent && (
        <p className="notice" role="status">
          Спасибо! Событие отправлено на проверку и появится на сайте после модерации.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form className="form" action={submitEvent}>
        <label>
          Название
          <input name="title" required minLength={3} maxLength={120} />
        </label>

        <div className="two">
          <label>
            Тип
            <select name="type" required defaultValue="">
              <option value="" disabled>
                Выберите
              </option>
              {EVENT_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Вид спорта
            <select name="sportId" required defaultValue="">
              <option value="" disabled>
                Выберите
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
            Начало
            <input type="datetime-local" name="startsAt" required />
            <span className="hint">Время по Варшаве</span>
          </label>
          <label>
            Окончание
            <input type="datetime-local" name="endsAt" />
          </label>
        </div>

        <label>
          Площадка
          <select name="venueId" defaultValue="">
            <option value="">Другое место (укажите ниже)</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}, {v.district}
              </option>
            ))}
          </select>
        </label>

        <label>
          Другое место
          <input name="locationNote" maxLength={300} placeholder="Адрес или описание, если площадки нет в списке" />
        </label>

        <div className="two">
          <label className="check">
            <input type="checkbox" name="isFree" />
            Вход бесплатный
          </label>
          <label>
            Стоимость
            <input name="priceInfo" maxLength={200} placeholder="Например, 40 zł" />
          </label>
        </div>

        <label>
          Организатор
          <input name="organizer" maxLength={120} placeholder="Клуб, федерация или ваше имя" />
        </label>

        <label>
          Ссылка на событие
          <input type="url" name="url" placeholder="https://" />
        </label>

        <label>
          Описание
          <textarea name="description" rows={5} maxLength={3000} />
        </label>

        <div className="hp" aria-hidden="true">
          <label>
            Не заполняйте это поле
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div>
          <button type="submit" className="btn">
            Отправить на проверку
          </button>
        </div>
      </form>
    </main>
  );
}
