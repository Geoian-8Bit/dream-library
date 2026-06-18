import { Link } from 'react-router-dom';

/**
 * Pantalla pública de créditos. Lista los assets de terceros usados
 * en la app con su atribución (CC-BY exige link visible al autor +
 * licencia). Se actualiza cada vez que se añade un asset nuevo;
 * `CREDITS.md` en la raíz del repo es la fuente de verdad mientras
 * iteramos.
 */
export default function Credits() {
  return (
    <main className="bg-page text-text-strong min-h-dvh w-dvw">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <Link to="/" className="text-text-soft hover:text-text-strong text-sm underline">
            ← Volver
          </Link>
          <h1 className="font-display text-3xl tracking-wide">Créditos</h1>
          <p className="text-text-soft text-sm">
            Dream Library usa los siguientes recursos de terceros, cada uno con su autor y licencia
            correspondiente.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-xl">Modelos 3D</h2>

          <CreditEntry
            title="Elegan old book pack"
            author="3D_for_everyone"
            authorUrl="https://sketchfab.com/boglarka4"
            sourceUrl="https://sketchfab.com/3d-models/elegan-old-book-pack-4cc9ecf0531b463dada8262851ca87f8"
            license="CC-BY 4.0"
            licenseUrl="https://creativecommons.org/licenses/by/4.0/"
            note="Modelos individuales de libros y sus texturas, usados como cuerpos físicos en la estantería 3D."
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl">HDRI / iluminación</h2>

          <CreditEntry
            title="Sunny Vondelpark"
            author="Greg Zaal"
            sourceUrl="https://polyhaven.com/a/sunny_vondelpark"
            license="CC0"
            licenseUrl="https://creativecommons.org/publicdomain/zero/1.0/"
            note="HDRI usado como Image-Based Lighting de la escena. CC0 no exige atribución; aquí por cortesía."
          />
        </section>

        <footer className="text-text-soft border-current/10 border-t pt-4 text-xs">
          ¿Falta algún crédito o ves un error?{' '}
          <a href="mailto:igiron@gnlrussellbedford.es" className="hover:text-text-strong underline">
            avísame
          </a>
          .
        </footer>
      </div>
    </main>
  );
}

interface CreditEntryProps {
  title: string;
  author: string;
  authorUrl?: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  note?: string;
}

function CreditEntry({
  title,
  author,
  authorUrl,
  sourceUrl,
  license,
  licenseUrl,
  note,
}: CreditEntryProps) {
  return (
    <article className="nt-card space-y-2 p-4">
      <h3 className="text-text-strong font-medium">
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">
          {title}
        </a>
      </h3>
      <p className="text-text-soft text-sm">
        por{' '}
        {authorUrl ? (
          <a
            href={authorUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-strong underline"
          >
            {author}
          </a>
        ) : (
          <span>{author}</span>
        )}
        {' · '}
        <a
          href={licenseUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-text-strong underline"
        >
          {license}
        </a>
      </p>
      {note && <p className="text-text-soft text-xs">{note}</p>}
    </article>
  );
}
