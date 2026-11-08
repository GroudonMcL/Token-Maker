import { Link } from '../components/Link';

/**
 * About and Privacy links (and the UI kit while developing). They live in the
 * editor's bottom bar (or at the end of the phone sheet) and on the reading
 * pages, so nothing sits below the editor to scroll to by accident.
 */
export function SiteLinks({ className = 'site-links' }: { className?: string }) {
  return (
    <nav aria-label="Site" className={className}>
      <Link href="/about">About</Link>
      <Link href="/privacy">Privacy</Link>
      {import.meta.env.DEV && <Link href="/kit">UI kit</Link>}
    </nav>
  );
}
