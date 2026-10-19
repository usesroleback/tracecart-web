// Fallback for requests that don't even match a [locale] segment (middleware
// should redirect those to a locale-prefixed path first — this only fires if
// that somehow doesn't happen). The real, translated not-found page is
// app/[locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>Cette page est introuvable.</p>
          <a href="/">Retour à l&apos;accueil</a>
        </div>
      </body>
    </html>
  );
}
