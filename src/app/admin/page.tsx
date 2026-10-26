import Link from 'next/link';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { formatFullDate, formatTime } from '@/lib/dates';
import { typeLabel } from '@/lib/labels';
import { isAdminAuthorized } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Админка: Спортивная Варшава', robots: { index: false } };

// Действия проверяют пароль ещё раз: middleware защищает страницу, а это защита самих действий
function assertAdmin() {
  if (!isAdminAuthorized(headers().get('authorization'))) throw new Error('Нет доступа');
}

async function setStatus(formData: FormData) {
  'use server';
  assertAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['published', 'rejected'].includes(status)) return;
  await prisma.event.update({ where: { id }, data: { status } });
  revalidatePath('/admin');
}

export default async function AdminPage() {
  assertAdmin();
  const [pending, counts] = await Promise.all([
    prisma.event.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { sport: true, venue: true, organizer: true },
    }),
    prisma.event.groupBy({ by: ['status'], _count: true }),
  ]);

  return (
    <main className="wrap page">
      <h1 className="page-title">Модерация заявок</h1>
      <p className="prose">
        Заявки из формы «Добавить событие». Опубликованные сразу появляются на сайте, отклонённые остаются в базе со
        статусом rejected.{' '}
        {counts.map((c) => `${c.status}: ${c._count}`).join(', ')}
      </p>

      {pending.length === 0 ? (
        <section className="empty">
          <h2>Новых заявок нет</h2>
          <p>
            <Link href="/">На главную</Link>
          </p>
        </section>
      ) : (
        <ul className="venue-list">
          {pending.map((e) => (
            <li key={e.id}>
              <div>
                <div className="venue-name">{e.title}</div>
                <div className="venue-sub">
                  {typeLabel(e.type)} · {e.sport.name} · {formatFullDate(e.startsAt)}, {formatTime(e.startsAt)}
                </div>
                <div className="venue-sub">
                  {e.venue ? `${e.venue.name}, ${e.venue.address}` : (e.locationNote ?? 'Место не указано')}
                  {e.organizer && ` · ${e.organizer.name}`}
                  {e.isFree ? ' · бесплатно' : e.priceInfo ? ` · ${e.priceInfo}` : ''}
                </div>
                {e.description && <p className="prose">{e.description}</p>}
                {e.url && (
                  <a href={e.url} target="_blank" rel="noopener noreferrer nofollow">
                    {e.url}
                  </a>
                )}
              </div>
              <div className="admin-actions">
                <form action={setStatus}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="status" value="published" />
                  <button className="btn" type="submit">
                    Опубликовать
                  </button>
                </form>
                <form action={setStatus}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="btn btn-ghost" type="submit">
                    Отклонить
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
