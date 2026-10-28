'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Индикатор перехода: полоса вверху страницы и приглушённое содержимое, пока грузится следующая страница.
// Next.js не сообщает о начале перехода, поэтому ловим клики по внутренним ссылкам и отправку форм,
// а конец перехода — по смене адреса (pathname или параметров).
export default function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  // Адрес сменился — переход завершён: дотягиваем полосу до конца и прячем
  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s));
    document.documentElement.classList.remove('navigating');
    const t = setTimeout(() => setState((s) => (s === 'done' ? 'idle' : s)), 400);
    return () => clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
      setState('loading');
      document.documentElement.classList.add('navigating');
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Та же страница (или только якорь) — перехода не будет
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      if (!e.defaultPrevented) start();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('popstate', start);
    };
  }, []);

  // Подстраховка: если адрес так и не сменился (ошибка сети), через 20 секунд убираем индикатор
  useEffect(() => {
    if (state !== 'loading') return;
    const t = setTimeout(() => {
      setState('idle');
      document.documentElement.classList.remove('navigating');
    }, 20_000);
    return () => clearTimeout(t);
  }, [state]);

  return <div className={`nav-progress nav-progress-${state}`} aria-hidden="true" />;
}
