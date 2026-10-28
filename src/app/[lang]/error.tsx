'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Понятная страница вместо «Application error», если сервер не ответил (например, база ещё просыпалась).
// Кнопка повторяет запрос страницы, не перезагружая весь сайт.
const TEXT: Record<string, { title: string; text: string; retry: string }> = {
  ru: { title: 'Что-то пошло не так', text: 'Страница не загрузилась. Обычно помогает повторить попытку через пару секунд.', retry: 'Попробовать ещё раз' },
  uk: { title: 'Щось пішло не так', text: 'Сторінка не завантажилася. Зазвичай допомагає спробувати ще раз за кілька секунд.', retry: 'Спробувати ще раз' },
  pl: { title: 'Coś poszło nie tak', text: 'Strona się nie wczytała. Zwykle pomaga ponowna próba za kilka sekund.', retry: 'Spróbuj ponownie' },
  en: { title: 'Something went wrong', text: 'The page did not load. Trying again in a few seconds usually helps.', retry: 'Try again' },
};

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = TEXT[usePathname().split('/')[1]] ?? TEXT.pl;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="wrap page">
      <section className="empty">
        <h2>{t.title}</h2>
        <p>{t.text}</p>
        <p>
          <button type="button" className="btn" onClick={() => reset()}>
            {t.retry}
          </button>
        </p>
        {error.digest && <p className="venue-sub">Digest: {error.digest}</p>}
      </section>
    </main>
  );
}
