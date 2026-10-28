import LoadingLabel from '@/components/LoadingLabel';

// Скелет страницы: Next.js показывает его сразу при переходе на другую страницу, пока сервер готовит новую
// (особенно заметно, когда облачная база «просыпается» после простоя)
export default function Loading() {
  return (
    <main className="wrap" aria-busy="true">
      <LoadingLabel />
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-text" />
      <span className="skeleton skeleton-text" style={{ width: 'min(420px, 70%)' }} />
      <span className="skeleton skeleton-chips" />
      <span className="skeleton skeleton-chips" style={{ width: 'min(560px, 90%)' }} />
      <span className="skeleton skeleton-row" style={{ marginTop: 28 }} />
      <span className="skeleton skeleton-row" />
      <span className="skeleton skeleton-row" />
    </main>
  );
}
