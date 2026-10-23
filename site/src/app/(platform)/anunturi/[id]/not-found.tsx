import Link from "next/link";
export default function NotFound() {
  return (
    <main id="catalog" className="page-status">
      <span className="eyebrow">Anunț indisponibil</span>
      <h1>Acest anunț nu poate fi găsit.</h1>
      <p>
        Este posibil să fi fost retras. Descoperă celelalte anunțuri din
        platformă.
      </p>
      <Link className="button button-primary" href="/explore">
        Înapoi la catalog
      </Link>
    </main>
  );
}
