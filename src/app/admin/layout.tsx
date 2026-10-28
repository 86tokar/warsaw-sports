import '../globals.css';

// Админка — отдельный корневой макет: только на русском, без переключателя языков
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
