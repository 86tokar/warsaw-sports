import { ImageResponse } from 'next/og';

// Иконка для iPhone/iPad (PNG 180×180): Safari не берёт SVG-иконку для экрана «Домой»
// edge: генератор картинок в Node-режиме на Windows ломается на пути к шрифту; на edge путей к файлам нет
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Тот же мяч, что в icon.svg, без скругления: iOS скругляет углы сам
const BALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="10.5" fill="#f6c22b"/>
  <g fill="none" stroke="#0f1b26" stroke-width="1.8" stroke-linecap="round">
    <path d="M5.5 16h21"/><path d="M16 5.5v21"/>
    <path d="M9 8.6c3.6 3 3.6 11.8 0 14.8"/><path d="M23 8.6c-3.6 3-3.6 11.8 0 14.8"/>
  </g>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1b26' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={150} height={150} alt="" src={`data:image/svg+xml;utf8,${encodeURIComponent(BALL)}`} />
      </div>
    ),
    size,
  );
}
