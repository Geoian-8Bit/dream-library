import { useMemo } from 'react';
import type { ShelfCosmetic } from '../shelves/types';
import { Book } from './Book';
import { BOOK_MODELS } from './models';
import { bookVariation, hashToFloat, pickModelAvoiding, type BookVariation } from './variation';

/**
 * Forma mínima del libro que necesita el layout. Cuando el form
 * añada un libro, el backend devolverá objetos así (más coverUrl,
 * title, etc., que usaremos para sustituir la elección por hash por
 * algo guiado por contenido en el futuro).
 */
/**
 * Cada entrada en la estantería representa una **saga** del usuario
 * (una colección de libros con nombre común). El render 3D sólo
 * muestra una "lomo de saga"; al click abre el modal con la lista
 * de libros de la saga.
 */
export interface LibraryBookData {
  /** id estable de la saga (semilla de variación visual). */
  id: string;
  shelfRow: number;
  shelfOrder: number;
  /** Nombre visible en el lomo. Si falta, se mockea por hash. */
  sagaTitle?: string;
  /** Nº de libros que el usuario tiene en la saga. Se muestra como badge. */
  bookCount?: number;
  /**
   * Timestamp del momento en que el libro fue "añadido". Si presente y
   * reciente (< duración de la animación), el render lo desliza desde
   * la posición de presentación al slot.
   */
  appearAt?: number;
  /** Reservados — ya no afectan al layout, pero están en la API. */
  format?: string | null;
  pageCount?: number | null;
}

interface BookLayoutProps {
  shelf: ShelfCosmetic;
  books: LibraryBookData[];
  /** Click sobre cualquier libro → escalado al padre con el id. */
  onBookClick?: (id: string) => void;
  /** Id del libro actualmente seleccionado, si lo hay. */
  selectedId?: string | null;
}

/**
 * Renderiza los libros de cada balda. Para cada `RowDef`:
 *   1. Filtra libros con `shelfRow === rowIdx`.
 *   2. Ordena por `shelfOrder`.
 *   3. Packea desde `startX` sumando el grosor real (dims.x del
 *      modelo × shelf.bookScale).
 *   4. Si la suma supera `endX`, descarta los excedentes (overflow).
 *   5. Tilt emergente en los extremos de la balda.
 *
 * Libros con `shelfRow >= shelf.rows.length` se descartan
 * (overflow por cambio de cosmético con menos baldas).
 */
export function BookLayout({ shelf, books, onBookClick, selectedId }: BookLayoutProps) {
  const items = useMemo(() => layout(shelf, books), [shelf, books]);
  return (
    <>
      {items.map((it) => (
        <Book
          key={it.id}
          id={it.id}
          modelName={it.modelName}
          position={it.position}
          rotation={it.rotation}
          scale={it.scale}
          sagaTitle={it.sagaTitle}
          bookCount={it.bookCount}
          appearAt={it.appearAt}
          selected={selectedId === it.id}
          onClick={onBookClick}
        />
      ))}
    </>
  );
}

interface LaidOutBook {
  id: string;
  modelName: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  sagaTitle?: string;
  bookCount?: number;
  appearAt?: number;
}

function modelByName(name: string) {
  return BOOK_MODELS.find((m) => m.name === name) ?? BOOK_MODELS[0]!;
}

function layout(shelf: ShelfCosmetic, books: LibraryBookData[]): LaidOutBook[] {
  const scale = shelf.bookScale > 0 ? shelf.bookScale : 1;
  const byRow = new Map<number, LibraryBookData[]>();
  for (const b of books) {
    if (b.shelfRow < 0 || b.shelfRow >= shelf.rows.length) continue;
    const list = byRow.get(b.shelfRow) ?? [];
    list.push(b);
    byRow.set(b.shelfRow, list);
  }

  const out: LaidOutBook[] = [];
  for (let rowIdx = 0; rowIdx < shelf.rows.length; rowIdx++) {
    const row = shelf.rows[rowIdx]!;
    const rowBooks = byRow.get(rowIdx);
    if (!rowBooks || rowBooks.length === 0) continue;
    rowBooks.sort((a, b) => a.shelfOrder - b.shelfOrder);

    // Pick modelo por libro evitando que dos colindantes compartan
    // baseColor. Recorrido secuencial: cada uno mira al anterior.
    const variations: BookVariation[] = [];
    let prevColor: string | null = null;
    for (const b of rowBooks) {
      const v = bookVariation({ id: b.id });
      const model = pickModelAvoiding(b.id, prevColor ? [prevColor] : []);
      variations.push({ modelName: model.name, baseTilt: v.baseTilt });
      prevColor = model.baseColor;
    }

    let cursor = row.startX;
    for (let i = 0; i < rowBooks.length; i++) {
      const b = rowBooks[i]!;
      const v = variations[i]!;
      const model = modelByName(v.modelName);
      const thickness = model.dims.x * scale;

      // Hueco aleatorio antes de cada libro (excepto el primero) para
      // que la balda no parezca un peine. Determinista por id: el
      // mismo libro siempre tiene el mismo hueco a su izquierda.
      // Distribución sesgada con curva cuadrática: la mayoría
      // tienen hueco mínimo, pocos tienen huecos visibles. Rango
      // efectivo 0–10 mm (× bookScale).
      if (i > 0) {
        const seed = hashToFloat(b.id + ':gap');
        const gap = seed * seed * 0.01 * scale;
        cursor += gap;
      }

      const xCenter = cursor + thickness / 2;
      const xRight = cursor + thickness;
      if (xRight > row.endX) break;

      // Tilt deshabilitado: en este momento los libros inclinados
      // colisionan con sus vecinos (la geometría real ocupa toda la
      // anchura del slot, sin holgura para el ángulo). Volveremos a
      // activar `computeTilt` cuando resolvamos collisión —
      // típicamente reservando un margen extra al packing o
      // aplicando un offset de Y proporcional al tilt.
      const tilt = 0;

      out.push({
        id: b.id,
        modelName: v.modelName,
        position: [xCenter, row.y, row.z],
        rotation: [0, 0, tilt],
        scale,
        sagaTitle: b.sagaTitle,
        bookCount: b.bookCount,
        appearAt: b.appearAt,
      });
      cursor = xRight;
    }
  }
  return out;
}
