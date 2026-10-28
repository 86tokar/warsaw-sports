'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n';

// Переключатель языка: та же страница и те же фильтры, другой язык в начале адреса
export default function LangSwitch({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
  return (
    <span className="lang-switch" role="group" aria-label={label}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}${search ? `?${search}` : ''}`}
          hrefLang={l}
          lang={l}
          title={LOCALE_LABEL[l].name}
          aria-current={l === current ? 'true' : undefined}
        >
          {LOCALE_LABEL[l].short}
        </Link>
      ))}
    </span>
  );
}
