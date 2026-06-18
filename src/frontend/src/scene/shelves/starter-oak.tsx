import type { ShelfCosmetic, RowDef } from './types';
import { StarterOakModel } from './starter-oak-model';

/**
 * Cosmético "starter-oak": el shelf por defecto. Para añadir uno
 * nuevo: drop del .glb en /public/models/, archivo `<id>-model.tsx`
 * con el mesh, archivo `<id>.tsx` (este patrón) con los datos del
 * cosmético, y línea en `registry.ts`.
 *
 * `ROWS` y `bookScale` salen de `/dev/calibrate-shelf` (Copy code).
 * Cada RowDef define una balda como un rango continuo; los libros se
 * packean desde startX hacia endX por shelfOrder.
 */
// Orden de arriba a abajo: rowIdx=0 es la balda superior, así el
// llenado por shelfRow ascendente cae primero en lo alto y va bajando.
const ROWS: RowDef[] = [
  { y: 1.39, startX: -0.48, endX: 0.48, z: -3.74, maxBookHeight: 0.32 },
  { y: 1.015, startX: -0.48, endX: 0.48, z: -3.74, maxBookHeight: 0.32 },
  { y: 0.64, startX: -0.48, endX: 0.48, z: -3.74, maxBookHeight: 0.32 },
  { y: 0.265, startX: -0.48, endX: 0.48, z: -3.74, maxBookHeight: 0.32 },
];

export const starterOak: ShelfCosmetic = {
  id: 'starter-oak',
  displayName: 'Starter Oak',
  rows: ROWS,
  bookScale: 1.4,
  Component: StarterOakModel,
};
