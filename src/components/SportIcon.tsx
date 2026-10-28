import { SPORT_PICTOGRAM } from '@/lib/pictograms';

// Пиктограмма вида спорта (Wikimedia Commons, открытые лицензии; файлы в public/sports, см. scripts/pictograms.ts).
// Декоративная: рядом всегда есть название, поэтому alt пустой. Для видов без пиктограммы ничего не выводит.
export default function SportIcon({ slug, size = 20, className = '' }: { slug: string; size?: number; className?: string }) {
  const key = SPORT_PICTOGRAM[slug];
  if (!key) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/sports/${key}.svg`}
      alt=""
      width={size}
      height={size}
      className={`sport-icon ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
