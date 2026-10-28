'use client';

import { usePathname } from 'next/navigation';

// Текст для экранных дикторов во время загрузки. loading.tsx не получает язык из адреса,
// поэтому берём его из пути здесь; словари целиком в браузер не тянем — нужна одна строка
const LABEL: Record<string, string> = { ru: 'Загрузка…', uk: 'Завантаження…', pl: 'Ładowanie…', en: 'Loading…' };

export default function LoadingLabel() {
  const lang = usePathname().split('/')[1];
  return (
    <p className="sr-only" role="status">
      {LABEL[lang] ?? LABEL.pl}
    </p>
  );
}
