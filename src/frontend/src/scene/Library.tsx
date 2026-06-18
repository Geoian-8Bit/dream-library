import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { ROOM_PALETTE } from './palette';
import { Room } from './Room';
import { getShelf, DEFAULT_SHELF_ID } from './shelves/registry';
import type { ShelfCosmetic } from './shelves/types';
import { BookLayout, type LibraryBookData } from './books/BookLayout';
import { Book } from './books/Book';
import { pickModelAvoiding } from './books/variation';
import { RowGizmos } from './debug/RowGizmos';

/**
 * Espacio 3D: cámara fija dentro de la habitación apuntando a la
 * estantería del fondo. La cámara sólo se mueve cuando el usuario
 * arrastra (click-drag en PC, drag-touch en móvil); al soltar vuelve
 * sola al centro.
 */

// Tilt base 0 (cámara nivelada). El bias de espacio arriba lo da
// que la cámara está en y=1.2 mientras el shelf va de y=0 a y=2.0.
const BASE_PITCH = 0;
const MAX_YAW = 0.07; // ~4° de "look-around" lateral
const MAX_PITCH = 0.035; // ~2° arriba/abajo
const DAMP = 2.5; // suavizado: ni instantáneo ni perezoso

interface LibraryProps {
  /** Override del shelf activo (calibrator usa esto). */
  shelfOverride?: ShelfCosmetic;
  /** Override del array de libros. `[]` = sin libros (calibrator). */
  booksOverride?: LibraryBookData[];
  /** Forzar gizmos magenta on/off. Si undefined, lee `?debugShelf=1`. */
  showSlotGizmos?: boolean;
}

export function Library(props: LibraryProps = {}) {
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);

  // Estado del drag (en refs para evitar re-renders)
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const baseYaw = useRef(0);
  const basePitch = useRef(0);

  // Libro seleccionado (aproxima + abre en 3D). null = ninguno.
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  // Libro centrado en pantalla. Se crea al pulsar "+ Añadir libro" y
  // se queda flotando en el medio (sin slot). Cada click genera un id
  // nuevo → re-anima la aparición.
  const [centeredBook, setCenteredBook] = useState<LibraryBookData | null>(null);
  // Toggle de apertura del libro centrado (tecla SPACE).
  // false = libro cerrado en su pose de presentación.
  // true  = tapas abiertas a 120° (60° cada una).
  const [centeredBookOpen, setCenteredBookOpen] = useState(false);
  // Para distinguir click vs drag: si pointer down → arrastras → up,
  // tratamos el up como cierre de drag, no click.
  const dragMoved = useRef(false);

  // En modo calibrator usamos sus libros; si no, el shelf va vacío y
  // sólo se muestra el libro centrado por separado.
  const books = props.booksOverride ?? [];
  const showAddButton = !props.booksOverride;

  function spawnCenteredBook() {
    setCenteredBook({
      id: `centered-${Date.now()}`,
      shelfRow: 0,
      shelfOrder: 0,
      appearAt: Date.now(),
    });
    setCenteredBookOpen(false);
  }

  // SPACE: toggle de apertura de tapas del libro centrado.
  // Ignoramos el evento si el foco está en un input/textarea.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setCenteredBookOpen((prev) => !prev);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragMoved.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseYaw.current = targetYaw.current;
    basePitch.current = targetPitch.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
    const w = e.currentTarget.clientWidth || 1;
    const h = e.currentTarget.clientHeight || 1;
    // Half-screen-drag = MAX. Sensación de "asomar" sin pasarse.
    targetYaw.current = clamp(baseYaw.current - (dx / w) * 2 * MAX_YAW, -MAX_YAW, MAX_YAW);
    targetPitch.current = clamp(
      basePitch.current + (dy / h) * 2 * MAX_PITCH,
      -MAX_PITCH,
      MAX_PITCH,
    );
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    // Auto-retorno al centro
    targetYaw.current = 0;
    targetPitch.current = 0;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer capture ya liberado: ignorar
    }
  }

  return (
    <div
      className="h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, -0.1], fov: 34 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onPointerMissed={() => {
          // Click en zona vacía del 3D → cerrar libro abierto.
          if (!dragMoved.current) setSelectedBookId(null);
        }}
      >
        <Scene
          shelfOverride={props.shelfOverride}
          books={books}
          centeredBook={centeredBook}
          centeredBookOpen={centeredBookOpen}
          showSlotGizmos={props.showSlotGizmos}
          selectedId={selectedBookId}
          onBookClick={(id) => {
            // Ignoramos clicks que vienen después de un drag.
            if (dragMoved.current) return;
            // Toggle: clickando el mismo libro otra vez → deselect.
            setSelectedBookId((prev) => (prev === id ? null : id));
          }}
        />
        <WorldFraming topY={2.5} bottomY={-0.2} distance={3.7} />
        <CameraRig targetYawRef={targetYaw} targetPitchRef={targetPitch} />
        <PostFX />
      </Canvas>

      {showAddButton && (
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              spawnCenteredBook();
            }}
            className="pointer-events-auto rounded-full bg-[#FFB36B] px-4 py-2 text-sm font-semibold text-[#1d1a17] shadow-lg transition hover:bg-[#ffc78c] active:scale-95"
          >
            + Añadir libro
          </button>
        </div>
      )}
    </div>
  );
}

interface SceneProps {
  shelfOverride?: ShelfCosmetic;
  books: LibraryBookData[];
  /** Libro flotando en medio de la pantalla (independiente del shelf). */
  centeredBook?: LibraryBookData | null;
  /** true → tapas abiertas a 120°; false → cerradas. */
  centeredBookOpen?: boolean;
  showSlotGizmos?: boolean;
  onBookClick?: (id: string) => void;
  selectedId?: string | null;
}

function Scene({
  shelfOverride,
  books,
  centeredBook,
  centeredBookOpen,
  showSlotGizmos,
  onBookClick,
  selectedId,
}: SceneProps) {
  return (
    <>
      <color attach="background" args={[ROOM_PALETTE.background]} />
      <fog attach="fog" args={[ROOM_PALETTE.background, 9, 18]} />

      {/* IBL: HDRI custom (Poly Haven sunny_vondelpark) en lugar del
          preset built-in. background={false} para no pisar las paredes. */}
      <Environment
        files="/hdri/sunny_vondelpark.exr"
        background={false}
        environmentIntensity={0.9}
      />

      {/* PCSS: sombras blandas con penumbra dependiente de distancia. */}
      <SoftShadows samples={16} size={25} focus={0.8} />

      <ambientLight color={ROOM_PALETTE.ambient} intensity={0.15} />
      <directionalLight
        color="#FFE8C8"
        intensity={0.9}
        position={[-5, 4, 5]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight
        color={ROOM_PALETTE.ambient}
        intensity={0.2}
        position={[1.6, 2.4, 1.6]}
        distance={7}
        decay={2}
      />

      <Room palette={ROOM_PALETTE} />
      <ActiveShelf
        shelfOverride={shelfOverride}
        books={books}
        showSlotGizmos={showSlotGizmos}
        onBookClick={onBookClick}
        selectedId={selectedId}
      />
      {centeredBook ? (
        <CenteredBook
          book={centeredBook}
          shelf={shelfOverride ?? getShelf(DEFAULT_SHELF_ID)}
          open={centeredBookOpen ?? false}
        />
      ) : null}
    </>
  );
}

interface CenteredBookProps {
  book: LibraryBookData;
  shelf: ShelfCosmetic;
  open: boolean;
}

/**
 * Libro procedural flotando en el centro. La pose centrada (presentación,
 * yaw=π) la gestiona el propio Book vía `centered`. SPACE abre/cierra
 * las tapas vía el prop `open`.
 */
function CenteredBook({ book, shelf, open }: CenteredBookProps) {
  const model = pickModelAvoiding(book.id, []);
  return (
    <Book
      id={book.id}
      modelName={model.name}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={shelf.bookScale}
      sagaTitle={book.sagaTitle}
      bookCount={book.bookCount}
      appearAt={book.appearAt}
      centered
      open={open}
    />
  );
}

/**
 * Render del shelf activo + sus libros. Por defecto usa el cosmético
 * por defecto del registry; si se le pasa `shelfOverride` (caso del
 * calibrador), lo usa en su lugar. `booksOverride={[]}` deja la
 * estantería vacía (calibrador).
 */
function ActiveShelf({
  shelfOverride,
  books,
  showSlotGizmos,
  onBookClick,
  selectedId,
}: SceneProps) {
  const shelf = shelfOverride ?? getShelf(DEFAULT_SHELF_ID);
  const debugFromUrl = new URLSearchParams(window.location.search).get('debugShelf') === '1';
  const debug = showSlotGizmos ?? debugFromUrl;
  const ShelfModel = shelf.Component;
  return (
    <>
      <ShelfModel />
      <BookLayout shelf={shelf} books={books} onBookClick={onBookClick} selectedId={selectedId} />
      {debug ? <RowGizmos shelf={shelf} /> : null}
    </>
  );
}

interface CameraRigProps {
  targetYawRef: React.MutableRefObject<number>;
  targetPitchRef: React.MutableRefObject<number>;
}

/**
 * Lee el yaw/pitch deseado de refs externas (controladas por los
 * handlers de drag) y los aplica a la cámara con damping exponencial.
 */
function CameraRig({ targetYawRef, targetPitchRef }: CameraRigProps) {
  const { camera } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);

  useFrame((_, delta) => {
    yaw.current = THREE.MathUtils.damp(yaw.current, targetYawRef.current, DAMP, delta);
    pitch.current = THREE.MathUtils.damp(pitch.current, targetPitchRef.current, DAMP, delta);
    camera.rotation.set(BASE_PITCH + pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface WorldFramingProps {
  /** Coordenada world-Y que cae en el borde SUPERIOR del frame, a `distance`. */
  topY: number;
  /** Coordenada world-Y que cae en el borde INFERIOR del frame, a `distance`. */
  bottomY: number;
  /** Distancia (m) de la cámara al plano frontal de la estantería. */
  distance: number;
}

/**
 * Construye el projection matrix cada frame para que `topY`/`bottomY`
 * (world Y, a la distancia `distance` desde la cámara) caigan SIEMPRE en
 * los bordes vertical superior/inferior del frame, en cualquier
 * dispositivo o aspecto. La extensión horizontal escala con el aspecto:
 * pantallas anchas ven más pared lateral, pero techo y suelo visibles
 * son idénticos.
 *
 * Sustituye al combo `ResponsiveFraming` + `AsymmetricFrustum`: lockear
 * en world-space (en lugar de derivarlo del fov en grados) hace que dos
 * móviles con aspecto casi-igual ya no produzcan distintos márgenes de
 * suelo bajo la estantería.
 */
function WorldFraming({ topY, bottomY, distance }: WorldFramingProps) {
  useFrame(({ camera, size }) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const near = camera.near;
    const far = camera.far;
    const camY = camera.position.y;
    const topTan = (topY - camY) / distance;
    const bottomTan = (bottomY - camY) / distance;
    const top = near * topTan;
    const bottom = near * bottomTan;
    // Horizontal simétrico, escala con aspecto.
    const halfV = (top - bottom) / 2;
    const right = halfV * aspect;
    const left = -right;
    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  });
  return null;
}

/**
 * Post-processing: SSAO añade sombras de contacto en las grietas
 * (libros↔balda, esquinas pared) y bloom suaviza highlights brillantes
 * del HDRI / emisivos futuros (vela, lámpara). multisampling=0 desactiva
 * MSAA: con SSAO no se puede usar y al lado tenemos antialias de la
 * propia composición.
 */
function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={20}
        radius={0.06}
        intensity={20}
        luminanceInfluence={0.6}
        worldDistanceThreshold={1}
        worldDistanceFalloff={0.1}
        worldProximityThreshold={0.6}
        worldProximityFalloff={0.1}
      />
      <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      {/* Vignette: oscurece esquinas, foco al centro. */}
      <Vignette eskil={false} offset={0.45} darkness={0.45} />
    </EffectComposer>
  );
}
