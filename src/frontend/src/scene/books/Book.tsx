import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBox, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BOOK_MODELS } from './models';
import { hashToFloat } from './variation';
import { pickSaga } from './titles';

interface BookProps {
  /** id estable de la saga (semilla de variación visual). */
  id: string;
  /** Nombre del modelo en BOOK_MODELS (decide dims + baseColor). */
  modelName: string;
  /** Centro de la BASE del libro en world space. */
  position: [number, number, number];
  rotation: [number, number, number];
  /** Multiplicador uniforme de tamaño (`shelf.bookScale`). */
  scale: number;
  sagaTitle?: string;
  bookCount?: number;
  onClick?: (id: string) => void;
  /**
   * Timestamp (`Date.now()`) en el que el libro fue "creado". Si está
   * presente y la animación todavía no ha terminado, el libro se
   * renderiza desplazándose desde la posición de presentación hacia
   * `position` con ease-out + scale-down. Sin este campo, aparece
   * directo en su slot.
   */
  appearAt?: number;
  /**
   * Si true, el libro se aproxima a la cámara y abre las dos tapas.
   * Cuando vuelve a false, regresa a su slot y cierra las tapas.
   */
  selected?: boolean;
  /**
   * Si true, la pose de reposo es la de presentación (centro de la
   * pantalla, escala 1.7) en vez del slot. La animación de aparición
   * salta la fase de slide → el libro se queda en medio.
   */
  centered?: boolean;
  /**
   * Toggle externo de apertura de tapas (sin tocar pose/escala). Se
   * anima con damping suave; las tapas se abren a 60° cada una (120°
   * entre ellas). Independiente del flujo `selected` (que abre a 90°
   * cada una + mueve el libro).
   */
  open?: boolean;
}

/**
 * Fases de la animación de aparición:
 *   1. Zoom-out  (0   → 0.6s): el libro va de pegado-a-la-cámara con
 *      la TAPA mirándola (yaw=90°) a la pos de presentación. El form
 *      HTML hace su propio recede en paralelo con timing equivalente.
 *   2. Rotación  (0.6 → 1.1s): yaw de 90° → 0° (tapa pasa a lomo).
 *   3. Slide     (1.1 → 2.1s): de presentación a slot, scale 1.7→1.
 */
const VERY_CLOSE_POS: [number, number, number] = [0, 1.2, -0.45];
const PRESENTATION_POS: [number, number, number] = [0, 1.05, -1.4];
const VERY_CLOSE_SCALE = 2.5;
const PRESENTATION_SCALE = 1.7;
const VERY_CLOSE_YAW = Math.PI / 2;

const PHASE_ZOOM_END = 0.6; // s
const PHASE_ROTATE_END = 1.1; // s
const PHASE_SLIDE_END = 2.1; // s
const APPEAR_DURATION = PHASE_SLIDE_END;

/** Pose cuando el libro está seleccionado (centro de la pantalla, abierto). */
const SELECTED_POS: [number, number, number] = [0, 1.15, -1.5];
const SELECTED_SCALE = 2;
/** Yaw cuando está seleccionado: -90° → la tapa frontal mira a cámara,
 *  el lomo queda a la izquierda. Al abrir las tapas, las "páginas"
 *  (cara X+ del page block) quedan de frente. */
const SELECTED_YAW = -Math.PI / 2;
/** Apertura máxima de cada tapa (radianes). 90° ≈ tapas perpendiculares. */
const OPEN_ANGLE_MAX = Math.PI * 0.5;
/** Apertura "suave" usada por el prop `open` (sin selección): 60° cada
 *  tapa → 120° de ángulo entre ellas (V cradlada, no plana). */
const OPEN_ANGLE_SOFT = Math.PI / 3;
/** Stagger: las tapas no empiezan a abrirse hasta que la translación
 *  + rotación están a mitad de camino, así primero "se posiciona" y
 *  luego "se abre". */
const COVER_OPEN_THRESHOLD = 0.5;
/** Damping de la transición selected ↔ idle (mayor = más rápido). */
const SELECTION_DAMP = 7;
/** Spring physics para la apertura/cierre vía prop `open`:
 *  stiffness/damping subcrítico → ligero overshoot (~3-5%) que da un
 *  toque "snappy" en lugar de un lerp exponencial puro. */
const OPEN_SPRING_STIFFNESS = 180;
const OPEN_SPRING_DAMPING = 22;
/** Número de hojas finas por lado. Cada una pivota en el lomo con su
 *  propio ángulo cuando el libro abre → efecto de abanico. */
const LEAVES_PER_SIDE = 5;
/** Ratios de apertura de cada hoja respecto a la tapa (de exterior →
 *  interior, i.e. la hoja más cercana a la tapa abre casi tanto como ella,
 *  la más interior se queda casi vertical para sugerir el grueso). */
const LEAF_RATIOS = [0.96, 0.85, 0.72, 0.58, 0.42];

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Render de un "lomo de saga" volumétrico: 4 piezas sólidas que
 * imitan la construcción de un libro de tapa dura.
 *   - Spine plate: tapa-binding visible al usuario (+Z), full Y/X.
 *   - Left/right cover plates: tapas laterales, finas en X, full Y/Z.
 *   - Page block: bloque de páginas centro, ligeramente recogido en
 *     Y (3 mm bajo top/bottom de tapa) y -Z (3 mm tras la fore-edge).
 *
 * Todas las tapas son `<RoundedBox>` con bevel suave en las esquinas
 * → contorno redondeado realista. El bloque de páginas usa
 * boxGeometry recta (papel = bordes vivos).
 *
 * Variación:
 *  - El `modelName` da color base + dimensiones globales.
 *  - El `id` aporta tinte fino sobre la tapa y matiz cream sobre
 *    páginas → dos sagas iguales no son idénticas.
 *
 * Interacción: click → callback con id; hover → scale-up + salida
 * leve hacia adelante.
 */
export function Book({
  id,
  modelName,
  position,
  rotation,
  scale,
  sagaTitle,
  bookCount,
  onClick,
  appearAt,
  selected,
  centered,
  open,
}: BookProps) {
  const model = useMemo(
    () => BOOK_MODELS.find((m) => m.name === modelName) ?? BOOK_MODELS[0]!,
    [modelName],
  );
  const coverColor = useMemo(() => bookColor(id, model.baseColor), [id, model.baseColor]);
  const pageColor = useMemo(() => pageEdgeColor(id), [id]);
  const textColor = useMemo(() => labelColor(model.baseColor), [model.baseColor]);
  const saga = useMemo(() => pickSaga(id), [id]);
  const title = sagaTitle ?? saga.title;
  const count = bookCount ?? saga.bookCount;

  const dx = model.dims.x * scale;
  const dy = model.dims.y * scale;
  const dz = model.dims.z * scale;

  // Geometría del cover wrap.
  const coverT = Math.min(dx * 0.1, 0.005); // 4–5 mm grosor de tapa
  const pageInsetY = 0.003 * scale; // tapa protruye 3mm en Y (top y bottom)
  const pageInsetZ = 0.003 * scale; // pages recogen 3mm en fore-edge
  const cornerRadius = Math.min(coverT * 0.8, 0.0028);
  const pageCornerRadius = Math.min(coverT * 0.3, 0.0012);

  // Page block dims (bloque de papel).
  const pageDx = Math.max(dx - 2 * coverT, 0.001);
  const pageDy = Math.max(dy - 2 * pageInsetY, 0.001);
  const pageDz = Math.max(dz - coverT - pageInsetZ, 0.001);
  // Page block centro: flush con la cara interna del spine plate, y
  // recogido en -Z respecto al -Z de la tapa.
  const pageZCenter = (pageInsetZ - coverT) / 2;

  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const rightCoverRef = useRef<THREE.Group>(null);
  const leftCoverRef = useRef<THREE.Group>(null);
  /** Refs de las hojas (un array por lado). Callback-ref pattern. */
  const rightLeafRefs = useRef<(THREE.Group | null)[]>([]);
  const leftLeafRefs = useRef<(THREE.Group | null)[]>([]);
  /** Damping continuo de la selección. 0 = idle, 1 = totalmente abierto/centrado. */
  const selectionLerpRef = useRef(0);
  /** Spring physics para la apertura/cierre (pos + velocity). */
  const openSpringRef = useRef({ pos: 0, vel: 0 });
  // Reloj local de la animación de aparición. Se inicializa la primera
  // vez que useFrame corre — así el suspense de las texturas (que retrasa
  // el primer render) no consume tiempo de animación. Si `appearAt` no
  // está, queda null y el libro aparece directo en su slot.
  // Sirve también de gate temporal: si el componente se re-monta más
  // tarde con el mismo `appearAt` antiguo (>2× duración), no re-anima.
  const animStartRef = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Damp selection state always — así el libro reacciona a clicks
    // incluso durante la animación de aparición.
    selectionLerpRef.current = THREE.MathUtils.damp(
      selectionLerpRef.current,
      selected ? 1 : 0,
      SELECTION_DAMP,
      delta,
    );
    const sLerp = selectionLerpRef.current;

    // Apertura de tapas por selección: stagger — sólo después de que
    // el libro ya esté ~ a mitad de camino del acercamiento + rotación.
    // [0, COVER_OPEN_THRESHOLD] de sLerp → tapas cerradas.
    // (THRESHOLD, 1] → abren progresivamente hasta OPEN_ANGLE_MAX.
    const selectedCoverLerp = THREE.MathUtils.clamp(
      (sLerp - COVER_OPEN_THRESHOLD) / (1 - COVER_OPEN_THRESHOLD),
      0,
      1,
    );

    // Apertura por prop `open`: spring underdamped → micro-overshoot al
    // llegar al objetivo. Más vivo que un lerp puro.
    const target = open ? 1 : 0;
    const spring = openSpringRef.current;
    const force = OPEN_SPRING_STIFFNESS * (target - spring.pos) - OPEN_SPRING_DAMPING * spring.vel;
    spring.vel += force * delta;
    spring.pos += spring.vel * delta;

    // Ángulo final = el mayor de los dos caminos. Permite que un libro
    // que pasa de `open` a `selected` se siga abriendo (no chasquea).
    const coverAngle = Math.max(selectedCoverLerp * OPEN_ANGLE_MAX, spring.pos * OPEN_ANGLE_SOFT);
    if (rightCoverRef.current) rightCoverRef.current.rotation.y = -coverAngle;
    if (leftCoverRef.current) leftCoverRef.current.rotation.y = coverAngle;
    // Cada hoja abre a una fracción del cover angle → abanico.
    for (let i = 0; i < LEAVES_PER_SIDE; i++) {
      const angle = coverAngle * LEAF_RATIOS[i]!;
      const r = rightLeafRefs.current[i];
      const l = leftLeafRefs.current[i];
      if (r) r.rotation.y = -angle;
      if (l) l.rotation.y = angle;
    }

    // Calcular pose base (ya sea aparición o idle en slot).
    // Arrancamos el reloj al primer frame en que el Book es visible
    // (post-suspense de texturas). Sólo si `appearAt` viene reciente:
    // datos antiguos no deben re-disparar la animación al re-montar.
    // En modo centered no usamos animación de aparición: el libro
    // surge directamente en la pose de reposo.
    if (animStartRef.current == null && appearAt != null && !centered) {
      const dataAge = (Date.now() - appearAt) / 1000;
      if (dataAge < APPEAR_DURATION * 4) {
        animStartRef.current = Date.now();
      }
    }
    const elapsed =
      animStartRef.current != null ? (Date.now() - animStartRef.current) / 1000 : Infinity;
    const appearing = animStartRef.current != null && elapsed < APPEAR_DURATION;

    // Pose de reposo. En modo centered nos quedamos en la pose de
    // presentación (centro de pantalla, escala 1.7) con el lomo
    // (+Z local) girado 180° → mirando a la estantería (-Z mundo).
    const restPosX = centered ? PRESENTATION_POS[0] : position[0];
    const restPosY = centered ? PRESENTATION_POS[1] : position[1];
    const restPosZ = centered ? PRESENTATION_POS[2] : position[2];
    const restYaw = centered ? Math.PI : rotation[1];
    const restScale = centered ? PRESENTATION_SCALE : 1;

    let basePosX: number;
    let basePosY: number;
    let basePosZ: number;
    let baseYaw: number;
    let baseScale: number;

    if (appearing) {
      if (elapsed < PHASE_ZOOM_END) {
        const localT = easeOutCubic(elapsed / PHASE_ZOOM_END);
        basePosX = lerp(VERY_CLOSE_POS[0], PRESENTATION_POS[0], localT);
        basePosY = lerp(VERY_CLOSE_POS[1], PRESENTATION_POS[1], localT);
        basePosZ = lerp(VERY_CLOSE_POS[2], PRESENTATION_POS[2], localT);
        baseYaw = VERY_CLOSE_YAW;
        baseScale = lerp(VERY_CLOSE_SCALE, PRESENTATION_SCALE, localT);
      } else if (elapsed < PHASE_ROTATE_END) {
        const localT = easeInOutCubic(
          (elapsed - PHASE_ZOOM_END) / (PHASE_ROTATE_END - PHASE_ZOOM_END),
        );
        basePosX = PRESENTATION_POS[0];
        basePosY = PRESENTATION_POS[1];
        basePosZ = PRESENTATION_POS[2];
        baseYaw = lerp(VERY_CLOSE_YAW, 0, localT);
        baseScale = PRESENTATION_SCALE;
      } else {
        // Fase slide: lerp de presentación → pose de reposo. Para
        // centered esto es una identidad (presentación = reposo).
        const localT = easeInOutCubic(
          (elapsed - PHASE_ROTATE_END) / (PHASE_SLIDE_END - PHASE_ROTATE_END),
        );
        basePosX = lerp(PRESENTATION_POS[0], restPosX, localT);
        basePosY = lerp(PRESENTATION_POS[1], restPosY, localT);
        basePosZ = lerp(PRESENTATION_POS[2], restPosZ, localT);
        baseYaw = 0;
        baseScale = lerp(PRESENTATION_SCALE, restScale, localT);
      }
    } else {
      basePosX = restPosX;
      basePosY = restPosY;
      basePosZ = restPosZ;
      baseYaw = restYaw;
      baseScale = restScale;
    }

    // Solo aplicamos hover cuando el libro está idle (no en aparición
    // ni en transición de selección).
    const stableIdle = !appearing && sLerp < 0.05;
    const hoverZ = stableIdle && hovered ? 0.015 : 0;
    const hoverScale = stableIdle && hovered ? 1.04 : 1;

    // Blend entre pose base y pose seleccionada.
    const finalX = lerp(basePosX, SELECTED_POS[0], sLerp);
    const finalY = lerp(basePosY, SELECTED_POS[1], sLerp);
    const finalZ = lerp(basePosZ, SELECTED_POS[2], sLerp) + hoverZ;
    const finalScale = lerp(baseScale, SELECTED_SCALE, sLerp) * hoverScale;
    const finalYaw = lerp(baseYaw, SELECTED_YAW, sLerp);

    groupRef.current.position.set(finalX, finalY, finalZ);
    groupRef.current.rotation.set(rotation[0], finalYaw, rotation[2]);
    groupRef.current.scale.setScalar(finalScale);
  });

  const titleFont = Math.min(dx * 0.34, dy * 0.062);
  const countFont = Math.max(titleFont * 0.55, 0.005);

  function handlePointerEnter(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }
  function handlePointerLeave(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = '';
  }
  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onClick?.(id);
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={new THREE.Euler(...rotation, 'XYZ')}
      onPointerOver={handlePointerEnter}
      onPointerOut={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Spine: la tapa visible al usuario (+Z). */}
      <RoundedBox
        args={[dx, dy, coverT]}
        radius={cornerRadius}
        smoothness={6}
        position={[0, dy / 2, dz / 2 - coverT / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={coverColor}
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={1.3}
        />
      </RoundedBox>

      {/* Tapa derecha (+X). El group exterior tiene su origen en la
          unión spine↔cover; rotation.y se controla en useFrame para
          abrir/cerrar el libro. */}
      <group ref={rightCoverRef} position={[dx / 2 - coverT, 0, dz / 2 - coverT]}>
        <RoundedBox
          args={[coverT, dy, dz - coverT]}
          radius={cornerRadius}
          smoothness={6}
          position={[coverT / 2, dy / 2, -(dz - coverT) / 2]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={coverColor}
            roughness={0.6}
            metalness={0.05}
            envMapIntensity={1.3}
          />
        </RoundedBox>
      </group>

      {/* Tapa izquierda (-X). Mismo patrón, hinge en el lado opuesto. */}
      <group ref={leftCoverRef} position={[-dx / 2 + coverT, 0, dz / 2 - coverT]}>
        <RoundedBox
          args={[coverT, dy, dz - coverT]}
          radius={cornerRadius}
          smoothness={6}
          position={[-coverT / 2, dy / 2, -(dz - coverT) / 2]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={coverColor}
            roughness={0.6}
            metalness={0.05}
            envMapIntensity={1.3}
          />
        </RoundedBox>
      </group>

      {/* Páginas: N hojas finas por lado, todas pivotan en el lomo
          (x=0, plano del spine) y cada una abre a un ángulo distinto
          → efecto de abanico cuando el libro se abre. Cada hoja
          arranca a una posición X ligeramente desplazada de modo que
          el libro cerrado muestra un stack visible desde el canto. */}
      {Array.from({ length: LEAVES_PER_SIDE }).map((_, i) => {
        const fraction = (i + 0.5) / LEAVES_PER_SIDE;
        const xOffset = fraction * (pageDx * 0.5);
        const leafThickness = (pageDx * 0.5) / LEAVES_PER_SIDE;
        const sizeShrink = 1 - i * 0.02;
        const w = leafThickness * 0.92;
        const h = pageDy * sizeShrink;
        const d = pageDz * sizeShrink;
        // Variación de color sutil por hoja (algunas más cálidas).
        const leafColor = leafTint(pageColor, i);
        return (
          <group
            key={`right-leaf-${i}`}
            ref={(el) => {
              rightLeafRefs.current[i] = el;
            }}
            position={[0, 0, dz / 2 - coverT]}
          >
            <RoundedBox
              args={[w, h, d]}
              radius={pageCornerRadius}
              smoothness={3}
              position={[xOffset, dy / 2, pageZCenter - (dz / 2 - coverT)]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={leafColor} roughness={0.92} metalness={0} />
            </RoundedBox>
          </group>
        );
      })}
      {Array.from({ length: LEAVES_PER_SIDE }).map((_, i) => {
        const fraction = (i + 0.5) / LEAVES_PER_SIDE;
        const xOffset = -fraction * (pageDx * 0.5);
        const leafThickness = (pageDx * 0.5) / LEAVES_PER_SIDE;
        const sizeShrink = 1 - i * 0.02;
        const w = leafThickness * 0.92;
        const h = pageDy * sizeShrink;
        const d = pageDz * sizeShrink;
        const leafColor = leafTint(pageColor, i + LEAVES_PER_SIDE);
        return (
          <group
            key={`left-leaf-${i}`}
            ref={(el) => {
              leftLeafRefs.current[i] = el;
            }}
            position={[0, 0, dz / 2 - coverT]}
          >
            <RoundedBox
              args={[w, h, d]}
              radius={pageCornerRadius}
              smoothness={3}
              position={[xOffset, dy / 2, pageZCenter - (dz / 2 - coverT)]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={leafColor} roughness={0.92} metalness={0} />
            </RoundedBox>
          </group>
        );
      })}

      {/* Título de la saga, rotado para leerse de abajo a arriba.
          Pintamos justo delante de la cara externa del spine plate. */}
      <Text
        position={[0, dy / 2, dz / 2 + 0.0008]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={titleFont}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={dy * 0.78}
        textAlign="center"
        outlineWidth={titleFont * 0.04}
        outlineColor={textColor}
      >
        {title}
      </Text>

      {/* Badge del nº de libros en la saga, abajo del lomo. */}
      {count > 1 && (
        <Text
          position={[0, dy * 0.08, dz / 2 + 0.0008]}
          rotation={[0, 0, 0]}
          fontSize={countFont}
          color={textColor}
          anchorX="center"
          anchorY="middle"
        >
          {count.toString()}
        </Text>
      )}
    </group>
  );
}

function bookColor(id: string, baseColor: string): THREE.Color {
  const r = 0.92 + hashToFloat(id + ':tintR') * 0.08;
  const g = 0.92 + hashToFloat(id + ':tintG') * 0.08;
  const b = 0.92 + hashToFloat(id + ':tintB') * 0.08;
  return new THREE.Color(baseColor).multiply(new THREE.Color(r, g, b));
}

function pageEdgeColor(id: string): THREE.Color {
  const seed = hashToFloat(id + ':page');
  const r = 0.96 + seed * 0.02;
  const g = 0.93 + seed * 0.03;
  const b = 0.84 + seed * 0.07;
  return new THREE.Color(r, g, b);
}

/**
 * Variación sutil del color base de la hoja para que el stack no sea
 * un bloque uniforme. Multiplicamos por un factor en torno a 1 que
 * oscila por índice (cosine wave) → patrón orgánico, no aleatorio.
 */
function leafTint(base: THREE.Color, index: number): THREE.Color {
  const wave = Math.cos(index * 1.3) * 0.5 + 0.5; // 0..1
  const factor = 0.94 + wave * 0.08; // 0.94..1.02
  return base.clone().multiplyScalar(factor);
}

function labelColor(baseColor: string): string {
  const c = new THREE.Color(baseColor);
  const luminance = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return luminance < 0.55 ? '#F2EBD8' : '#2A2A2A';
}
