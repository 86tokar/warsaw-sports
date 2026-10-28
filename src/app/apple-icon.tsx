import { ImageResponse } from 'next/og';
import { FAVICON_SQUARE_SVG } from '@/lib/favicon-svg';

// Иконка для iPhone/iPad (PNG 180×180): бегун из набора пиктограмм (scripts/pictograms.ts).
// edge: генератор картинок в Node-режиме на Windows ломается на пути к шрифту; на edge путей к файлам нет
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img width={180} height={180} alt="" src={`data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SQUARE_SVG)}`} />
    ),
    size,
  );
}
